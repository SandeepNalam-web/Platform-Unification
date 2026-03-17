process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const INBOX_API = 'https://inboxes.com/api/v2/inbox';
const LOGIN_EMAIL = 'testadmin@getairmail.com';

/**
 * Fetches the latest OTP from the inbox with a single API call.
 * GET https://inboxes.com/api/v2/inbox/{email}
 *
 * Filters for messages from "interface.ai" and extracts the 6-digit
 * OTP from the subject field (s).
 */
export async function fetchOtp(email = LOGIN_EMAIL, waitMs = 10000) {
  await new Promise(r => setTimeout(r, waitMs));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${INBOX_API}/${encodeURIComponent(email)}`);
    if (!res.ok) {
      console.log(`[InboxesApi] Attempt ${attempt}/3 — API returned ${res.status}, retrying in 5s…`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const data = await res.json();
    const msgs = data.msgs || [];

    const MAX_AGE_MS = 2 * 60 * 1000;
    const now = Date.now();

    const latest = msgs.find(m => {
      if (!m.f || !m.f.toLowerCase().includes('interface.ai')) return false;
      if (!m.cr) return false;
      const ageMs = now - new Date(m.cr).getTime();
      return ageMs <= MAX_AGE_MS;
    });

    if (!latest) {
      console.log(`[InboxesApi] Attempt ${attempt}/3 — no recent message from interface.ai (rr: ${msgs[0]?.rr || 'N/A'}), retrying in 5s…`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const otpMatch = (latest.s || '').match(/\b(\d{6})\b/);
    if (otpMatch) {
      const otp = otpMatch[1];
      console.log(`[InboxesApi] OTP ${otp} from subject: "${latest.s}" (${latest.rr})`);
      return { otp, subject: latest.s };
    }

    console.log(`[InboxesApi] Attempt ${attempt}/3 — no 6-digit OTP in subject "${latest.s}" (${latest.rr}), retrying in 5s…`);
    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error(`No OTP found at ${email} after waiting`);
}

export { LOGIN_EMAIL };

export default { fetchOtp, LOGIN_EMAIL };
