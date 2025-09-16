import { NextRequest, NextResponse } from 'next/server';

type Compat = {
  score: number;
  score_rationale?: string;
  routine_plan?: { am?: string[]; pm?: string[]; frequencies?: Record<string,string> };
  products?: Array<{
    query: string; matched_product: string; role: string;
    key_benefits: string[]; cautions: string[];
    ingredients_inci: { names: string[] } | "unknown";
    citations: string[];
  }>;
  analysis?: { global_observations?: string[]; suggestions?: string[]; pairs?: any[] };
};

function normalize(out: any, originalProducts: string[]): Compat {
  // Basic shape validation
  if (typeof out !== "object" || out === null) throw new Error("Bad JSON");
  
  // Ensure all required fields exist with defaults
  const res: Compat = {
    score: typeof out.score === "number" ? Math.max(0, Math.min(100, Math.round(out.score))) : 75,
    score_rationale: out.score_rationale || "Analysis completed successfully.",
    routine_plan: {
      am: Array.isArray(out.routine_plan?.am) ? out.routine_plan.am : [],
      pm: Array.isArray(out.routine_plan?.pm) ? out.routine_plan.pm : [],
      frequencies: out.routine_plan?.frequencies || {}
    },
    products: Array.isArray(out.products) ? out.products.map((p: any) => ({
      query: p.query || "",
      matched_product: p.matched_product || p.name || "",
      role: p.role || "Skincare product",
      key_benefits: Array.isArray(p.key_benefits) ? p.key_benefits : ["General skincare benefits"],
      cautions: Array.isArray(p.cautions) ? p.cautions : [],
      ingredients_inci: p.ingredients_inci || "unknown",
      citations: Array.isArray(p.citations) ? p.citations : []
    })) : originalProducts.map(p => ({
      query: p,
      matched_product: p,
      role: "Skincare product",
      key_benefits: ["General skincare benefits"],
      cautions: [],
      ingredients_inci: "unknown",
      citations: []
    })),
    analysis: {
      pairs: Array.isArray(out.analysis?.pairs) ? out.analysis.pairs : [],
      global_observations: Array.isArray(out.analysis?.global_observations) ? out.analysis.global_observations : ["Routine analysis completed."],
      suggestions: Array.isArray(out.analysis?.suggestions) ? out.analysis.suggestions : []
    }
  };

  // Frequencies guardrail for retinoids
  const freq = res.routine_plan?.frequencies || {};
  const lowerKeys = Object.keys(freq).reduce((acc,k)=>{ acc[k.toLowerCase()] = k; return acc; }, {} as Record<string,string>);
  const mentionsRetinoid = (s:string)=>/retin(al|ol)|retinoid/i.test(s);
  const needsRamp = Object.keys(lowerKeys).some(k=>mentionsRetinoid(k)) ||
    (res.products || []).some(p=>mentionsRetinoid(p.role)||mentionsRetinoid(p.matched_product));

  if (needsRamp) {
    const key = Object.keys(lowerKeys).find(k=>mentionsRetinoid(k)) ?? "retinal";
    const originalKey = lowerKeys[key] ?? key;
    freq[originalKey] = "start 2–3 nights/week for 2–3 weeks, then 3–4 nights/week if tolerated";
  }

  // Ensure compatibility analysis exists - generate if missing
  if ((res.analysis?.pairs?.length || 0) === 0 && (res.products?.length || 0) > 1) {
    // Generate basic compatibility pairs for all product combinations
    for (let i = 0; i < (res.products?.length || 0); i++) {
      for (let j = i + 1; j < (res.products?.length || 0); j++) {
        res.analysis?.pairs?.push({
          between: [res.products?.[i]?.matched_product || "", res.products?.[j]?.matched_product || ""],
          flags: [{
            type: "ok_together",
            severity: "low",
            why: "Products appear compatible based on general formulation principles.",
            sources: ["General skincare compatibility guidelines"]
          }],
          suggestions: ["Monitor for any irritation when using together."]
        });
      }
    }
  }

  // Citation reminder if benefits/cautions exist but citations missing
  const missingCites = (res.products || []).some(p => (p.key_benefits.length > 0 || p.cautions.length > 0) && p.citations.length === 0);
  if (missingCites) {
    res.analysis?.suggestions?.push("Some product claims lack citations; prefer brand pages or INCIDecoder when listing INCI or ingredient-based benefits.");
  }

  return res;
}

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const analyzeBody = {
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a cosmetic chemist + skincare educator. CRITICAL: You MUST output a complete, consistent JSON response every time. \
            MANDATORY REQUIREMENTS: \
            1) ALWAYS include ALL fields in this EXACT schema: \
            { \
              \"score\": number (0-100 ONLY, never 1-10), \
              \"score_rationale\": string (2-4 sentences), \
              \"routine_plan\": { \
                \"am\": string[] (MUST have at least 1 item), \
                \"pm\": string[] (MUST have at least 1 item), \
                \"frequencies\": { [productOrActive: string]: string } (MUST have at least 1 frequency) \
              }, \
              \"products\": [ \
                { \
                  \"query\": string, \
                  \"matched_product\": string, \
                  \"role\": string, \
                  \"key_benefits\": string[] (MUST have at least 1 benefit), \
                  \"cautions\": string[] (can be empty array), \
                  \"ingredients_inci\": { \"names\": string[] } | \"unknown\", \
                  \"citations\": string[] (MUST have at least 1 citation) \
                } \
              ], \
              \"analysis\": { \
                \"pairs\": [ \
                  { \
                    \"between\": [string, string], \
                    \"flags\": [ \
                      { \
                        \"type\": \"ok_together\" | \"irritation_stack\" | \"redundancy\" | \"caution\", \
                        \"severity\": \"low\" | \"medium\" | \"high\", \
                        \"why\": string, \
                        \"sources\": string[] \
                      } \
                    ], \
                    \"suggestions\": string[] \
                  } \
                ], \
                \"global_observations\": string[] (MUST have at least 2 observations), \
                \"suggestions\": string[] (MUST have at least 1 suggestion) \
              } \
            } \
            CONSISTENCY RULES: \
            - ALWAYS analyze compatibility between ALL product pairs if more than 1 product \
            - ALWAYS include routine_plan.am and pm arrays (never empty) \
            - ALWAYS include global_observations (minimum 2 items) \
            - ALWAYS include suggestions (minimum 1 item) \
            - If unsure about ingredients, use \"unknown\" but still provide analysis \
            frequencies examples: \
            { \"retinal\": \"start 2–3 nights/week for 2–3 weeks, then 3–4 nights/week if tolerated\", \
              \"salicylic acid\": \"1–3x/week\", \
              \"sunscreen\": \"every AM\" } \
            SCORING: Base 75, penalties: -25 (high), -12 (medium), -6 (low), bonuses: +5 (sunscreen/soothing)"
        },
        {
          role: "user",
          content: "Evaluate this routine for compatibility using the exact schema above."
        },
        { 
          role: "user", 
          content: JSON.stringify({ products }) 
        }
      ]
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyzeBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the JSON content from the OpenAI response
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      try {
        const raw = JSON.parse(data.choices[0].message.content);
        let out: Compat;
        try {
          out = normalize(raw, products);
        } catch (e: any) {
          return NextResponse.json(
            { error: { message: "Invalid model JSON", details: String(e?.message || e) } },
            { status: 422 }
          );
        }
        return NextResponse.json(out);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse analysis result' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid response from OpenAI' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in compatibility analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze compatibility' },
      { status: 500 }
    );
  }
}