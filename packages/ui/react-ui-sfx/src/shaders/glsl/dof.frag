uniform vec3 uColor;
uniform float uOpacity;
varying float vDistance;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  if (dot(cxy, cxy) > 1.0) discard;
  gl_FragColor = vec4(uColor, (1.0 - clamp(vDistance * 0.9, 0.0, 2.0)));
}
