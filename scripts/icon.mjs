import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile(new URL('../assets/icon.svg', import.meta.url));
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng();
await writeFile(new URL('../icon.png', import.meta.url), png);
console.log('Created icon.png (256 × 256)');
