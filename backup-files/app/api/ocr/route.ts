import { NextRequest, NextResponse } from 'next/server';

// Enhanced error types for better error handling
interface APIError {
  code: string;
  message: string;
  details?: any;
}

// File validation function
function validateImageFile(file: File): APIError | null {
  // Check if file exists
  if (!file) {
    return {
      code: 'NO_FILE',
      message: 'No image file provided'
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      code: 'INVALID_TYPE',
      message: `Invalid file type. Supported formats: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`,
      details: { receivedType: file.type }
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File too large. Maximum size is 10MB`,
      details: { 
        receivedSize: file.size, 
        maxSize: maxSize,
        receivedSizeMB: Math.round(file.size / (1024 * 1024) * 100) / 100
      }
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      code: 'EMPTY_FILE',
      message: 'File is empty'
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    // Validate the uploaded file
    const validationError = validateImageFile(imageFile);
    if (validationError) {
      return NextResponse.json(
        { 
          error: validationError.message,
          code: validationError.code,
          details: validationError.details
        },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable. Please try again later.',
          code: 'API_KEY_MISSING'
        },
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
- "Beauty of Joseon Relief Sun: Rice + Probiotics"
- "Round Lab 1025 Dokdo Light Cream"

Be as accurate as possible. If you can see product names, include them. Set confidence to "low" if text is blurry or unclear.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract product names from this skincare/makeup product image.'
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
      console.error('OpenAI API error:', response.status, errorText);
      
      // Handle specific OpenAI API errors
      let errorMessage = 'Failed to process image. Please try again.';
      let errorCode = 'OPENAI_API_ERROR';
      
      if (response.status === 401) {
        errorMessage = 'Service authentication failed. Please try again later.';
        errorCode = 'AUTH_ERROR';
      } else if (response.status === 429) {
        errorMessage = 'Service is busy. Please wait a moment and try again.';
        errorCode = 'RATE_LIMIT';
      } else if (response.status === 413) {
        errorMessage = 'Image file is too large for processing.';
        errorCode = 'FILE_TOO_LARGE';
      } else if (response.status >= 500) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
        errorCode = 'SERVICE_UNAVAILABLE';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: errorCode,
          details: { status: response.status }
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('OpenAI OCR Response:', result);
    const content = result.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', result);
      return NextResponse.json(
        { 
          error: 'No content could be extracted from the image. Please try a clearer image.',
          code: 'NO_CONTENT_EXTRACTED'
        },
        { status: 400 }
      );
    }

    try {
      const extractedData = JSON.parse(content);
      
      // Validate the extracted data structure
      if (!extractedData.products || !Array.isArray(extractedData.products)) {
        console.error('Invalid data structure from OpenAI:', extractedData);
        return NextResponse.json(
          { 
            error: 'Invalid response format from image processing service.',
            code: 'INVALID_RESPONSE_FORMAT'
          },
          { status: 500 }
        );
      }
      
      // Return products array for the frontend to use
      return NextResponse.json({
        products: extractedData.products || [],
        confidence: extractedData.confidence || 'unknown',
        success: true
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError, 'Content:', content);
      return NextResponse.json(
        { 
          error: 'Failed to process the extracted data. Please try again.',
          code: 'PARSE_ERROR',
          details: { parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in OCR processing:', error);
    
    // Handle different types of errors
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        errorCode = 'NETWORK_ERROR';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        errorCode = 'TIMEOUT_ERROR';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        details: { 
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
