module.exports = fallback

function _add (a, b) {
  var rl = a.l + b.l
  var a2 = {
    h: a.h + b.h + (rl / 2 >>> 31) >>> 0,
    l: rl >>> 0
  }
  a.h = a2.h
  a.l = a2.l
}

function _xor (a, b) {
  a.h ^= b.h
  a.h >>>= 0
  a.l ^= b.l
  a.l >>>= 0
}

function _rotl (a, n) {
  var a2 = {
    h: a.h << n | a.l >>> (32 - n),
    l: a.l << n | a.h >>> (32 - n)
  }
  a.h = a2.h
  a.l = a2.l
}

function _rotl32 (a) {
  var al = a.l
  a.l = a.h
  a.h = al
}

function _compress (v0, v1, v2, v3) {
  _add(v0, v1)
  _add(v2, v3)
  _rotl(v1, 13)
  _rotl(v3, 16)
  _xor(v1, v0)
  _xor(v3, v2)
  _rotl32(v0)
  _add(v2, v1)
  _add(v0, v3)
  _rotl(v1, 17)
  _rotl(v3, 21)
  _xor(v1, v2)
  _xor(v3, v0)
  _rotl32(v2)
}

function _get_int (a, offset) {
  return (a[offset + 3] << 24) | (a[offset + 2] << 16) | (a[offset + 1] << 8) | a[offset]
}

function fallback (out, m, key) { // modified from https://github.com/jedisct1/siphash-js to use uint8arrays
  var k0 = {h: _get_int(key, 4), l: _get_int(key, 0)}
  var k1 = {h: _get_int(key, 12), l: _get_int(key, 8)}
  var v0 = {h: k0.h, l: k0.l}
  var v2 = k0
  var v1 = {h: k1.h, l: k1.l}
  var v3 = k1
  var mi
  var mp = 0
  var ml = m.length
  var ml7 = ml - 7
  var buf = new Uint8Array(new ArrayBuffer(8))

  _xor(v0, {h: 0x736f6d65, l: 0x70736575})
  _xor(v1, {h: 0x646f7261, l: 0x6e646f6d})
  _xor(v2, {h: 0x6c796765, l: 0x6e657261})
  _xor(v3, {h: 0x74656462, l: 0x79746573})

  while (mp < ml7) {
    mi = {h: _get_int(m, mp + 4), l: _get_int(m, mp)}
    _xor(v3, mi)
    _compress(v0, v1, v2, v3)
    _compress(v0, v1, v2, v3)
    _xor(v0, mi)
    mp += 8
  }

  buf[7] = ml
  var ic = 0
  while (mp < ml) {
    buf[ic++] = m[mp++]
  }
  while (ic < 7) {
    buf[ic++] = 0
  }

  mi = {
    h: buf[7] << 24 | buf[6] << 16 | buf[5] << 8 | buf[4],
    l: buf[3] << 24 | buf[2] << 16 | buf[1] << 8 | buf[0]
  }

  _xor(v3, mi)
  _compress(v0, v1, v2, v3)
  _compress(v0, v1, v2, v3)
  _xor(v0, mi)
  _xor(v2, { h: 0, l: 0xff })
  _compress(v0, v1, v2, v3)
  _compress(v0, v1, v2, v3)
  _compress(v0, v1, v2, v3)
  _compress(v0, v1, v2, v3)

  var h = v0
  _xor(h, v1)
  _xor(h, v2)
  _xor(h, v3)

  out[0] = h.l & 0xff
  out[1] = (h.l >> 8) & 0xff
  out[2] = (h.l >> 16) & 0xff
  out[3] = (h.l >> 24) & 0xff
  out[4] = h.h & 0xff
  out[5] = (h.h >> 8) & 0xff
  out[6] = (h.h >> 16) & 0xff
  out[7] = (h.h >> 24) & 0xff
}
