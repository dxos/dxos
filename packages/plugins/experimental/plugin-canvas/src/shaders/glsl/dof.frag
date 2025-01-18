//
// Copyright 2024 DXOS.org
//

uniform vec3 uMask;
uniform float uOpacity;
varying float vDistance;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  if (dot(cxy, cxy) > 1.0) discard;
  gl_FragColor = vec4(uMask, (1.04 - clamp(vDistance * 0.5, 0.0, 2.0)));
}
