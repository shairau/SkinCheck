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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at reading product labels from skincare and makeup product images.

Your task is to extract product names from the image. Look for:
1. Brand names and product names on bottles, tubes, or packaging
2. Any text that identifies skincare or makeup products

Return ONLY a JSON object with this structure:
{
  "products": ["Full Product Name 1", "Full Product Name 2", ...],
  "confidence": "high|medium|low"
}

Examples of good product names:
- "Anua Heartleaf 77% Soothing Toner"
- "Aquaphor Healing Ointment Advanced Therapy"
- "CeraVe Hydrating Facial Cleanser"

Be as accurate as possible. If you can see product names, include them. Set confidence to "low" if text is blurry or unclear.`
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
