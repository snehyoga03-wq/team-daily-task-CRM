import { NextResponse } from 'next/server';

const DEFAULT_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken: customAccessToken, phoneId: customPhoneId, wabaId: customWabaId } = body;

    const token = customAccessToken || DEFAULT_ACCESS_TOKEN;
    const phoneId = customPhoneId || DEFAULT_PHONE_ID;

    if (!token) {
      return NextResponse.json(
        { error: 'WhatsApp Access Token is required to fetch templates' },
        { status: 400 }
      );
    }

    let targetWabaId = customWabaId?.trim();

    // Step 1: If WABA ID is not directly provided, try discovering via user/system account
    if (!targetWabaId) {
      try {
        const clientRes = await fetch(
          `https://graph.facebook.com/v18.0/me/client_whatsapp_business_accounts`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const clientData = await clientRes.json();
        if (clientData?.data?.length > 0 && clientData.data[0].id) {
          targetWabaId = clientData.data[0].id;
        }
      } catch (err) {
        console.warn('Could not discover WABA ID from client_whatsapp_business_accounts');
      }
    }

    if (!targetWabaId) {
      try {
        const ownedRes = await fetch(
          `https://graph.facebook.com/v18.0/me/owned_whatsapp_business_accounts`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const ownedData = await ownedRes.json();
        if (ownedData?.data?.length > 0 && ownedData.data[0].id) {
          targetWabaId = ownedData.data[0].id;
        }
      } catch (err) {
        console.warn('Could not discover WABA ID from owned_whatsapp_business_accounts');
      }
    }

    if (!targetWabaId) {
      return NextResponse.json(
        {
          error: 'To fetch templates, please enter your WhatsApp Business Account ID (WABA ID) in Step 1 above. Found in Meta Developers > WhatsApp > API Setup (right above Phone Number ID).',
        },
        { status: 400 }
      );
    }


    // Step 2: Fetch message templates for the WABA ID
    const templatesRes = await fetch(
      `https://graph.facebook.com/v18.0/${targetWabaId}/message_templates?limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const templatesData = await templatesRes.json();

    if (!templatesRes.ok || templatesData?.error) {
      return NextResponse.json(
        {
          error: templatesData?.error?.message || 'Failed to fetch templates from Meta Graph API',
          details: templatesData,
        },
        { status: templatesRes.status || 400 }
      );
    }

    const rawTemplates = templatesData.data || [];
    const templates = rawTemplates.map((t: any) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      components: t.components || [],
    }));

    return NextResponse.json({
      success: true,
      wabaId: targetWabaId,
      templates,
    });
  } catch (error: any) {
    console.error('Fetch WhatsApp templates API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
