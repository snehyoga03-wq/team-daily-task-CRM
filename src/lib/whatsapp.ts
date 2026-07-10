import { fetchAppSettings, saveAppSettings } from './dataService';

export interface WhatsAppConfig {
  accessToken: string;
  phoneId: string;
  wabaId?: string;
  templateName: string;
  languageCode: string;
  enabled: boolean;
}

const STORAGE_KEY = 'whatsapp_crm_config';

export function getWhatsAppConfig(): WhatsAppConfig {
  if (typeof window === 'undefined') {
    return {
      accessToken: '',
      phoneId: '',
      wabaId: '',
      templateName: 'daily_yoga_05',
      languageCode: 'en',
      enabled: true,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        accessToken: parsed.accessToken || '',
        phoneId: parsed.phoneId || '',
        wabaId: parsed.wabaId || '',
        templateName: parsed.templateName || 'daily_yoga_05',
        languageCode: parsed.languageCode || 'en',
        enabled: parsed.enabled !== undefined ? parsed.enabled : true,
      };
    }
  } catch (err) {
    console.error('Failed to load WhatsApp config:', err);
  }


  return {
    accessToken: '',
    phoneId: '',
    templateName: 'daily_yoga_05',
    languageCode: 'en',
    enabled: true,
  };
}

export function saveWhatsAppConfig(config: WhatsAppConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save WhatsApp config:', err);
  }
}

export async function loadWhatsAppConfigRemote(): Promise<WhatsAppConfig> {
  const local = getWhatsAppConfig();
  try {
    const remote = await fetchAppSettings('whatsapp_config');
    if (remote && typeof remote === 'object') {
      const merged: WhatsAppConfig = {
        accessToken: remote.accessToken || local.accessToken || '',
        phoneId: remote.phoneId || local.phoneId || '',
        templateName: remote.templateName || local.templateName || 'daily_yoga_05',
        languageCode: remote.languageCode || local.languageCode || 'en',
        enabled: remote.enabled !== undefined ? remote.enabled : local.enabled,
      };
      saveWhatsAppConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not load remote WhatsApp settings:', err);
  }
  return local;
}

export async function saveWhatsAppConfigRemote(config: WhatsAppConfig): Promise<void> {
  saveWhatsAppConfig(config);
  try {
    await saveAppSettings('whatsapp_config', config);
  } catch (err) {
    console.warn('Could not save remote WhatsApp settings:', err);
  }
}


export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components?: any[];
}

export function cleanTemplateName(name: string): string {
  if (!name) return 'daily_yoga_05';
  const clean = name.split(/[\s·•.]/)[0].trim();
  return clean || name;
}

export async function sendWhatsAppReminder(
  phone: string,
  messageParam?: string,
  customConfig?: Partial<WhatsAppConfig>,
  parameters?: string[]
) {
  try {
    const saved = getWhatsAppConfig();
    const config = { ...saved, ...customConfig };

    const payload: any = {
      phone,
      messageParam,
      parameters,
      accessToken: config.accessToken || undefined,
      phoneId: config.phoneId || undefined,
      templateName: cleanTemplateName(config.templateName || 'daily_yoga_05'),
      languageCode: config.languageCode || 'en',
    };

    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.details?.error?.message || 'Failed to send WhatsApp reminder');
    }

    return data;
  } catch (error) {
    console.error('sendWhatsAppReminder error:', error);
    throw error;
  }
}

export async function fetchWhatsAppTemplates(config: Partial<WhatsAppConfig>): Promise<{ wabaId?: string; templates: WhatsAppTemplate[] }> {
  const response = await fetch('/api/whatsapp/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: config.accessToken,
      phoneId: config.phoneId,
      wabaId: config.wabaId,
    }),
  });


  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.details?.error?.message || 'Failed to fetch WhatsApp templates');
  }

  return data;
}

