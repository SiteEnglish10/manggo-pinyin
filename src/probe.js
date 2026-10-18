// Fixed diagnostic content only. Never sends, stores, or includes the user's selection.
export async function translate(_text, _from, _to, options = {}) {
  const mode = options?.config?.probe ?? 'basic';
  if (mode === 'basic') return '<ruby>汉<rt>hàn</rt></ruby><ruby>字<rt>zì</rt></ruby> ABC 123';
  if (mode === 'styled') return '<div style="font-size:24px;line-height:3;white-space:pre-wrap"><span style="display:inline-block;white-space:nowrap;margin:0 .08em"><ruby style="ruby-position:over;ruby-align:center">汉<rt style="font-size:.6em;text-align:center">hàn</rt></ruby></span><span style="display:inline-block;white-space:nowrap;margin:0 .08em"><ruby style="ruby-position:over;ruby-align:center">字<rt style="font-size:.6em;text-align:center">zì</rt></ruby></span> cacheBuffer and return null;</div>';
  if (mode === 'markdown') return '**加粗测试**\n\n```text\ncodeBlock ABC 123\n```';
  throw new Error('未知的渲染诊断模式。');
}
