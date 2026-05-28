import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseBase64Image(dataUrl: string): { base64: string; mime: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  return match ? { base64: match[2], mime: match[1] } : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodă nepermisă' });
  }

  const { prompt, size = '1024x1024', imageBase64 } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Promptul este obligatoriu și trebuie să fie un text.' });
  }

  const allowedSizes = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
  const finalSize = allowedSizes.includes(size) ? size : '1024x1024';

  if (prompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt prea lung (maxim 2000 de caractere).' });
  }

  try {
    let response;

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

      const signPrompt = `${prompt}. Render ONLY the store sign / logo on a fully transparent background. Do not include any surrounding building or context.`;

      response = await client.images.generate({
        model: 'gpt-image-1',
        prompt: signPrompt,
        size: finalSize,
      });
    } else {
      response = await client.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: finalSize,
      });
    }

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      return res.status(500).json({ error: 'OpenAI nu a returnat nicio imagine.' });
    }

    res.status(200).json({ success: true, image: `data:image/png;base64,${base64}` });
  } catch (error: any) {
    console.error('OpenAI generation error', error);
    const message = error?.message || (error?.toString && error.toString()) || 'Nu se poate genera imaginea.';
    res.status(500).json({ error: `Generarea imaginii a eșuat: ${message}` });
  }
}
