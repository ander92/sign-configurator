import { Request, Response } from 'express';
import { fal } from '@fal-ai/client';

// Configure Fal AI client with API key
console.log('[Fal AI] Initializing... FAL_API_KEY is', process.env.FAL_API_KEY ? 'SET' : 'NOT SET');
if (process.env.FAL_API_KEY) {
  fal.config({ credentials: process.env.FAL_API_KEY });
  console.log('[Fal AI] Credentials configured successfully');
} else {
  console.warn('[Fal AI] WARNING: FAL_API_KEY not found in environment variables');
}

function parseBase64Image(dataUrl: string): { base64: string; mime: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return { base64: match[2], mime: match[1] };
}

async function urlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Error converting image URL to base64:', error);
    throw error;
  }
}

export async function generateImage(req: Request, res: Response): Promise<Response> {
  const { prompt, size = '1024x1024', imageBase64 } = req.body;

  console.log('[generateImage] Request received:', { prompt: prompt?.substring(0, 50), size, hasImage: !!imageBase64 });

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Promptul este obligatoriu și trebuie să fie un text.' });
  }

  // Fal AI supported sizes
  const allowedSizes = ['1024x1024', '1024x1536', '1536x1024'];
  const finalSize = allowedSizes.includes(size) ? size : '1024x1024';

  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt prea lung (maxim 2000 de caractere).' });
  }

  try {
    let input: any = {
      prompt: prompt,
      num_images: 1,
    };

    // Resize dimensions based on selected size
    const [width, height] = finalSize.split('x').map(Number);
    input.image_size = { width, height };

    if (imageBase64 && typeof imageBase64 === 'string') {
      const parsed = parseBase64Image(imageBase64);
      if (!parsed) {
        return res.status(400).json({ error: 'Date imagine invalide.' });
      }

      const buffer = Buffer.from(parsed.base64, 'base64');
      const maxBytes = 5 * 1024 * 1024;
      if (buffer.length > maxBytes) {
        return res.status(413).json({ error: 'Imaginea încărcată este prea mare (maxim 5 MB).' });
      }

      // Add image context to prompt
      const signPrompt = `${prompt}. Render ONLY the store sign / logo on a fully transparent background. Do not include any surrounding building or context.`;
      input.prompt = signPrompt;
    }

    // Call Fal AI Flux 2 Flex model
    console.log('[generateImage] Calling Fal AI flux-2-flex...');
    const result = await fal.subscribe('fal-ai/flux-2-flex', {
      input: input,
    });
    console.log('[generateImage] Fal AI response received:', { hasData: !!result.data, hasImages: !!result.data?.images });

    // Extract the generated image URL and convert to base64
    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) {
      console.error('[generateImage] No image URL in Fal response:', result);
      return res.status(500).json({ error: 'Fal AI nu a returnat nicio imagine.' });
    }

    const base64 = await urlToBase64(imageUrl);
    console.log('[generateImage] Image converted to base64, returning response');
    return res.json({ success: true, image: `data:image/png;base64,${base64}` });
  } catch (error) {
    const err: any = error;
    const status = err?.status ?? err?.statusCode ?? 'unknown';
    const body = err?.body ?? err?.response ?? undefined;
    const errorMessage = error instanceof Error && error.message ? error.message : body ? JSON.stringify(body) : 'Nu se poate genera imaginea.';

    console.error('[generateImage] ERROR:', {
      errorType: error?.constructor?.name,
      status,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      body,
      fullError: error,
    });

    return res.status(500).json({ error: `Generarea imaginii a eșuat: ${errorMessage}` });
  }
}
