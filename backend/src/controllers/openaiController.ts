import { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseBase64Image(dataUrl: string): { base64: string; mime: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return { base64: match[2], mime: match[1] };
}

export async function generateImage(req: Request, res: Response): Promise<Response> {
  const { prompt, size = '1024x1024', imageBase64 } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Promptul este obligatoriu și trebuie să fie un text.' });
  }

  // Supported OpenAI image sizes for gpt-image-1
  const allowedSizes = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
  const finalSize = allowedSizes.includes(size) ? size : '1024x1024';

  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt prea lung (maxim 2000 de caractere).' });
  }

  try {
    let response;

    if (imageBase64 && typeof imageBase64 === 'string') {
      // We generate only the sign with a transparent background and return it
      const parsed = parseBase64Image(imageBase64);
      if (!parsed) {
        return res.status(400).json({ error: 'Date imagine invalide.' });
      }

      const buffer = Buffer.from(parsed.base64, 'base64');
      const maxBytes = 5 * 1024 * 1024; // 5 MB limit for uploaded image to save credit
      if (buffer.length > maxBytes) {
        return res.status(413).json({ error: 'Imaginea încărcată este prea mare (maxim 5 MB).' });
      }

      // Use images.generate to create only the sign/overlay with transparent background.
      // Append a small instruction to the prompt to ensure transparency and sign-only output.
      const signPrompt = `${prompt}. Render ONLY the store sign / logo on a fully transparent background. Do not include any surrounding building or context.`;

      response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: signPrompt,
        size: finalSize,
      });
    } else {
      response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: finalSize,
      });
    }

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      return res.status(500).json({ error: 'OpenAI nu a returnat nicio imagine.' });
    }

    return res.json({ success: true, image: `data:image/png;base64,${base64}` });
  } catch (error) {
    console.error('OpenAI image generation failed', error);
    return res.status(500).json({ error: 'Generarea imaginii a eșuat.' });
  }
}
