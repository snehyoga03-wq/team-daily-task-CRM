export async function sendWhatsAppReminder(phone: string, messageParam: string) {
  try {
    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, messageParam }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send WhatsApp reminder');
    }

    return data;
  } catch (error) {
    console.error('sendWhatsAppReminder error:', error);
    throw error;
  }
}
