var assert = require('nanoassert');
var wasm = undefined;
var fallback = require('./fallback');

module.exports = siphash24;

var BYTES = (siphash24.BYTES = 8);
var KEYBYTES = (siphash24.KEYBYTES = 16);

siphash24.WASM_SUPPORTED = !!wasm;
siphash24.WASM_LOADED = !!wasm;

var memory = new Uint8Array(wasm ? wasm.memory.buffer : 0);

function siphash24(data, key, out, noAssert) {
  if (!out) out = new Uint8Array(8);

  if (noAssert !== true) {
    assert(out.length >= BYTES, 'output must be at least ' + BYTES);
    assert(key.length >= KEYBYTES, 'key must be at least ' + KEYBYTES);
  }

  if (wasm) {
    if (data.length + 24 > memory.length) realloc(data.length + 24);
    memory.set(key, 8);
    memory.set(data, 24);
    wasm.siphash(24, data.length);
    out.set(memory.subarray(0, 8));
  } else {
    fallback(out, data, key);
  }

  return out;
}

function realloc(size) {
  wasm.memory.grow(Math.max(0, Math.ceil(Math.abs(size - memory.length) / 65536)));
  memory = new Uint8Array(wasm.memory.buffer);
}
