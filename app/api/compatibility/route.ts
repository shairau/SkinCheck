import { NextRequest, NextResponse } from 'next/server';

type Compat = {
  routine_rating?: {
    barrier_safety: number;
    irritation_risk: number;
    efficacy: number;
    compatibility: number;
    long_term_safety?: number;
  };
  score_rationale?: string;
  routine_plan?: { am?: string[]; pm?: string[]; frequencies?: Record<string,string> };
  products?: Array<{
    query: string; matched_product: string; role: string;
    key_benefits: string[]; cautions: string[];
    ingredients_inci: { names: string[] } | "unknown";
    citations: string[];
    skin_impact?: string;
  }>;
  analysis?: { 
    global_observations?: string[]; 
    suggestions?: string[]; 
    pairs?: any[];
    makeup_skincare_synergy?: string[];
  };
};

function normalize(out: any, originalProducts: string[]): Compat {
  // Basic shape validation
  if (typeof out !== "object" || out === null) throw new Error("Bad JSON");
  
  // Ensure all required fields exist with defaults
  const res: Compat = {
    routine_rating: out.routine_rating ? {
      barrier_safety: Math.max(0, Math.min(5, Math.round(out.routine_rating.barrier_safety || 3))),
      irritation_risk: Math.max(0, Math.min(5, Math.round(out.routine_rating.irritation_risk || 2))),
      efficacy: Math.max(0, Math.min(5, Math.round(out.routine_rating.efficacy || 3))),
      compatibility: Math.max(0, Math.min(5, Math.round(out.routine_rating.compatibility || 3))),
      long_term_safety: out.routine_rating.long_term_safety ? Math.max(0, Math.min(5, Math.round(out.routine_rating.long_term_safety))) : undefined
    } : {
      barrier_safety: 3,
      irritation_risk: 2,
      efficacy: 3,
      compatibility: 3,
      long_term_safety: 3
    },
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
      citations: Array.isArray(p.citations) ? p.citations : [],
      skin_impact: p.skin_impact || "General product effects on skin"
    })) : originalProducts.map(p => ({
      query: p,
      matched_product: p,
      role: "Skincare product",
      key_benefits: ["General skincare benefits"],
      cautions: [],
      ingredients_inci: "unknown",
      citations: [],
      skin_impact: "General product effects on skin"
    })),
    analysis: {
      pairs: Array.isArray(out.analysis?.pairs) ? out.analysis.pairs : [],
      global_observations: Array.isArray(out.analysis?.global_observations) ? out.analysis.global_observations : ["Routine analysis completed."],
      suggestions: Array.isArray(out.analysis?.suggestions) ? out.analysis.suggestions : [],
      makeup_skincare_synergy: Array.isArray(out.analysis?.makeup_skincare_synergy) ? out.analysis.makeup_skincare_synergy : []
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

  // Ensure ALL compatibility pairs exist - generate missing ones
  const expectedPairs = (res.products?.length || 0) * ((res.products?.length || 0) - 1) / 2;
  const existingPairs = res.analysis?.pairs?.length || 0;
  
  if (expectedPairs > 0) {
    // Create a set of existing pairs for quick lookup (normalize to lowercase)
    const existingPairSet = new Set();
    (res.analysis?.pairs || []).forEach(pair => {
      const normalizedPair = pair.between.map((p: string) => p.toLowerCase().trim()).sort().join("|");
      existingPairSet.add(normalizedPair);
    });
    
    // Generate missing pairs
    for (let i = 0; i < (res.products?.length || 0); i++) {
      for (let j = i + 1; j < (res.products?.length || 0); j++) {
        const product1 = res.products?.[i]?.matched_product || res.products?.[i]?.query || "";
        const product2 = res.products?.[j]?.matched_product || res.products?.[j]?.query || "";
        const normalizedPair = [product1.toLowerCase().trim(), product2.toLowerCase().trim()].sort().join("|");
        
        if (!existingPairSet.has(normalizedPair)) {
          // Determine if this is a makeup-skincare interaction
          const isMakeupSkincare = (
            (product1.toLowerCase().includes('concealer') || 
             product1.toLowerCase().includes('blush') || 
             product1.toLowerCase().includes('mascara') ||
             product1.toLowerCase().includes('foundation') ||
             product1.toLowerCase().includes('lip')) &&
            (product2.toLowerCase().includes('sunscreen') || 
             product2.toLowerCase().includes('toner') || 
             product2.toLowerCase().includes('cleanser') ||
             product2.toLowerCase().includes('cream') ||
             product2.toLowerCase().includes('serum'))
          ) || (
            (product2.toLowerCase().includes('concealer') || 
             product2.toLowerCase().includes('blush') || 
             product2.toLowerCase().includes('mascara') ||
             product2.toLowerCase().includes('foundation') ||
             product2.toLowerCase().includes('lip')) &&
            (product1.toLowerCase().includes('sunscreen') || 
             product1.toLowerCase().includes('toner') || 
             product1.toLowerCase().includes('cleanser') ||
             product1.toLowerCase().includes('cream') ||
             product1.toLowerCase().includes('serum'))
          );
          
          res.analysis?.pairs?.push({
            between: [product1, product2],
            flags: [{
              type: isMakeupSkincare ? "makeup_skincare_interaction" : "ok_together",
              severity: "low",
              why: isMakeupSkincare 
                ? "Makeup and skincare products can work well together when applied in the correct order."
                : "Products appear compatible based on general formulation principles.",
              sources: ["General skincare compatibility guidelines"]
            }],
            suggestions: isMakeupSkincare 
              ? ["Apply skincare first, allow to absorb, then apply makeup."]
              : ["Monitor for any irritation when using together."]
          });
        }
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
            "You are a cosmetic chemist + skincare educator with expertise in both skincare and makeup formulations. CRITICAL: You MUST output a complete, consistent JSON response every time. \
            MANDATORY REQUIREMENTS: \
            - NEVER use emojis in any response text \
            - ALWAYS use proper capitalization for product names and ingredients \
            - If a product name seems incorrect or incomplete, research and provide the correct full product name \
            - Use web search to verify product names and ingredient lists when needed \
            1) ALWAYS include ALL fields in this EXACT schema: \
            { \
              \"routine_rating\": { \
                \"barrier_safety\": number (0-5 scale), \
                \"irritation_risk\": number (0-5 scale, lower is better), \
                \"efficacy\": number (0-5 scale), \
                \"compatibility\": number (0-5 scale), \
                \"long_term_safety\": number (0-5 scale, optional) \
              }, \
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
                  \"role\": string (specify if skincare or makeup), \
                  \"key_benefits\": string[] (MUST have at least 1 benefit), \
                  \"cautions\": string[] (can be empty array), \
                  \"ingredients_inci\": { \"names\": string[] } | \"unknown\", \
                  \"citations\": string[] (MUST have at least 1 citation), \
                  \"skin_impact\": string (how this product affects skin health) \
                } \
              ], \
              \"analysis\": { \
                \"pairs\": [ \
                  { \
                    \"between\": [string, string], \
                    \"flags\": [ \
                      { \
                        \"type\": \"ok_together\" | \"irritation_stack\" | \"redundancy\" | \"caution\" | \"makeup_skincare_interaction\" | \"pilling_risk\" | \"oxidization_risk\", \
                        \"severity\": \"low\" | \"medium\" | \"high\", \
                        \"why\": string, \
                        \"sources\": string[] \
                      } \
                    ], \
                    \"suggestions\": string[] \
                  } \
                ], \
                \"global_observations\": string[] (MUST have at least 2 observations), \
                \"suggestions\": string[] (MUST have at least 1 suggestion), \
                \"makeup_skincare_synergy\": string[] (how makeup and skincare work together) \
              } \
            } \
            CONSISTENCY RULES: \
            - CRITICAL: You MUST analyze compatibility between EVERY SINGLE product pair. If there are N products, you must include exactly N*(N-1)/2 pairs in the analysis.pairs array \
            - ALWAYS use the EXACT \"matched_product\" names from the products array when creating pairs - do NOT use the original query names \
            - ALWAYS include routine_plan.am and pm arrays (never empty) \
            - ALWAYS include global_observations (minimum 2 items) \
            - ALWAYS include suggestions (minimum 1 item) \
            - If unsure about ingredients, use \"unknown\" but still provide analysis \
            - For makeup products, analyze how they interact with skincare underneath \
            - Consider pilling, oxidization, and wear-time interactions \
            - EXAMPLE: For 3 products [A, B, C], you must include pairs: A+B, A+C, B+C \
            - EXAMPLE: For 4 products [A, B, C, D], you must include pairs: A+B, A+C, A+D, B+C, B+D, C+D \
            - IMPORTANT: Use the matched_product names consistently in all pairs to avoid duplicates \
            PRODUCT NAME CORRECTION: \
            - If user input has typos or incomplete names, research and provide the correct full product name \
            - Use proper brand capitalization (e.g., 'The Ordinary' not 'the ordinary') \
            - Include full product names (e.g., 'CeraVe Hydrating Facial Cleanser' not just 'cerave cleanser') \
            - Verify product names through web search when uncertain \
            frequencies examples: \
            { \"retinal\": \"start 2–3 nights/week for 2–3 weeks, then 3–4 nights/week if tolerated\", \
              \"salicylic acid\": \"1–3x/week\", \
              \"sunscreen\": \"every AM\", \
              \"foundation\": \"daily as needed\", \
              \"retinol cream\": \"2–3 nights/week\" } \
            MULTI-FACTOR RATING (0-5 scale per category): \
            - Barrier Safety: 5=excellent barrier support, 0=barrier damaging \
            - Irritation Risk: 5=high risk, 0=very gentle \
            - Efficacy: 5=highly effective for goals, 0=minimal benefit \
            - Compatibility: 5=perfect layering, 0=conflicting ingredients \
            - Long-term Safety: 5=sustainable for years, 0=unsafe long-term \
            MAKEUP-SPECIFIC ANALYSIS: \
            - Analyze how makeup ingredients affect skin health over time \
            - Consider comedogenic potential of makeup ingredients \
            - Evaluate how makeup interacts with skincare actives \
            - Look for potential pilling between skincare and makeup layers \
            - Check for ingredients that may oxidize or break down together \
            - Assess whether makeup provides additional skincare benefits (SPF, antioxidants, etc.) \
            - Consider removal requirements and their impact on skin barrier"
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