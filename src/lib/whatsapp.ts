export class WhatsAppService {
  /**
   * Send Verification Message to a new member
   */
  static async sendVerificationMessage(phone: string, token: string, name: string) {
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;
    const message = `
*ARETA SPORT FITNESS* 🏋️‍♂️
Premium Gym Management

Hello ${name},
Welcome to Areta Sport! Please verify your registration by clicking the secure link below:

🔗 ${link}

_This link will expire in 24 hours._
    `.trim();

    // Call your WA API Provider (e.g., Twilio, Watzap, etc.)
    console.log(`Sending WA to ${phone}:`, message);
    return true;
  }

  /**
   * Send Digital Member Card Link
   */
  static async sendDigitalCard(phone: string, memberId: string, name: string) {
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/card/${memberId}`;
    const message = `
*YOUR DIGITAL MEMBER CARD* 💳

Hello ${name},
Your membership is now ACTIVE. Access your Digital Member Card and QR Code for check-in here:

🔗 ${link}

Keep this link safe!
    `.trim();

    console.log(`Sending WA to ${phone}:`, message);
    return true;
  }

  /**
   * Send Expiry Reminder (H-3, H-1, or Expired)
   */
  static async sendExpiredReminder(phone: string, name: string, daysLeft: number) {
    let message = "";
    if (daysLeft > 0) {
      message = `*REMINDER:* Your Areta Sport membership will expire in ${daysLeft} days. Renew now to keep your access!`;
    } else {
      message = `*ALERT:* Your Areta Sport membership has expired. Your digital card is now invalid. Please renew at the receptionist.`;
    }

    console.log(`Sending WA to ${phone}:`, message);
    return true;
  }
}
