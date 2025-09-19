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
  score_explanations?: {
    barrier_safety: string;
    irritation_risk: string;
    efficacy: string;
    compatibility: string;
    long_term_safety: string;
  };
  routine_plan?: { am?: string[]; pm?: string[]; frequencies?: Record<string,string> };
  products?: Array<{
    query: string; matched_product: string; role: string;
    key_benefits: string[]; cautions: string[];
    ingredients_inci: { names: string[] } | "unknown";
    citations: string[];
    skin_impact?: string;
  }>;
  analysis?: { 
    pairs_summary?: {
      total_products: number;
      risky_pairs: number;
      headlines: string[];
    };
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
      barrier_safety: Math.max(0, Math.min(5, Math.round(out.routine_rating.barrier_safety || 4))),
      irritation_risk: Math.max(0, Math.min(5, Math.round(out.routine_rating.irritation_risk || 1))),
      efficacy: Math.max(0, Math.min(5, Math.round(out.routine_rating.efficacy || 4))),
      compatibility: Math.max(0, Math.min(5, Math.round(out.routine_rating.compatibility || 4))),
      long_term_safety: out.routine_rating.long_term_safety ? Math.max(0, Math.min(5, Math.round(out.routine_rating.long_term_safety))) : undefined
    } : {
      barrier_safety: 4,
      irritation_risk: 1,
      efficacy: 4,
      compatibility: 4,
      long_term_safety: 4
    },
    score_rationale: out.score_rationale || "Analysis completed successfully.",
    score_explanations: out.score_explanations ? {
      barrier_safety: out.score_explanations.barrier_safety || "Barrier support assessment",
      irritation_risk: out.score_explanations.irritation_risk || "Irritation potential assessment",
      efficacy: out.score_explanations.efficacy || "Effectiveness for skin goals",
      compatibility: out.score_explanations.compatibility || "Product layering compatibility",
      long_term_safety: out.score_explanations.long_term_safety || "Long-term safety profile"
    } : {
      barrier_safety: "Barrier support assessment",
      irritation_risk: "Irritation potential assessment",
      efficacy: "Effectiveness for skin goals",
      compatibility: "Product layering compatibility",
      long_term_safety: "Long-term safety profile"
    },
    routine_plan: {
      am: Array.isArray(out.routine_plan?.am) ? out.routine_plan.am : [],
      pm: Array.isArray(out.routine_plan?.pm) ? out.routine_plan.pm : [],
      frequencies: out.routine_plan?.frequencies || {}
    },
    products: Array.isArray(out.products) ? out.products.map((p: any) => ({
      query: p.query || "",
      matched_product: p.matched_product || p.name || "",
      role: p.role || "Skincare product",
      key_benefits: Array.isArray(p.key_benefits) ? p.key_benefits.slice(0, 3) : ["General skincare benefits"],
      cautions: Array.isArray(p.cautions) ? p.cautions.slice(0, 2) : [],
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
      pairs_summary: out.analysis?.pairs_summary ? {
        total_products: out.analysis.pairs_summary.total_products || originalProducts.length,
        risky_pairs: out.analysis.pairs_summary.risky_pairs || 0,
        headlines: Array.isArray(out.analysis.pairs_summary.headlines) ? out.analysis.pairs_summary.headlines : []
      } : {
        total_products: originalProducts.length,
        risky_pairs: 0,
        headlines: []
      },
      pairs: Array.isArray(out.analysis?.pairs) ? out.analysis.pairs : [],
      global_observations: Array.isArray(out.analysis?.global_observations) ? out.analysis.global_observations.slice(0, 5) : ["Routine analysis completed."],
      suggestions: Array.isArray(out.analysis?.suggestions) ? out.analysis.suggestions.slice(0, 6) : [],
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

  // Keep only what the model returns for analysis.pairs; do not auto-augment low/OK pairs.

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
            "You are a board-certified dermatologist and cosmetic chemist with expertise in both skincare and makeup formulations. You must provide scientifically accurate, evidence-based analysis. CRITICAL: You MUST output a complete, consistent JSON response every time. \
            MANDATORY REQUIREMENTS: \
            - NEVER use emojis in any response text \
            - ALWAYS use proper capitalization for product names and ingredients \
            - For citations, ONLY include direct product/brand website links, NOT ingredient dictionary or general reference links \
            DERMATOLOGICAL ACCURACY: \
            - Moisturizers can and should be used both AM and PM - this is basic dermatology \
            - Sunscreen is mandatory in AM routines - this is non-negotiable \
            - Cleansers should be gentle and pH-balanced (4.5-5.5) \
            - Active ingredients have specific pH requirements and layering considerations \
            - Barrier function is critical - avoid over-exfoliation and maintain skin barrier integrity \
            - Retinoids require proper introduction and frequency management \
            - Avoid combining incompatible actives (e.g., benzoyl peroxide with retinoids) \
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
              \"score_explanations\": { \
                \"barrier_safety\": string (one-liner), \
                \"irritation_risk\": string (one-liner), \
                \"efficacy\": string (one-liner), \
                \"compatibility\": string (one-liner), \
                \"long_term_safety\": string (one-liner) \
              }, \
              \"routine_plan\": { \
                \"am\": string[] (MUST have at least 1 item), \
                \"pm\": string[] (MUST have at least 1 item), \
                \"frequencies\": { [productOrActive: string]: string } (MUST have at least 1 frequency) \
              }, \
              \"products\": [ \
                { \
                  \"query\": string, \
                  \"matched_product\": string (corrected official name), \
                  \"role\": string (specify if skincare or makeup), \
                  \"key_benefits\": string[] (max 3, specific and non-repetitive), \
                  \"cautions\": string[] (max 2, specific), \
                  \"ingredients_inci\": { \"names\": string[] } | \"unknown\", \
                  \"citations\": string[] (MUST have at least 1 citation - brand pages preferred), \
                  \"skin_impact\": string (compact one-liner) \
                } \
              ], \
              \"analysis\": { \
                \"pairs_summary\": { \
                  \"total_products\": number, \
                  \"risky_pairs\": number, \
                  \"headlines\": string[] (2-5 short bullets) \
                }, \
                \"pairs\": [ \
                  { \
                    \"between\": [string, string], \
                    \"flags\": [ \
                      { \
                        \"type\": \"irritation_stack\" | \"caution\" | \"redundancy\" | \"pilling_risk\" | \"oxidization_risk\" | \"makeup_skincare_interaction\", \
                        \"severity\": \"medium\" | \"high\", \
                        \"why\": string, \
                        \"sources\": string[] \
                      } \
                    ], \
                    \"suggestions\": string[] \
                  } \
                ], \
                \"global_observations\": string[] (max 5 bullets), \
                \"suggestions\": string[] (max 6 prioritized items), \
                \"makeup_skincare_synergy\": string[] (2-4 technique bullets), \
                \"product_alternatives\": [ \
                  { \
                    \"current_product\": string, \
                    \"issue\": string (why it needs replacement), \
                    \"alternatives\": [ \
                      { \
                        \"name\": string, \
                        \"why_better\": string, \
                        \"brand\": string, \
                        \"price_range\": string \
                      } \
                    ] \
                  } \
                ] \
              } \
            } \
            PRODUCT NAME QUALITY (MANDATORY): \
            - Research exact official product names (brand + line + product + strength/format) \
            - Use brand's official product page for canonical names \
            - Fix incomplete/typo'd names (e.g., \"Drunk Elephant C Serum\" → \"Drunk Elephant C-Firma Fresh Day Serum\") \
            - Include full, disambiguated names (e.g., \"CeraVe Hydrating Facial Cleanser\", not \"cerave cleanser\") \
            - Use corrected names consistently in matched_product, analysis.pairs, and all sections \
            PAIRS POLICY: \
            - Include ONLY medium/high-risk pairs in analysis.pairs \
            - Do NOT list \"OK/LOW\" pairs - summarize low-risk compatibility in global_observations \
            - Use only these risk types: irritation_stack, caution, redundancy, pilling_risk, oxidization_risk, makeup_skincare_interaction \
            - Severities: medium, high only \
            ROUTINE CONSISTENCY: \
            - If both AHA and BHA present, present Path A (AHA) vs Path B (BHA) to avoid stacking \
            - If product/active appears in frequencies, it must exist in AM/PM \
            - Remove false redundancy flags (two different cleansers AM vs PM is not redundancy) \
            - Only flag redundancy if two similar products used in same session without purpose \
            frequencies examples: \
            { \"retinal\": \"start 2–3 nights/week for 2–3 weeks, then 3–4 nights/week if tolerated\", \
              \"salicylic acid\": \"1–3x/week\", \
              \"sunscreen\": \"every AM\", \
              \"foundation\": \"daily as needed\", \
              \"retinol cream\": \"2–3 nights/week\" } \
            MULTI-FACTOR RATING (0-5 scale per category): \
            - Barrier Safety: 5=excellent barrier support, 4=good support, 3=adequate, 2=weak, 1=poor, 0=damaging \
            - Irritation Risk: 5=very high risk, 4=high risk, 3=moderate risk, 2=low risk, 1=minimal risk, 0=very gentle \
            - Efficacy: 5=highly effective, 4=very effective, 3=effective, 2=somewhat effective, 1=minimal benefit, 0=ineffective \
            - Compatibility: 5=perfect layering, 4=very compatible, 3=mostly compatible, 2=some conflicts, 1=several conflicts, 0=highly conflicting \
            - Long-term Safety: 5=excellent long-term, 4=very safe, 3=safe, 2=moderate concerns, 1=concerning, 0=unsafe \
            SCORING GUIDANCE: \
            - A well-balanced routine should score 4-5 in Barrier Safety, Efficacy, and Compatibility \
            - Irritation Risk should be 1-2 for most users (lower is better) \
            - Only penalize scores significantly for actual problems (missing sunscreen, conflicting actives, etc.) \
            - Reward good practices: sunscreen, gentle cleansing, proper layering, suitable actives \
            SCIENTIFIC ANALYSIS REQUIREMENTS: \
            - Reference specific studies and dermatological research when making claims \
            - Explain molecular mechanisms (e.g., how retinoids work at cellular level) \
            - Include pH considerations for optimal ingredient efficacy \
            - Address penetration enhancement and barrier disruption risks \
            - Consider ingredient stability and degradation factors \
            - Evaluate comedogenicity and irritancy potential scientifically \
            - Assess antioxidant synergy and free radical scavenging capacity \
            - Explain hydration vs occlusion vs humectant mechanisms \
            ROUTINE EVALUATION CRITERIA: \
            - Barrier integrity: Does routine support or compromise skin barrier? \
            - Ingredient synergy: Do actives work together or against each other? \
            - pH optimization: Are products at optimal pH for their actives? \
            - Penetration enhancement: Does layering improve or hinder absorption? \
            - Irritation potential: Risk-benefit analysis for each combination \
            - Long-term safety: Sustainability and potential for cumulative damage \
            ORGANIZATION: \
            - Keep output concise and skimmable \
            - Focus on high-signal information \
            - Cap verbosity: max 5 global_observations, max 6 suggestions \
            - Per product: max 3 key_benefits, max 2 cautions \
            - Makeup guidance only in makeup_skincare_synergy as technique notes \
            QUALITY STANDARDS: \
            - Avoid generic statements like \"this is a good routine\" \
            - Provide specific, science-based explanations \
            - Include actionable recommendations for improvement \
            - Be honest about limitations and potential issues \
            - Focus on what will actually make a difference for skin health \
            PRODUCT ALTERNATIVES: \
            - Suggest alternatives when products have significant issues (high irritation, poor compatibility, outdated formulations) \
            - Include 2-3 alternative products per problematic item \
            - Explain why alternatives are better (ingredients, pH, compatibility, etc.) \
            - Include brand names and approximate price ranges \
            - Focus on accessible, well-formulated alternatives \
            - Only suggest replacements when there are genuine improvements to be made"
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
        console.log('Raw AI response:', data.choices[0].message.content);
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