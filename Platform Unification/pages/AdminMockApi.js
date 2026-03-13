/**
 * API request/response for Admin Mock endpoint.
 * Curl equivalent stored for reuse in tests or helpers.
 */
import path from 'path';
import { getTestData } from '../utils/excelReader.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const dataFile = path.resolve('./data/TestData.xlsx');
const testData = getTestData(dataFile);
const CU_NAME = (testData.Cuname || 'platformv5').toString().trim();
const ENV_NAME = (testData.Env || 'dev').toString().trim().toLowerCase();
const MOCK_API_URL_AICC = `https://${CU_NAME}-aicc-${ENV_NAME}-bot.interface.ai/admin/mock`;
const MOCK_API_URL_AACU = `https://${CU_NAME}-${ENV_NAME}-bot.interface.ai/admin/mock`;

const MOCK_API_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer e680e668-363f-4c5f-90ff-44fcd1e3a84e',
};

const DEFAULT_FROM_PHONE = '+18184757881';

function buildTwilioBody(fromPhone) {
  const phone = (fromPhone ?? DEFAULT_FROM_PHONE).toString().trim();
  return {
    type: 'twilio',
    ignoreParseResults: true,
    actions: [
      '<RUN> date 2025-12-18T12:00:00',
      `<SETUP> context fromPhone ${phone}`,
      'Routing Number',
    ],
  };
}

function buildWidgetBody(fromPhone) {
  const phone = (fromPhone ?? DEFAULT_FROM_PHONE).toString().trim();
  return {
    type: 'widget',
    ignoreParseResults: true,
    actions: [
      '<RUN> date 2025-12-18T12:00:00',
      `<SETUP> context fromPhone ${phone}`,
      'Routing number',
    ],
  };
}

/** Request config for the twilio admin mock API. */
export const adminMockRequest = {
  url: MOCK_API_URL_AICC,
  method: 'POST',
  headers: MOCK_API_HEADERS,
  getBody: (fromPhone) => buildTwilioBody(fromPhone),
};

/**
 * Call the twilio admin mock API (AICC) with the given fromPhone.
 * @param {string} fromPhone
 * @returns {Promise<{ status: number, data: unknown, fromPhoneUsed: string }>}
 */
export async function callAdminMockApiWithPhone(fromPhone) {
  const phone = (fromPhone ?? DEFAULT_FROM_PHONE).toString().trim();
  const body = buildTwilioBody(phone);
  const response = await fetch(MOCK_API_URL_AICC, {
    method: 'POST',
    headers: MOCK_API_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => response.text());
  return { status: response.status, data, fromPhoneUsed: phone };
}

/**
 * Call the twilio admin mock API with default fromPhone (legacy).
 * @returns {Promise<{ status: number, data: unknown }>}
 */
export async function callAdminMockApi() {
  const { status, data } = await callAdminMockApiWithPhone(DEFAULT_FROM_PHONE);
  return { status, data };
}

/**
 * Call the widget admin mock API (AACU) with the given fromPhone.
 * @param {string} fromPhone
 * @returns {Promise<{ status: number, data: unknown, fromPhoneUsed: string }>}
 */
export async function callWidgetMockApiWithPhone(fromPhone) {
  const phone = (fromPhone ?? DEFAULT_FROM_PHONE).toString().trim();
  const body = buildWidgetBody(phone);
  const response = await fetch(MOCK_API_URL_AACU, {
    method: 'POST',
    headers: MOCK_API_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => response.text());
  return { status: response.status, data, fromPhoneUsed: phone };
}

/**
 * Call the widget admin mock API with default fromPhone.
 * @returns {Promise<{ status: number, data: unknown }>}
 */
export async function callWidgetMockApi() {
  const { status, data } = await callWidgetMockApiWithPhone(DEFAULT_FROM_PHONE);
  return { status, data };
}

function buildKnowledgeTestBody(query, fromPhone) {
  const phone = (fromPhone ?? DEFAULT_FROM_PHONE).toString().trim();
  return {
    type: 'twilio',
    ignoreParseResults: true,
    actions: [
      '<RUN> date 2026-02-02T12:00:00',
      `<SETUP> context fromPhone ${phone}`,
      query,
    ],
  };
}

/**
 * Call the mock API with a knowledge-based query to verify uploaded file usage.
 * @param {string} query - The question to send (e.g. "what are the types of testing")
 * @param {string} [fromPhone] - Optional phone number override
 * @returns {Promise<{ status: number, data: unknown, outputs: string[] }>}
 */
export async function callKnowledgeTestApi(query, fromPhone) {
  const body = buildKnowledgeTestBody(query, fromPhone);
  const response = await fetch(MOCK_API_URL_AACU, {
    method: 'POST',
    headers: MOCK_API_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => response.text());

  const outputs = [];
  if (Array.isArray(data)) {
    for (const line of data) {
      if (typeof line === 'string' && line.startsWith('OUTPUT:')) {
        outputs.push(line);
      }
    }
  } else if (data && typeof data === 'object') {
    const bodyArr = data.body || data.result || data.data || [];
    if (Array.isArray(bodyArr)) {
      for (const line of bodyArr) {
        if (typeof line === 'string' && line.startsWith('OUTPUT:')) {
          outputs.push(line);
        }
      }
    }
  }

  return { status: response.status, data, outputs };
}

export default {
  adminMockRequest,
  callAdminMockApi, callAdminMockApiWithPhone,
  callWidgetMockApi, callWidgetMockApiWithPhone,
  callKnowledgeTestApi,
};
