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

  console.log('[generateImage] Request received:', { prompt: prompt?.substring(0, 100), size, hasImage: !!imageBase64 });

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Promptul este obligatoriu și trebuie să fie un text.' });
  }

  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt prea lung (maxim 2000 de caractere).' });
  }

  try {
    // === MODE 1: Building image provided → GPT Image 2 edit (integrates sign into building) ===
    if (imageBase64 && typeof imageBase64 === 'string') {
      console.log('[generateImage] Mode: GPT Image 2 edit (building + sign integration)');

      const parsed = parseBase64Image(imageBase64);
      if (!parsed) {
        return res.status(400).json({ error: 'Imaginea încărcată este invalidă.' });
      }

      // Upload the building image to fal.storage so GPT Image 2 can access it
      const buffer = Buffer.from(parsed.base64, 'base64');
      const blob = new Blob([buffer], { type: parsed.mime });
      const file = new File([blob], 'building.png', { type: parsed.mime });
      const imageUrl = await fal.storage.upload(file);
      console.log('[generateImage] Building image uploaded to fal.storage:', imageUrl);

      // Call GPT Image 2 edit to integrate the sign into the building
      const editPrompt = `Add a commercial illuminated sign to this building: ${prompt}. The sign should be realistically integrated into the building facade with proper perspective, lighting, and shadows. Photorealistic result.`;

      console.log('[generateImage] Calling openai/gpt-image-2/edit...');
      const result = await fal.subscribe('openai/gpt-image-2/edit', {
        input: {
          prompt: editPrompt,
          image_urls: [imageUrl],
          image_size: 'auto',
          quality: 'high',
          num_images: 1,
          output_format: 'png',
        } as any,
      });

      const resultUrl = (result.data as any)?.images?.[0]?.url;
      if (!resultUrl) {
        console.error('[generateImage] GPT Image 2 returned no image:', result.data);
        return res.status(500).json({ error: 'GPT Image 2 nu a returnat nicio imagine.' });
      }
      console.log('[generateImage] GPT Image 2 edit completed OK');

      const base64 = await urlToBase64(resultUrl);
      return res.json({ success: true, image: `data:image/png;base64,${base64}` });
    }

    // === MODE 2: No building → Generate sign as standalone product image ===
    console.log('[generateImage] Mode: Standalone sign generation (flux-2-flex + birefnet)');

    const signPrompt = `Product photography of a commercial illuminated sign: ${prompt}. The sign is photographed straight-on against a pure white seamless studio background. Studio lighting, sharp focus, high detail, no other objects in frame.`;

    console.log('[generateImage] Step 1: Generating sign with flux-2-flex...');
    const signResult = await fal.subscribe('fal-ai/flux-2-flex', {
      input: {
        prompt: signPrompt,
        num_images: 1,
        image_size: { width: 1536, height: 768 },
        num_inference_steps: 28,
        output_format: 'png',
      } as any,
    });

    const signUrl = (signResult.data as any)?.images?.[0]?.url;
    if (!signUrl) {
      return res.status(500).json({ error: 'Nu s-a putut genera firma.' });
    }
    console.log('[generateImage] Sign generated OK');

    // Step 2: Remove background using BiRefNet → transparent PNG
    console.log('[generateImage] Step 2: Removing background with BiRefNet...');
    const bgResult = await fal.subscribe('fal-ai/birefnet', {
      input: {
        image_url: signUrl,
        model: 'General Use (Heavy)',
        operating_resolution: '2048x2048',
        output_format: 'png',
        refine_foreground: true,
      } as any,
    });

    const transparentUrl = (bgResult.data as any)?.image?.url;
    if (!transparentUrl) {
      return res.status(500).json({ error: 'Nu s-a putut procesa imaginea firmei.' });
    }
    console.log('[generateImage] Background removed OK');

    const base64 = await urlToBase64(transparentUrl);
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
