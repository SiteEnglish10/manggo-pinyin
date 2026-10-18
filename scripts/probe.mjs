import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';
const manifest = {
  manifestVersion: 1, id: 'cn.manggo.ruby-probe', name: 'Ruby 渲染诊断', version: '0.1.0',
  description: '只输出固定样例，帮助确认当前 Manggo 是否渲染 HTML Ruby；不处理选区内容。',
  permissions: [], icon: 'icon.png', runtime: { kind: 'bun', api: 'manggo.plugin.v1', main: 'main.js' },
  services: [{ id: 'probe', kind: 'translation', displayName: 'Ruby 渲染诊断', entry: 'translate', resultType: 'text',
    config: [{ key: 'probe', label: '测试内容', control: 'select', default: 'basic', options: [
      { label: '1. 无样式 Ruby 标签', value: 'basic' },
      { label: '2. 带样式逐字 Ruby', value: 'styled' },
      { label: '3. Markdown 支持对照', value: 'markdown' },
    ] }],
  }],
};
const files = {
  'manggo.plugin.json': strToU8(JSON.stringify(manifest, null, 2)),
  'main.js': new Uint8Array(await readFile(new URL('../src/probe.js', import.meta.url))),
  'icon.png': new Uint8Array(await readFile(new URL('../icon.png', import.meta.url))),
};
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
const data = zipSync(Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, [bytes, { mtime: new Date(2020, 0, 1) }]])));
await writeFile(new URL('../dist/manggo-ruby-probe-0.1.0.mplugin', import.meta.url), data);
console.log('Built dist/manggo-ruby-probe-0.1.0.mplugin');
