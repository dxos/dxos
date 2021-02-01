//
// Copyright 2019 DXOS.org
//

/**
 * https://observablehq.com/@mbostock/isometric-iii
 */
export class Isometric {
  // TODO(burdon): Types.
  _context: any;
  _moveTo: any;
  _lineTo: any;
  _closePath: any;
  _matrix: any;
  _matrixes: any[];
  _projection: any;

  constructor (context) {
    this._context = context;

    this._moveTo = context.moveTo.bind(context);
    this._lineTo = context.lineTo.bind(context);
    this._closePath = context.closePath.bind(context);

    this._matrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0
    ];

    this._matrixes = [];

    this._projection = [
      Math.cos(Math.PI / 6), Math.cos(Math.PI - Math.PI / 6),
      -Math.sin(Math.PI / 6), -Math.sin(Math.PI - Math.PI / 6)
    ];
  }

  get context () {
    return this._context;
  }

  _project (point, x, y, z) {
    point(
      x * this._projection[0] + y * this._projection[1],
      x * this._projection[2] + y * this._projection[3] - z
    );
  }

  _transform (point, x, y, z) {
    this._project(
      point,
      x * this._matrix[0] + y * this._matrix[1] + z * this._matrix[2] + this._matrix[3],
      x * this._matrix[4] + y * this._matrix[5] + z * this._matrix[6] + this._matrix[7],
      x * this._matrix[8] + y * this._matrix[9] + z * this._matrix[10] + this._matrix[11]
    );
  }

  save () {
    this._matrixes.push(this._matrix.slice());
    return this;
  }

  restore () {
    if (this._matrixes.length) {
      this._matrix = this._matrixes.pop();
    }
    return this;
  }

  // | a b c d |   | kx  0  0 0 |   | a * kx b * ky c * kz d |
  // | e f g h | * |  0 ky  0 0 | = | e * kx f * ky g * kz h |
  // | i j k l |   |  0  0 kz 0 |   | i * kx j * ky k * kz l |
  // | 0 0 0 1 |   |  0  0  0 1 |   |      0      0      0 1 |
  scale3d (kx, ky, kz) {
    this._matrix[0] *= kx;
    this._matrix[1] *= ky;
    this._matrix[2] *= kz;
    this._matrix[4] *= kx;
    this._matrix[5] *= ky;
    this._matrix[6] *= kz;
    this._matrix[8] *= kx;
    this._matrix[9] *= ky;
    this._matrix[10] *= kz;
    return this;
  }

  // | a b c d |   | cos -sin 0 0 |   | a * cos + b * sin a * -sin + b * cos c d |
  // | e f g h | * | sin  cos 0 0 | = | e * cos + f * sin e * -sin + f * cos g h |
  // | i j k l |   |   0    0 1 0 |   | i * cos + j * sin i * -sin + j * cos k l |
  // | 0 0 0 1 |   |   0    0 0 1 |   |                 0                  0 0 1 |
  rotateZ (angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const a = this._matrix[0];
    const b = this._matrix[1];
    const e = this._matrix[4];
    const f = this._matrix[5];
    const i = this._matrix[8];
    const j = this._matrix[9];
    this._matrix[0] = a * cos + b * sin;
    this._matrix[1] = a * -sin + b * cos;
    this._matrix[4] = e * cos + f * sin;
    this._matrix[5] = e * -sin + f * cos;
    this._matrix[8] = i * cos + j * sin;
    this._matrix[9] = i * -sin + j * cos;
    return this;
  }

  // | a b c d |   | 1 0 0 tx |   | a b c a * tx + b * ty + c * tz + d |
  // | e f g h | * | 0 1 0 ty | = | e f g e * tx + f * ty + g * tz + h |
  // | i j k l |   | 0 0 1 tz |   | i j k i * tx + j * ty + k * tz + l |
  // | 0 0 0 1 |   | 0 0 0  1 |   | 0 0 0                            1 |
  translate3d (tx, ty, tz) {
    this._matrix[3] += this._matrix[0] * tx + this._matrix[1] * ty + this._matrix[2] * tz;
    this._matrix[7] += this._matrix[4] * tx + this._matrix[5] * ty + this._matrix[6] * tz;
    this._matrix[11] += this._matrix[8] * tx + this._matrix[9] * ty + this._matrix[10] * tz;
    return this;
  }

  moveTo (x, y, z) {
    this._transform(this._moveTo, x, y, z);
    return this;
  }

  lineTo (x, y, z) {
    this._transform(this._lineTo, x, y, z);
    return this;
  }

  closePath () {
    this._closePath();
    return this;
  }
}
