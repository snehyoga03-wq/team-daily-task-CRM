const DEFAULT_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export interface SendWhatsAppTemplateParams {
  phone: string;
  templateName?: string;
  languageCode?: string;
  parameters?: string[];
  messageParam?: string;
  accessToken?: string;
  phoneId?: string;
}

export async function sendWhatsAppTemplateServer({
  phone,
  templateName,
  languageCode,
  parameters,
  messageParam,
  accessToken,
  phoneId,
}: SendWhatsAppTemplateParams) {
  if (!phone) {
    throw new Error('Recipient phone number is required');
  }

  const token = accessToken || DEFAULT_ACCESS_TOKEN;
  const pId = phoneId || DEFAULT_PHONE_ID;
  const rawTemplate = templateName || 'daily_yoga_05';
  const template = rawTemplate.split(/[\s·•.]/)[0].trim() || 'daily_yoga_05';
  const lang = languageCode || 'en';

  if (!token || !pId) {
    throw new Error('WhatsApp Access Token and Phone Number ID must be provided or configured');
  }

  // Normalize phone number (assume Indian number if 10 digits)
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }

  const url = `https://graph.facebook.com/v18.0/${pId}/messages`;

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
    throw new Error(data?.error?.message || 'Failed to send WhatsApp message');
  }

  return data;
}
