//
// Copyright 2026 DXOS.org
//

// A dependency-free RGB canvas written out as PNG, with a 3×5 pixel font for axis labels and word numbers, so the
// scripts run anywhere Node does (the cloud sandbox included) without a native image library.

import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

/** 3×5 glyphs, one row per string, `#` is ink. */
const GLYPHS = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '.': ['...', '...', '...', '...', '.#.'],
  's': ['...', '.##', '.#.', '..#', '##.'],
  'k': ['#..', '#.#', '##.', '#.#', '#.#'],
  'H': ['#.#', '#.#', '###', '#.#', '#.#'],
  'z': ['...', '###', '.#.', '#..', '###'],
  '-': ['...', '...', '###', '...', '...'],
};

export class Canvas {
  constructor(width, height, background = [0, 0, 0]) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 3);
    this.fill(0, 0, width, height, background);
  }

  set(x, y, [red, green, blue]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }
    const offset = (Math.floor(y) * this.width + Math.floor(x)) * 3;
    this.pixels[offset] = red;
    this.pixels[offset + 1] = green;
    this.pixels[offset + 2] = blue;
  }

  fill(x, y, width, height, color) {
    for (let row = Math.max(0, Math.floor(y)); row < Math.min(this.height, y + height); row++) {
      for (let column = Math.max(0, Math.floor(x)); column < Math.min(this.width, x + width); column++) {
        this.set(column, row, color);
      }
    }
  }

  /** Text in the 3×5 font, `scale` pixels per font pixel; unknown characters are left blank. */
  text(x, y, value, color, scale = 2) {
    let cursor = x;
    for (const char of String(value)) {
      const glyph = GLYPHS[char];
      if (glyph) {
        glyph.forEach((row, rowIndex) =>
          [...row].forEach((cell, column) => {
            if (cell === '#') {
              this.fill(cursor + column * scale, y + rowIndex * scale, scale, scale, color);
            }
          }),
        );
      }
      cursor += 4 * scale;
    }
  }

  save(path) {
    const rows = Buffer.alloc((this.width * 3 + 1) * this.height);
    for (let row = 0; row < this.height; row++) {
      rows[row * (this.width * 3 + 1)] = 0;
      Buffer.from(this.pixels.buffer, row * this.width * 3, this.width * 3).copy(rows, row * (this.width * 3 + 1) + 1);
    }
    const chunk = (type, data) => {
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length);
      const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
      const checksum = Buffer.alloc(4);
      checksum.writeUInt32BE(crc32(body) >>> 0);
      return Buffer.concat([length, body, checksum]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0);
    header.writeUInt32BE(this.height, 4);
    header[8] = 8;
    header[9] = 2;
    writeFileSync(
      path,
      Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(rows)),
        chunk('IEND', Buffer.alloc(0)),
      ]),
    );
  }
}

/** Dark-to-bright colour ramp (black, purple, orange, yellow) for intensity in [0, 1]. */
export const heat = (value) => {
  const stops = [
    [0, [0, 0, 4]],
    [0.35, [87, 16, 110]],
    [0.65, [227, 89, 51]],
    [1, [252, 255, 164]],
  ];
  const clamped = Math.max(0, Math.min(1, value));
  const upper = stops.findIndex(([at]) => at >= clamped);
  if (upper <= 0) {
    return stops[0][1];
  }
  const [fromAt, from] = stops[upper - 1];
  const [toAt, to] = stops[upper];
  const mix = (clamped - fromAt) / (toAt - fromAt);
  return from.map((channel, index) => Math.round(channel + (to[index] - channel) * mix));
};
