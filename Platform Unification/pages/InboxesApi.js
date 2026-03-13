process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const RAPID_API_KEY = 'e0b2269f59msh1e9d25f2ee5c4d2p1038e9jsn4067765c8bc8';
const RAPID_API_HOST = 'inboxes-com.p.rapidapi.com';
const API_BASE = `https://${RAPID_API_HOST}`;
const LOGIN_EMAIL = 'testadmin@getairmail.com';

async function apiRequest(method, endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'X-RapidAPI-Key': RAPID_API_KEY,
      'X-RapidAPI-Host': RAPID_API_HOST,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Inboxes API ${method} ${endpoint} → ${res.status}: ${body}`);
  }
  return res.json();
}

export async function activateInbox(email = LOGIN_EMAIL) {
  return apiRequest('POST', `/inboxes/${encodeURIComponent(email)}`);
}

export async function getMessages(email = LOGIN_EMAIL) {
  return apiRequest('GET', `/inboxes/${encodeURIComponent(email)}`);
}

export async function getMessage(messageId) {
  return apiRequest('GET', `/messages/${encodeURIComponent(messageId)}`);
}

export async function deleteInbox(email = LOGIN_EMAIL) {
  return apiRequest('DELETE', `/inboxes/${encodeURIComponent(email)}`);
}

function extractOtp(text) {
  const m = text.match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

export async function pollForOtp(email = LOGIN_EMAIL, timeoutMs = 60000, intervalMs = 5000, existingUids = null) {
  const deadline = Date.now() + timeoutMs;
  const maxPolls = Math.ceil(timeoutMs / intervalMs);

  let seen;
  if (existingUids) {
    seen = existingUids instanceof Set ? existingUids : new Set(existingUids);
  } else {
    const existing = await getMessages(email).catch(() => []);
    seen = new Set(Array.isArray(existing) ? existing.map(m => m.uid) : []);
  }

  for (let i = 1; i <= maxPolls && Date.now() < deadline; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

    const msgs = await getMessages(email).catch(() => []);
    if (!Array.isArray(msgs)) continue;

    for (const m of msgs.filter(m => !seen.has(m.uid))) {
      const full = await getMessage(m.uid).catch(() => null);
      if (!full) continue;
      const otp = extractOtp(full.text || '') || extractOtp(full.html || '') || extractOtp(full.subject || '');
      if (otp) {
        console.log(`[InboxesApi] OTP ${otp} from "${full.subject}"`);
        return { otp, messageId: m.uid, subject: full.subject || '' };
      }
    }
    console.log(`[InboxesApi] Poll ${i}/${maxPolls} — waiting…`);
  }
  throw new Error(`No OTP at ${email} within ${timeoutMs / 1000}s`);
}

export { LOGIN_EMAIL };

export default { activateInbox, getMessages, getMessage, deleteInbox, pollForOtp, LOGIN_EMAIL };
