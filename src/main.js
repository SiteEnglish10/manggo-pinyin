import { pinyin, addTraditionalDict } from 'pinyin-pro';
import traditional from '@pinyin-pro/data/traditional';

// Fixed, bundled dictionary; no network, runtime files, or request-specific global state.
addTraditionalDict(traditional);
const HAN = /\p{Script=Han}/u;
const HAN_ONLY = /^\p{Script=Han}+$/u;
const MAX_LENGTH = 20000;

function customReadings(raw) {
  if (raw == null || raw === '') return [];
  if (typeof raw !== 'string' || raw.length > 50000) throw new Error('自定义读音必须是 JSON 文本，且不超过 50000 字符。');
  let values;
  try { values = JSON.parse(raw); } catch { throw new Error('自定义读音 JSON 格式错误，例如 {"重":"zhòng"}。'); }
  if (!values || Array.isArray(values) || typeof values !== 'object') throw new Error('自定义读音必须是词语到拼音的 JSON 对象。');
  const entries = Object.entries(values);
  if (entries.length > 500) throw new Error('自定义读音最多支持 500 个词语。');
  return entries.map(([word, reading]) => {
    const chars = Array.from(word);
    if (!HAN_ONLY.test(word) || chars.length > 50 || typeof reading !== 'string') throw new Error('自定义读音的键必须是 1–50 个汉字，值必须是拼音字符串。');
    const syllables = reading.normalize('NFC').trim().split(/\s+/u);
    if (syllables.length !== chars.length || syllables.some(s => !/^[a-züêāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ\u0300-\u030c]{1,12}$/u.test(s))) {
      throw new Error(`“${word}”需要每字一个拼音，以空格分隔；请使用带调字母，轻声不标调。`);
    }
    return { chars, syllables };
  }).sort((a, b) => b.chars.length - a.chars.length);
}

export function annotate(text, config = {}) {
  if (typeof text !== 'string') throw new Error('待注音内容必须是字符串。');
  if (text.length > MAX_LENGTH) throw new Error('单次最多支持 20000 个 UTF-16 字符，请分段划词。');
  const overrides = customReadings(config.readings);
  // Convert the entire passage before wrapping; line width must never change pronunciation.
  const tokens = pinyin(text, {
    type: 'all', toneType: 'symbol', traditional: true,
    toneSandhi: config.toneSandhi === true, nonZh: 'spaced',
    segmentit: 2,
  }).map(item => ({
    text: item.origin,
    reading: item.isZh ? item.pinyin.normalize('NFC') : (HAN.test(item.origin) ? '?' : ''),
  }));
  if (tokens.map(t => t.text).join('') !== text) throw new Error('拼音词典返回的字符映射不完整。');
  for (let i = 0; i < tokens.length; i++) {
    const match = overrides.find(entry => entry.chars.every((char, j) => tokens[i + j]?.text === char));
    if (match) {
      match.syllables.forEach((reading, j) => { tokens[i + j].reading = reading; });
      i += match.chars.length - 1;
    }
  }
  return tokens;
}

export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function renderRuby(tokens) {
  // Each annotated character is an indivisible inline box. Its width accommodates
  // the reading, so adjacent long syllables cannot overlap, even on narrow lines.
  // Non-Han text remains one continuous run: no padding or per-letter containers.
  const body = tokens.map(({ text, reading }) => reading
    ? `<span style="display:inline-block;white-space:nowrap;margin:0 .08em"><ruby style="ruby-position:over;ruby-align:center">${escapeHtml(text)}<rp>(</rp><rt style="font-size:.6em;line-height:1.2;text-align:center;user-select:none">${escapeHtml(reading)}</rt><rp>)</rp></ruby></span>`
    : escapeHtml(text)).join('');
  return `<div lang="zh-CN" style="white-space:pre-wrap;overflow-wrap:break-word;line-height:2.8;font-size:20px">${body}</div>`;
}

// Approximate terminal width. Exact centering requires an appropriate monospace font.
function width(text) {
  return Array.from(text).reduce((sum, char) => {
    if (/\p{Mark}|\u200d|[\ufe00-\ufe0f]/u.test(char)) return sum;
    return sum + (/[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6]|\p{Extended_Pictographic}|\p{Script=Han}/u.test(char) ? 2 : 1);
  }, 0);
}

function center(text, size) {
  const remaining = Math.max(0, size - width(text));
  return ' '.repeat(Math.floor(remaining / 2)) + text + ' '.repeat(Math.ceil(remaining / 2));
}

export function renderText(tokens, columns = 36) {
  const blocks = [];
  let top = '', bottom = '', used = 0;
  function flush(force = false) {
    if (used || force) blocks.push(`${top}\n${bottom}`);
    top = ''; bottom = ''; used = 0;
  }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.text === '\r' || token.text === '\n') {
      flush(true);
      if (token.text === '\r' && tokens[i + 1]?.text === '\n') i++;
      continue;
    }
    const text = token.text === '\t' ? '    ' : token.text;
    const size = Math.max(width(text), width(token.reading));
    const gap = token.reading ? 1 : 0;
    if (used && used + size + gap > columns) flush();
    top += center(token.reading, size) + ' '.repeat(gap);
    bottom += center(text, size) + ' '.repeat(gap);
    used += size + gap;
  }
  flush();
  return blocks.join('\n\n');
}

export async function translate(text, _from, _to, options = {}) {
  const config = options?.config ?? {};
  const tokens = annotate(text, config);
  // Translation target does not affect Chinese pronunciation; no-Han selections pass through.
  if (!HAN.test(text)) return text;
  // Legacy ruby/markdown settings are deliberately ignored on upgrade: this
  // host displays both formats literally. Always return compatible plain text.
  const columns = Number(config.columns ?? 36);
  if (!Number.isInteger(columns) || columns < 12 || columns > 100) throw new Error('双行显示宽度必须是 12–100 的整数。');
  return renderText(tokens, columns);
}
