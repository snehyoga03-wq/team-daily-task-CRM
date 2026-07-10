import { NextResponse } from 'next/server';

const DEFAULT_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      phone,
      messageParam,
      parameters,
      accessToken: customAccessToken,
      phoneId: customPhoneId,
      templateName: customTemplateName,
      languageCode: customLanguageCode,
    } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    const token = customAccessToken || DEFAULT_ACCESS_TOKEN;
    const phoneId = customPhoneId || DEFAULT_PHONE_ID;
    const rawTemplate = customTemplateName || 'daily_yoga_05';
    const template = rawTemplate.split(/[\s·•.]/)[0].trim() || 'daily_yoga_05';
    const lang = customLanguageCode || 'en';


    if (!token || !phoneId) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token and Phone Number ID must be provided or configured' },
        { status: 400 }
      );
    }

    // Normalize phone number (assume Indian number if 10 digits)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    // Build template body parameters if provided
    let bodyParameters: any[] = [];
    if (Array.isArray(parameters) && parameters.length > 0) {
      bodyParameters = parameters.map((param: string) => ({
        type: 'text',
        text: String(param),
      }));
    } else if (messageParam !== undefined && messageParam !== null && messageParam !== '') {
      bodyParameters = [
        {
          type: 'text',
          text: String(messageParam),
        },
      ];
    }

    const components: any[] = [];
    if (bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters,
      });
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: template,
        language: {
          code: lang,
        },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return NextResponse.json(
        {
          error: data?.error?.message || 'Failed to send WhatsApp message',
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('WhatsApp API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

