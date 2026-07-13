import { NextResponse } from 'next/server';
import { sendWhatsAppTemplateServer } from '@/lib/whatsapp-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      phone,
      messageParam,
      parameters,
      accessToken,
      phoneId,
      templateName,
      languageCode,
    } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    const data = await sendWhatsAppTemplateServer({
      phone,
      messageParam,
      parameters,
      accessToken,
      phoneId,
      templateName,
      languageCode,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('WhatsApp API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


