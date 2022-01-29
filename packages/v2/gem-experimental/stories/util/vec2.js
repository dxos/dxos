//
// Copyright 2020 DXOS.org
//

export function Vec2(x, y) {
  this.x = x || 0;
  this.y = y || 0;
  this.count = 0;
  this.active = false;
  return this;
}

Vec2.prototype.add = function(v) {
  this.x += v.x;
  this.y += v.y;
  return this;
};

Vec2.prototype.subtract = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
};

Vec2.prototype.scale = function(s) {
  this.x = this.x * s;
  this.y = this.y * s;
  return this;
};

Vec2.prototype.scaleTo = function(s) {
  let length = this.length();
  this.x = this.x * s / length;
  this.y = this.y * s / length;
  return this;
};

Vec2.prototype.normalize = function() {
  let length = this.length();
  this.x = this.x / length;
  this.y = this.y / length;
  return this;
};

Vec2.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vec2.prototype.truncate = function(max) {
  let length = this.length();
  if (length > max) {
    this.x = this.x * max / length;
    this.y = this.y * max / length;
  }
  return this;
};

Vec2.prototype.dot = function(v) {
  return this.x * v.x + this.y * v.y;
};

Vec2.prototype.clone = function() {
  return new Vec2(this.x, this.y);
};
