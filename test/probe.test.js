import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import { translate } from '../src/probe.js';

test('probe outputs fixed samples independent of selection', async () => {
  for (const probe of ['basic', 'styled', 'markdown']) {
    const options = { config: { probe } };
    assert.equal(await translate('私密选区', '', '', options), await translate('other', '', '', options));
  }
  assert.equal(await translate('ignored'), '<ruby>汉<rt>hàn</rt></ruby><ruby>字<rt>zì</rt></ruby> ABC 123');
  await assert.rejects(translate('', '', '', { config: { probe: 'bad' } }));
});

test('probe archive is standalone and has a separate plugin identity', async () => {
  const files = unzipSync(new Uint8Array(await readFile(new URL('../dist/manggo-ruby-probe-0.1.0.mplugin', import.meta.url))));
  const manifest = JSON.parse(strFromU8(files['manggo.plugin.json']));
  assert.equal(manifest.id, 'cn.manggo.ruby-probe');
  assert.deepEqual(manifest.permissions, []);
  assert.equal(manifest.services[0].config[0].options.length, 3);
  assert.equal(strFromU8(files['main.js']), await readFile(new URL('../src/probe.js', import.meta.url), 'utf8'));
  assert.ok(files[manifest.icon]);
});
