//
// Copyright 2026 DXOS.org
//

/**
 * 2D vector.
 */
export class Vec2 {
  x: number;
  y: number;
  active = false;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  subtract(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  scaleTo(s: number): this {
    const length = this.length();
    if (length === 0) {
      return this;
    }
    this.x = (this.x * s) / length;
    this.y = (this.y * s) / length;
    return this;
  }

  normalize(): this {
    const length = this.length();
    if (length === 0) {
      return this;
    }
    this.x /= length;
    this.y /= length;
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  truncate(max: number): this {
    const length = this.length();
    if (length > max) {
      this.x = (this.x * max) / length;
      this.y = (this.y * max) / length;
    }
    return this;
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}
