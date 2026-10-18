import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import { annotate, translate, renderRuby } from '../src/main.js';
import { translate as bundledTranslate } from '../dist/main.js';

const readings = (text, config) => annotate(text, config).map(t => t.reading).join(' ');
test('tone marks, umlaut and neutral tone', () => {
  assert.equal(readings('汉语拼音'), 'hàn yǔ pīn yīn');
  assert.equal(readings('女绿略吗'), 'nǚ lǜ lüè ma');
});
test('context-sensitive polyphonic words', () => {
  assert.equal(readings('重庆银行音乐长大'), 'chóng qìng yín háng yīn yuè zhǎng dà');
  assert.equal(readings('重新重复重要重量'), 'chóng xīn chóng fù zhòng yào zhòng liàng');
});
test('traditional characters retain original text', () => {
  const text = '銀行音樂重慶';
  assert.equal(readings(text), 'yín háng yīn yuè chóng qìng');
  assert.equal(annotate(text).map(t => t.text).join(''), text);
});
test('dictionary tones by default; optional yi/bu sandhi', () => {
  assert.equal(readings('一天不是'), 'yī tiān bù shì');
  assert.equal(readings('一天不是', { toneSandhi: true }), 'yì tiān bú shì');
  assert.equal(readings('你好', { toneSandhi: true }), 'nǐ hǎo');
});
test('unicode, whitespace and unrecognized Han survive tokenization', () => {
  const text = '汉😀𠮷A\r\n语\t é 👨‍👩‍👧‍👦';
  const tokens = annotate(text);
  assert.equal(tokens.map(t => t.text).join(''), text);
  assert.equal(tokens.find(t => t.text === '𠮷').reading, '?');
  assert.equal(tokens.find(t => t.text === '😀').reading, '');
});
test('empty and no-Han selections pass through', async () => {
  for (const text of ['', 'hello <script> & 123 😀', ' \r\n\t']) assert.equal(await translate(text), text);
});
test('pinyin line is above Chinese line', async () => {
  const lines = (await translate('汉语拼音', '', '', { config: { display: 'text' } })).split('\n');
  assert.equal(lines[0].trim(), 'hàn yǔ pīn yīn');
  assert.equal(lines[1].replace(/ /g, ''), '汉语拼音');
});
test('wrapping never changes pronunciation', async () => {
  const text = '重庆银行音乐长大';
  const output = await translate(text, 'auto', 'en', { config: { display: 'text', columns: 12 } });
  const upper = output.split('\n\n').map(b => b.split('\n')[0].trim()).join(' ').replace(/\s+/g, ' ');
  assert.equal(upper, readings(text));
  assert.ok(output.split('\n').every(line => Array.from(line).length <= 12));
});
test('line breaks preserve separate groups', async () => {
  const options = { config: { display: 'text' } };
  assert.equal(await translate('汉\r\n语', '', '', options), await translate('汉\n语', '', '', options));
  assert.equal((await translate('汉\n\n语', '', '', options)).split('\n\n').length, 3);
});
test('longest override wins and does not mutate dictionary state', async () => {
  const config = { readings: '{"单":"dān","单田芳":"shàn tián fāng"}' };
  assert.equal(readings('单田芳单', config), 'shàn tián fāng dān');
  const original = await translate('重');
  const outputs = await Promise.all([
    translate('重', '', '', { config: { readings: '{"重":"chóng"}' } }),
    translate('重', '', '', { config: { readings: '{"重":"zhòng"}' } }),
    translate('重'),
  ]);
  assert.match(outputs[0], /chóng/);
  assert.match(outputs[1], /zhòng/);
  assert.equal(outputs[2], original);
});
test('invalid custom readings fail clearly', () => {
  for (const raw of ['null', '[]', '{', '{"重":"zhong4"}', '{"重庆":"chóng"}', '{"a":"ā"}', '{"重":"<script>"}']) {
    assert.throws(() => annotate('重', { readings: raw }));
  }
});
test('Ruby escapes selected markup and includes tone annotation', async () => {
  const output = renderRuby(annotate('汉<script>alert("x")</script>&\n语'));
  assert.match(output, /汉<rp>\(<\/rp><rt style="[^"]*">hàn<\/rt>/);
  assert.ok(output.includes('&lt;script&gt;'));
  assert.ok(!output.includes('<script>'));
  assert.ok(output.includes('&quot;'));
  assert.ok(output.includes('&amp;\n'));
});
test('legacy display settings migrate to plain text without markup', async () => {
  const text = '汉语拼音 ABC';
  const expected = await translate(text);
  assert.ok(!expected.includes('<ruby'));
  assert.ok(!expected.includes('<div'));
  assert.ok(!expected.includes(String.fromCharCode(96)));
  for (const display of ['text', 'ruby', 'markdown', 'bad']) {
    assert.equal(await translate(text, '', '', { config: { display } }), expected);
  }
});
test('language target has no effect', async () => {
  assert.equal(await translate('汉语', 'auto', 'en'), await translate('汉语', 'zh_CN', 'ja_JP'));
});
test('bad input and config are bounded', async () => {
  await assert.rejects(translate(null), /字符串/);
  await assert.rejects(translate('汉'.repeat(20001)), /20000/);
  for (const columns of [0, 101, 12.5, 'invalid']) await assert.rejects(translate('汉', '', '', { config: { display: 'text', columns } }), /12–100/);
});
test('repeated results are byte-identical, and bundled entry agrees', async () => {
  const text = '重庆银行，繁體音樂：女绿略吗😀𠮷';
  for (const display of ['text', 'markdown', 'ruby']) {
    const options = { config: { display } };
    const expected = await translate(text, 'auto', 'en', options);
    for (let i = 0; i < 10; i++) assert.equal(await bundledTranslate(text, 'auto', 'en', options), expected);
  }
});
test('archive contains standalone entry and correct Manggo contract', async () => {
  const sourceManifest = JSON.parse(await readFile(new URL('../manggo.plugin.json', import.meta.url)));
  const archive = unzipSync(new Uint8Array(await readFile(new URL(`../dist/manggo-pinyin-${sourceManifest.version}.mplugin`, import.meta.url))));
  const manifest = JSON.parse(strFromU8(archive['manggo.plugin.json']));
  assert.equal(manifest.manifestVersion, 1);
  assert.deepEqual(manifest.permissions, []);
  assert.equal(manifest.runtime.api, 'manggo.plugin.v1');
  assert.equal(manifest.services[0].entry, 'translate');
  assert.equal(manifest.services[0].resultType, 'text');
  assert.equal(strFromU8(archive['main.js']), await readFile(new URL('../dist/main.js', import.meta.url), 'utf8'));
  assert.ok(archive['licenses/pinyin-pro.txt']);
  assert.equal(manifest.icon, 'icon.png');
  assert.deepEqual(Array.from(archive['icon.png'].slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(!Object.keys(archive).some(p => p.includes('node_modules')));
});

test('archived Ruby helper keeps one annotation per Han character', async () => {
  const output = renderRuby(annotate('// 初始化 cacheBuffer and return null; 重庆银行\nconst value = 123;'));
  assert.equal((output.match(/<ruby /g) ?? []).length, 7);
  assert.equal((output.match(/<rt /g) ?? []).length, 7);
  assert.ok(output.includes(' cacheBuffer and return null; '));
  assert.ok(output.includes('\nconst value = 123;'));
  assert.ok(!output.includes('<pre'));
  const pairs = [...output.matchAll(/<ruby[^>]*>(.*?)<rp>\(<\/rp><rt[^>]*>(.*?)<\/rt>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(pairs.slice(-4), [['重', 'chóng'], ['庆', 'qìng'], ['银', 'yín'], ['行', 'háng']]);
});

test('Ruby grouping preserves English markup as text and exact source content', async () => {
  const text = '// 汉字 <T> && a[0] != "x";\t\n😀 é';
  const output = renderRuby(annotate(text));
  const restored = output.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/g, '')
    .replace(/<rp>[\s\S]*?<\/rp>/g, '').replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.equal(restored, text);
});
