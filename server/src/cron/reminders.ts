import cron from 'node-cron';
import { db, getSetting } from '../db/index.js';

/** Run at 8:00 AM daily - fetch today's reminders and POST to webhook if configured */
function scheduleReminderCron() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const webhookUrl = getSetting('whatsapp_reminder_webhook');
      if (!webhookUrl) return;

      const today = new Date().toISOString().split('T')[0];
      const businessName = getSetting('business_name') || 'TailorFlow Pro';

      const trialOrders = db.prepare(`
        SELECT o.id, o.order_number, o.trial_date, o.garment_type,
               c.full_name as customer_name, c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE DATE(o.trial_date) = DATE(?) AND o.status NOT IN ('delivered', 'cancelled')
      `).all(today) as any[];

      const deliveryOrders = db.prepare(`
        SELECT o.id, o.order_number, o.delivery_date, o.garment_type,
               c.full_name as customer_name, c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE DATE(o.delivery_date) = DATE(?) AND o.status NOT IN ('delivered', 'cancelled')
      `).all(today) as any[];

      const trialReminders = trialOrders.map(o => ({
        ...o,
        type: 'trial',
        message: `Hi ${o.customer_name}, this is a reminder that your trial for order ${o.order_number} (${o.garment_type}) is scheduled for today. Please visit us at your convenience. Thank you - ${businessName}`,
      }));

      const deliveryReminders = deliveryOrders.map(o => ({
        ...o,
        type: 'delivery',
        message: `Hi ${o.customer_name}, your order ${o.order_number} (${o.garment_type}) is ready for delivery today. Please collect from our store or we will deliver as per schedule. Thank you - ${businessName}`,
      }));

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          trialReminders,
          deliveryReminders,
        }),
      });
    } catch (err) {
      console.error('[Reminders Cron]', err);
    }
  });
}

export { scheduleReminderCron };
