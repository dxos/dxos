import { readFileSync } from 'node:fs';

{
  var wasm = readFileSync('dist/vendor/internal/automerge_wasm_bg-W2PHBNLJ.wasm');
  new WebAssembly.Module(wasm);
}

{
  var req = await fetch('https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev/internal/automerge_wasm_bg-W2PHBNLJ.wasm');
  var wasm = await req.arrayBuffer();
  new WebAssembly.Module(wasm);
}
