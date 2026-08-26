import { readOrders, updateOrder } from './ordersStore';
import { getWhatsAppProvider } from './whatsapp';
import { ORGANIZATIONS } from '../src/data/mockData';
import type { OrderRecord } from '../src/types';

// Sends a WhatsApp reminder once per calendar day, per order, starting the day before
// expectedReturnDate and continuing every day (including every day it's overdue) until the
// order leaves 'active_in_ward' — i.e. until the customer reports the return themselves, or
// staff confirm it directly. That's what "lastReminderSentOn" (a single ISO date) guards:
// at most one send per order per day, however many times the sweep itself runs that day.

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00Z').getTime();
  const to = new Date(toISO + 'T00:00:00Z').getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function buildReminderText(order: OrderRecord, daysOverdue: number): string {
  const itemNames = order.items.map((i) => `${i.equipmentName} (${i.quantity}x)`).join(', ');
  const org = order.organizationId ? ORGANIZATIONS.find((o) => o.id === order.organizationId) : undefined;
  const orgName = order.organizationName || org?.name || 'העמותה';
  const appUrl = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL')
    ? process.env.APP_URL
    : 'http://localhost:3000';
  const reportLink = org ? `${appUrl}/#org/${org.code}/return/${order.id}` : `${appUrl}/#/ADMIN`;

  const dueLine =
    daysOverdue > 0
      ? `תאריך ההחזרה (${order.expectedReturnDate}) כבר עבר לפני ${daysOverdue} ${daysOverdue === 1 ? 'יום' : 'ימים'}.`
      : `תאריך ההחזרה המשוער הוא מחר (${order.expectedReturnDate}).`;

  return (
    `שלום ${order.caregiverName || order.patientName}, זוהי תזכורת מ${orgName} להחזרת הציוד הבא: ${itemNames}. ` +
    `${dueLine} נא להחזיר את הציוד למחסן בהקדם האפשרי. ` +
    `אם כבר החזרתם — אנא דווחו כאן כדי שנעצור את התזכורות: ${reportLink}. ` +
    `תודה, ${orgName}.`
  );
}

export interface ReminderSweepResult {
  checked: number;
  sent: number;
  sentOrderIds: string[];
}

// Scans every order and sends (via whatever WHATSAPP_PROVIDER is configured — "console" by
// default) at most one reminder per order per calendar day.
export async function runReminderSweep(): Promise<ReminderSweepResult> {
  const today = todayISO();
  const orders = await readOrders();
  const provider = getWhatsAppProvider();

  let sent = 0;
  const sentOrderIds: string[] = [];

  for (const order of orders) {
    if (order.orderStatus !== 'active_in_ward') continue; // reported/confirmed/returned/etc. — stop reminding
    if (!order.expectedReturnDate) continue;
    if (order.lastReminderSentOn === today) continue; // already sent today

    const daysUntilDue = daysBetween(today, order.expectedReturnDate);
    if (daysUntilDue > 1) continue; // more than a day away — not yet time to start reminding

    const daysOverdue = Math.max(0, -daysUntilDue);
    const phone = order.caregiverPhone || order.patientPhone;
    if (!phone) continue;

    try {
      await provider.send({
        toPhone: phone,
        body: buildReminderText(order, daysOverdue),
        context: { orderId: order.id, kind: 'return_reminder' },
      });
      await updateOrder(order.id, {
        lastReminderSentOn: today,
        reminderCount: (order.reminderCount || 0) + 1,
      });
      sent += 1;
      sentOrderIds.push(order.id);
    } catch (err) {
      console.error(`[reminders] failed to send reminder for order ${order.id}`, err);
    }
  }

  return { checked: orders.length, sent, sentOrderIds };
}
