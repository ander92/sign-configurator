import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodă nepermisă' });

  const { prompt, locationImage } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Promptul este obligatoriu.' });

  try {
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: `Generează o descriere vizuală a simulării pentru următorul brief: ${prompt}`,
      max_tokens: 800,
    });

    const text = response.output?.[0]?.content?.map((c: any) => c.text).join('') ?? '';
    res.status(200).json({ text });
  } catch (error: any) {
    console.error('Chat generation error', error);
    res.status(500).json({ error: error?.message || 'Generarea a eșuat.' });
  }
}
