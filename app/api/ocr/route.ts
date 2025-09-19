import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // Call OpenAI Vision API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert at reading product labels and ingredient lists from skincare and makeup product images. 

CRITICAL INSTRUCTIONS:
- Look carefully at ALL text visible in the image
- Read product names from the front of bottles, tubes, or packaging
- Look for brand names (usually at the top) and product names (usually larger text)
- Check for product type indicators (cleanser, moisturizer, serum, toner, etc.)
- Read ingredient lists when visible
- Be thorough - scan the entire image for any product information
- If text is partially obscured or blurry, try to reconstruct the full product name
- Look for alternative text placements (sides, back labels, etc.)
- Pay attention to different fonts, sizes, and text orientations

EXTRACTION PRIORITIES:
1. Brand names (e.g., "CeraVe", "The Ordinary", "Paula's Choice")
2. Full product names (e.g., "Hydrating Facial Cleanser", "Retinol 0.2% in Squalane")
3. Product types (cleanser, moisturizer, serum, toner, exfoliant, etc.)
4. Key active ingredients (retinol, vitamin C, hyaluronic acid, niacinamide, etc.)

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "products": ["Brand Name + Product Name", "Brand Name + Product Name", ...],
  "ingredients": ["ingredient1", "ingredient2", ...],
  "product_types": ["cleanser", "moisturizer", "serum", ...],
  "confidence": "high|medium|low"
}

EXAMPLES:
- "CeraVe Hydrating Facial Cleanser" (not just "CeraVe")
- "The Ordinary Niacinamide 10% + Zinc 1%" (not just "The Ordinary")
- "Paula's Choice 2% BHA Liquid Exfoliant" (not just "Paula's Choice")

If text is blurry, small, or unclear, still try to extract what you can see and set confidence to "low".
Only return empty products array if you cannot see ANY product-related text at all.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract product names and key ingredients from this skincare/makeup product image:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to process image with OpenAI' },
        { status: 500 }
      );
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No content extracted from image' },
        { status: 400 }
      );
    }

    try {
      const extractedData = JSON.parse(content);
      
      // Return products array for the frontend to use
      return NextResponse.json({
        products: extractedData.products || [],
        ingredients: extractedData.ingredients || [],
        product_types: extractedData.product_types || [],
        confidence: extractedData.confidence || 'unknown'
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse extracted data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in OCR processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
