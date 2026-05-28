import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodă nepermisă' });

  const { contact, project, details } = req.body ?? {};
  if (!contact || !contact.email) return res.status(400).json({ error: 'Informații de contact incomplete.' });

  const marketingEmail = process.env.MARKETING_EMAIL || 'marketing@lemnoor.ro';

  // Require SMTP config
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.error('SMTP not configured');
    return res.status(500).json({ error: 'SMTP nu este configurat pe server. Configurează variabilele de mediu.' });
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: !!process.env.SMTP_SECURE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mail = {
    from: process.env.FROM_EMAIL || 'no-reply@lemnoor.ro',
    to: marketingEmail,
    subject: `Cerere ofertă: ${project} - ${contact.name || contact.email}`,
    text: `Contact: ${JSON.stringify(contact)}\n\nDetalii: ${details}`,
  };

  try {
    await transporter.sendMail(mail as any);
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('Failed to send email', e);
    res.status(500).json({ error: 'Eroare la trimiterea emailului.' });
  }
}
