const assert = require('nanoassert')
const b4a = require('b4a')

const wasm = typeof WebAssembly !== 'undefined' && require('./sha512.js')({
  imports: {
    debug: {
      log (...args) {
        console.log(...args.map(int => (int >>> 0).toString(16).padStart(8, '0')))
      },
      log_tee (arg) {
        console.log((arg >>> 0).toString(16).padStart(8, '0'))
        return arg
      }
    }
  }
})

let head = 0
// assetrt head % 8 === 0 to guarantee alignment
const freeList = []

module.exports = Sha512
const SHA512_BYTES = module.exports.SHA512_BYTES = 64
const INPUT_OFFSET = 80
const STATEBYTES = 216
const BLOCKSIZE = 128

function Sha512 () {
  if (!(this instanceof Sha512)) return new Sha512()
  if (!(wasm)) throw new Error('WASM not loaded. Wait for Sha512.ready(cb)')

  if (!freeList.length) {
    freeList.push(head)
    head += STATEBYTES
  }

  this.finalized = false
  this.digestLength = SHA512_BYTES
  this.pointer = freeList.pop()
  this.pos = 0
  this.wasm = wasm

  this._memory = new Uint8Array(wasm.memory.buffer)
  this._memory.fill(0, this.pointer, this.pointer + STATEBYTES)

  if (this.pointer + this.digestLength > this._memory.length) this._realloc(this.pointer + STATEBYTES)
}

Sha512.prototype._realloc = function (size) {
  wasm.memory.grow(Math.max(0, Math.ceil(Math.abs(size - this._memory.length) / 65536)))
  this._memory = new Uint8Array(wasm.memory.buffer)
}

Sha512.prototype.update = function (input, enc) {
  assert(this.finalized === false, 'Hash instance finalized')

  if (head % 8 !== 0) head += 8 - head % 8
  assert(head % 8 === 0, 'input should be aligned for int64')

  const [inputBuf, length] = formatInput(input, enc)

  assert(inputBuf instanceof Uint8Array, 'input must be Uint8Array or Buffer')

  if (head + input.length > this._memory.length) this._realloc(head + input.length)

  this._memory.fill(0, head, head + roundUp(length, BLOCKSIZE) - BLOCKSIZE)
  this._memory.set(inputBuf.subarray(0, BLOCKSIZE - this.pos), this.pointer + INPUT_OFFSET + this.pos)
  this._memory.set(inputBuf.subarray(BLOCKSIZE - this.pos), head)

  this.pos = (this.pos + length) & 0x7f
  wasm.sha512(this.pointer, head, length, 0)

  return this
}

Sha512.prototype.digest = function (enc, offset = 0) {
  assert(this.finalized === false, 'Hash instance finalized')

  this.finalized = true
  freeList.push(this.pointer)

  const paddingStart = this.pointer + INPUT_OFFSET + this.pos
  this._memory.fill(0, paddingStart, this.pointer + INPUT_OFFSET + BLOCKSIZE)
  wasm.sha512(this.pointer, head, 0, 1)

  const resultBuf = this._memory.subarray(this.pointer, this.pointer + this.digestLength)

  if (!enc) {
    return resultBuf
  }

  if (typeof enc === 'string') {
    return b4a.toString(resultBuf, enc)
  }

  assert(enc instanceof Uint8Array, 'output must be Uint8Array or Buffer')
  assert(enc.byteLength >= this.digestLength + offset,
    "output must have at least 'SHA512_BYTES' bytes remaining")

  for (let i = 0; i < this.digestLength; i++) {
    enc[i + offset] = resultBuf[i]
  }

  return enc
}

Sha512.WASM = wasm
Sha512.WASM_SUPPORTED = typeof WebAssembly !== 'undefined'

Sha512.ready = function (cb) {
  if (!cb) cb = noop
  if (!wasm) return cb(new Error('WebAssembly not supported'))
  cb()
  return Promise.resolve()
}

Sha512.prototype.ready = Sha512.ready

function HMAC (key) {
  if (!(this instanceof HMAC)) return new HMAC(key)

  this.pad = b4a.alloc(128)
  this.inner = Sha512()
  this.outer = Sha512()

  const keyhash = b4a.alloc(64)
  if (key.byteLength > 128) {
    Sha512().update(key).digest(keyhash)
    key = keyhash
  }

  this.pad.fill(0x36)
  for (let i = 0; i < key.byteLength; i++) {
    this.pad[i] ^= key[i]
  }
  this.inner.update(this.pad)

  this.pad.fill(0x5c)
  for (let i = 0; i < key.byteLength; i++) {
    this.pad[i] ^= key[i]
  }
  this.outer.update(this.pad)

  this.pad.fill(0)
  keyhash.fill(0)
}

HMAC.prototype.update = function (input, enc) {
  this.inner.update(input, enc)
  return this
}

HMAC.prototype.digest = function (enc, offset = 0) {
  this.outer.update(this.inner.digest())
  return this.outer.digest(enc, offset)
}

Sha512.HMAC = HMAC

function noop () {}

function formatInput (input, enc) {
  var result = b4a.from(input, enc)

  return [result, result.byteLength]
}

// only works for base that is power of 2
function roundUp (n, base) {
  return (n + base - 1) & -base
}
