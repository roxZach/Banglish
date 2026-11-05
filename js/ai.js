/*
 * Optional AI mode: Claude rewrites each sentence as natural Banglish and
 * restores English words the speech recognizer spelled in Bangla script.
 *
 * Runs in the browser with the user's own API key, which stays in this
 * browser's storage and is sent only to api.anthropic.com.
 */
import Anthropic from 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm';

const SYSTEM = `You convert Bangla speech transcripts into Banglish: Bangla written in English letters the way people in Bangladesh text on Messenger and Facebook.

The transcript comes from Bangla speech recognition, which writes any English the speaker used in Bangla script (মিটিং, আই উইল কল ইউ লেটার, প্রজেক্টটা).

- Write Bangla words phonetically in casual, lowercase Banglish: ami, tumi, kemon acho, korbo, jonno, bhalobasi, ajke.
- Write the English words the speaker said in normal English spelling: meeting, i will call you later, project ta.
- Keep every word the speaker said, in order. Do not translate Bangla into English, summarize, or fix grammar.
- Keep punctuation; । becomes a full stop.
- Reply with the converted text only.`;

let client = null;
let clientKey = null;

function getClient(apiKey) {
  if (!client || clientKey !== apiKey) {
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    clientKey = apiKey;
  }
  return client;
}

function preferences(opts, userDict) {
  const lines = [];
  if (opts.bhAsV) lines.push('Write ভ as "v" (valo, vai).');
  if (opts.phForF) lines.push('Write ফ as "ph" (phul).');
  if (opts.shForS) lines.push('Write স as "sh" (shob, basha).');
  const words = Object.entries(userDict).slice(0, 200);
  if (words.length) lines.push('Always spell these words this way:\n' + words.map(([bn, en]) => `${bn} = ${en}`).join('\n'));
  return lines.length ? `Spelling preferences:\n${lines.join('\n')}\n\n` : '';
}

/** Convert one Bangla sentence. Throws an Error with a user-facing message. */
export async function convertSentence(text, { apiKey, model, opts = {}, userDict = {} }) {
  const params = {
    model,
    max_tokens: 16000,
    // simple rewrite: keep thinking light so results come back quickly
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: `${preferences(opts, userDict)}Transcript:\n${text}` }],
  };
  // If a safety classifier declines, retry on Anthropic's recommended fallback
  // model server-side. Haiku has no server-side fallback.
  if (model !== 'claude-haiku-5-5') {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  let response;
  try {
    response = await getClient(apiKey).beta.messages.create(params);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new Error('Your API key was rejected. Check it in Settings.');
    if (error instanceof Anthropic.PermissionDeniedError) throw new Error('This API key is not allowed to use that model.');
    if (error instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the API. Try again in a moment.');
    if (error instanceof Anthropic.APIConnectionError) throw new Error('Could not reach the Claude API. Check your connection.');
    if (error instanceof Anthropic.APIError) throw new Error(`Claude API error ${error.status ?? ''}: ${error.message}`);
    throw error;
  }

  if (response.stop_reason === 'refusal') throw new Error('Claude declined to convert this sentence.');
  const out = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!out) throw new Error('Claude returned an empty result.');
  return out;
}
