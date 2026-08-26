import fs from 'node:fs';
import path from 'node:path';

// A WhatsApp message we want to send. Kept provider-agnostic so swapping providers
// never touches server/reminders.ts or the routes in server/index.ts.
export interface WhatsAppMessage {
  toPhone: string; // as entered in the order (e.g. "054-8899222") — providers normalize as needed
  body: string;
  context: {
    orderId: string;
    kind: 'return_reminder';
  };
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<void>;
}

// Default provider: no real WhatsApp account is configured yet. Instead of sending
// anything, it logs exactly what *would* have been sent — to the server console AND to
// server/data/whatsapp-log.jsonl, so you can open that file and see the full history of
// reminders the system decided to send, and copy/paste a message to send by hand if needed.
class ConsoleWhatsAppProvider implements WhatsAppProvider {
  private readonly logFile = path.resolve(process.cwd(), 'server', 'data', 'whatsapp-log.jsonl');

  async send(message: WhatsAppMessage): Promise<void> {
    const entry = { sentAt: new Date().toISOString(), ...message };
    console.log(`[whatsapp:console] would send to ${message.toPhone} — order ${message.context.orderId}`);
    console.log(`[whatsapp:console] ${message.body.replace(/\n/g, ' ⏎ ')}`);
    try {
      fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      console.error('[whatsapp:console] failed to write whatsapp-log.jsonl', err);
    }
  }
}

// --- Stubs for when you're ready to connect a real account. Neither is wired up yet — ---
// --- picking one is a real decision (a Meta Business/WhatsApp number, or a Twilio account) ---
// --- that needs its own setup outside this codebase.                                     ---

class MetaCloudApiWhatsAppProvider implements WhatsAppProvider {
  async send(_message: WhatsAppMessage): Promise<void> {
    throw new Error(
      'Meta WhatsApp Cloud API is not configured yet. Set WHATSAPP_META_TOKEN, ' +
        'WHATSAPP_META_PHONE_NUMBER_ID and an approved message template in your .env, then ' +
        'implement the POST to https://graph.facebook.com/v20.0/<phone-number-id>/messages here.'
    );
  }
}

class TwilioWhatsAppProvider implements WhatsAppProvider {
  async send(_message: WhatsAppMessage): Promise<void> {
    throw new Error(
      'Twilio WhatsApp is not configured yet. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and ' +
        'TWILIO_WHATSAPP_FROM in your .env, install the "twilio" package, then implement the ' +
        'client.messages.create({...}) call here.'
    );
  }
}

let cachedProvider: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (cachedProvider) return cachedProvider;

  const kind = (process.env.WHATSAPP_PROVIDER || 'console').toLowerCase();
  if (kind === 'meta') cachedProvider = new MetaCloudApiWhatsAppProvider();
  else if (kind === 'twilio') cachedProvider = new TwilioWhatsAppProvider();
  else cachedProvider = new ConsoleWhatsAppProvider();

  return cachedProvider;
}
