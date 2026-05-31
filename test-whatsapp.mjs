const WHATSAPP_ACCESS_TOKEN = 'EAAUtxeqjxA8BRLBdwqWW9M82vyK9FzA9IwxYN5H2UJBIRN8LdfVmdmBzowcCcdIYeTVwetxGezGyBupLDu73lLmKZCuZAtZCYZAAmOxGhQK1qjUTZBc1K7G4134CZAilHKo5B6OscaZCzqOCGS90eYcgWiLT9P0ZC83rOoKeltDYh8IIFVELaWRBjeMS2icfXvU3AwZDZD';
const WHATSAPP_PHONE_ID = '808910018982018';

// Add the 91 country code for India
const phone = '919145414083';
const messageParam = 'Pratham_Test_123';

const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`;
    
const payload = {
  messaging_product: 'whatsapp',
  to: phone,
  type: 'template',
  template: {
    name: 'daily_yoga_05',
    language: {
      code: 'en'
    },
    components: [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: messageParam
          }
        ]
      }
    ]
  }
};

fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
.then(async res => {
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
})
.catch(console.error);
