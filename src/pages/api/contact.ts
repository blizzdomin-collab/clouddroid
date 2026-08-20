import type { APIRoute } from 'astro';
import { jsonResponse, corsHeaders } from '../../lib/api';
import { withLogging } from '../../lib/apiMiddleware';
import { createContactSubmission } from '../../lib/database';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  company: z.string().optional(),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const validation = contactSchema.safeParse(body);

    if (!validation.success) {
      return jsonResponse({ error: validation.error.errors[0]?.message || 'Invalid input' }, 400);
    }

    const { name, email, subject, message, company } = validation.data;

    if (company && company.trim().length > 0) {
      return jsonResponse({ error: 'Spam detected' }, 400);
    }

    const ipAddress = clientAddress || null;
    const userAgent = request.headers.get('user-agent') || null;

    createContactSubmission({
      name,
      email,
      subject,
      message,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ success: true, message: 'Thank you for your message. We will get back to you within 24 hours.' });
  } catch (error) {
    console.error('Contact form error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
};
