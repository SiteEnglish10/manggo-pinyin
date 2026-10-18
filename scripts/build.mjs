import { build } from 'esbuild';
import { zipSync, strToU8 } from 'fflate';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'manggo.plugin.json'), 'utf8'));
await mkdir(resolve(root, 'dist'), { recursive: true });
await build({
  absWorkingDir: root, entryPoints: ['src/main.js'], outfile: 'dist/main.js',
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', minify: true,
  legalComments: 'inline', charset: 'utf8',
});
const files = {
  'manggo.plugin.json': strToU8(JSON.stringify(manifest, null, 2) + '\n'),
  'main.js': new Uint8Array(await readFile(resolve(root, 'dist/main.js'))),
  'icon.png': new Uint8Array(await readFile(resolve(root, 'icon.png'))),
  'README.md': new Uint8Array(await readFile(resolve(root, 'README.md'))),
  'docs/COMPATIBILITY.md': new Uint8Array(await readFile(resolve(root, 'docs/COMPATIBILITY.md'))),
  'docs/PUBLISH.md': new Uint8Array(await readFile(resolve(root, 'docs/PUBLISH.md'))),
  'THIRD-PARTY-NOTICES.txt': new Uint8Array(await readFile(resolve(root, 'THIRD-PARTY-NOTICES.txt'))),
  'licenses/pinyin-pro.txt': new Uint8Array(await readFile(resolve(root, 'node_modules/pinyin-pro/LICENSE'))),
};
// Fixed ZIP timestamps make identical source + lockfile produce identical archives.
const archive = zipSync(Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, [bytes, { mtime: new Date(2020, 0, 1) }]])), { level: 9 });
const name = `manggo-pinyin-${manifest.version}.mplugin`;
await writeFile(resolve(root, 'dist', name), archive);
await writeFile(resolve(root, 'dist', `${name}.sha256`), createHash('sha256').update(archive).digest('hex') + `  ${name}\n`);
console.log(`Built dist/${name} (${archive.length} bytes; offline ESM bundle)`);
