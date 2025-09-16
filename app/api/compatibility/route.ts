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

function normalize(out: any): Compat {
  // Basic shape
  if (typeof out !== "object" || out === null) throw new Error("Bad JSON");
  const res = out as Compat;

  // Clamp score
  if (typeof res.score !== "number" || Number.isNaN(res.score)) res.score = 0;
  res.score = Math.max(0, Math.min(100, Math.round(res.score)));

  // Frequencies guardrail for retinoids
  const freq = res.routine_plan?.frequencies ?? {};
  const lowerKeys = Object.keys(freq).reduce((acc,k)=>{ acc[k.toLowerCase()] = k; return acc; }, {} as Record<string,string>);
  const mentionsRetinoid = (s:string)=>/retin(al|ol)|retinoid/i.test(s);
  const needsRamp = Object.keys(lowerKeys).some(k=>mentionsRetinoid(k)) ||
    (res.products||[]).some(p=>mentionsRetinoid(p.role)||mentionsRetinoid(p.matched_product));

  if (needsRamp) {
    const key = Object.keys(lowerKeys).find(k=>mentionsRetinoid(k)) ?? "retinal";
    const originalKey = lowerKeys[key] ?? key;
    freq[originalKey] = "start 2–3 nights/week for 2–3 weeks, then 3–4 nights/week if tolerated";
    res.routine_plan = { ...(res.routine_plan||{}), frequencies: freq };
  }

  // Citation reminder if benefits/cautions exist but citations missing
  const missingCites = (res.products||[]).some(p => (p.key_benefits?.length || p.cautions?.length) && (!p.citations || p.citations.length === 0));
  if (missingCites) {
    res.analysis = res.analysis || {};
    res.analysis.suggestions = [...(res.analysis.suggestions||[]), "Some product claims lack citations; prefer brand pages or INCIDecoder when listing INCI or ingredient-based benefits."];
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
            "You are a cosmetic chemist + skincare educator. STRICT RULES: \
            1) Output ONLY JSON using this EXACT schema: \
            { \
              \"score\": number (0-100 ONLY, never 1-10), \
              \"score_rationale\": string (2-4 sentences), \
              \"routine_plan\": { \
                \"am\": string[], \
                \"pm\": string[], \
                \"frequencies\": { [productOrActive: string]: string } \
              }, \
              \"products\": [ \
                { \
                  \"query\": string, \
                  \"matched_product\": string, \
                  \"role\": string, \
                  \"key_benefits\": string[] (MUST be ingredient-based), \
                  \"cautions\": string[] (MUST be ingredient-based), \
                  \"ingredients_inci\": { \"names\": string[] } | \"unknown\", \
                  \"citations\": string[] (official brand sites or INCIDecoder) \
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
                \"global_observations\": string[], \
                \"suggestions\": string[] \
              } \
            } \
            frequencies examples: \
            { \"retinal\": \"start 2–3 nights/week for 2–3 weeks, then 3–4 nights/week if tolerated\", \
              \"salicylic acid\": \"1–3x/week\", \
              \"sunscreen\": \"every AM\" } \
            2) SCORING RULES (0-100 scale): \
            - Base score: 75 \
            - Penalties: -25 (high severity), -12 (medium), -6 (low) \
            - Bonuses: +5 (sunscreen), +5 (soothing/buffers) \
            3) INGREDIENT REQUIREMENTS: \
            - key_benefits and cautions MUST cite specific ingredients (retinol, niacinamide, etc.) \
            - NO generic claims like \"anti-aging\" without ingredient basis \
            - If you cannot retrieve a credible INCI list from brand or a reputable ingredient database (e.g., INCIDecoder), set ingredients_inci to \"unknown\". Do NOT invent INCI. \
            - If you recommend daily retinal/retinol, include a ramp schedule instead (start 2–3 nights/week). \
            - If official INCI not found, set ingredients_inci to \"unknown\" and still provide brand URL; optionally add an ingredient DB URL if available. \
            4) PAIR FLAGS: Each flag MUST include type, severity, why, and sources \
            5) Do not invent unverifiable claims. Use brand sites or INCIDecoder. If unknown, say 'unknown'."
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
          out = normalize(raw);
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