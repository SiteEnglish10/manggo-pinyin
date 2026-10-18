import { writeFile } from 'node:fs/promises';
import { translate, escapeHtml, renderRuby, annotate } from '../src/main.js';

const sample = '// 初始化 cacheBuffer and return null;\n重庆银行支持 UTF-8 编码。\nconst value = 123; // 缓存读取成功\n繁體：銀行、音樂、學習。';
const ruby = renderRuby(annotate(sample));
const plain = await translate(sample, '', '', { config: { display: 'text' } });
await writeFile(new URL('../preview.html', import.meta.url), `<!doctype html>
<html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>汉字注音 · 排版预览</title>
<style>
body{margin:0;background:#f4f5f1;color:#24352c;font:16px/1.7 system-ui,sans-serif}main{max-width:760px;margin:40px auto;padding:24px}h1{font-size:30px;margin:0}p{color:#59685f}.card{padding:28px;background:white;border:1px solid #dce3dc;border-radius:16px;margin:24px 0}h2{font-size:18px;margin:0 0 18px}ruby{margin:0 .1em}rt{color:#236646;font-family:system-ui,sans-serif}pre{font-family:Consolas,'Noto Sans Mono CJK SC',monospace;overflow-x:auto;line-height:1.8}small{color:#657269}button{padding:8px 14px;border:1px solid #96ac9d;border-radius:8px;background:white;color:inherit;cursor:pointer}
</style><main><small>离线词典 · 声调标注 · 原文保留</small><h1>汉字注音</h1>
<p>以下为浏览器排版预览，不能证明 Manggo 翻译框支持 HTML。当前版本已恢复双行纯文本；Ruby 仅作为历史方案展示，不从翻译入口输出。</p>
<button onclick="document.querySelector('main').style.maxWidth='320px'">窄窗口</button> <button onclick="document.querySelector('main').style.maxWidth='760px'">宽窗口</button>
<section class="card"><h2>Ruby 逐字注音</h2>${ruby}</section>
<section class="card"><h2>兼容双行文本（等宽字体预览）</h2><pre>${escapeHtml(plain)}</pre></section>
<p>轻声不标调；词典未收录的汉字显示 ?；姓名和地名可以配置自定义读音。</p></main></html>`, 'utf8');
console.log('Created preview.html');
