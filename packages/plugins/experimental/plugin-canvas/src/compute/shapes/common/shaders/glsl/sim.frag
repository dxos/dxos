//
// Copyright 2024 DXOS.org
//

uniform sampler2D positions;
uniform float uTime;
uniform float uCurl;
uniform float[5] uCurls;
uniform float uAlpha;
uniform float uPerturbation;
uniform int uChaos;
varying vec2 vUv;

#pragma glslify: curl = require(glsl-curl-noise2)
#pragma glslify: noise = require(glsl-noise/classic/3d.glsl)

float c = 1.0;

void main() {
  float t = uTime * 0.03;
  vec3 pos = texture2D(positions, vUv).rgb;
  vec3 curlPos = texture2D(positions, vUv).rgb;

  // TODO(burdon): Vary curl over time.
  c = mix(0.2, 1.0, 0.5 + (sin(t * 0.5) * 0.5));

  float p = clamp(uPerturbation, 0.2, 1.0);
  if (p > 0.3) {
    c = 0.3;
  } else {
    c = uCurl;
  }

  pos = curl(pos * c + t);
  curlPos  = curl(curlPos * c + t);
  for (int i = 0; i <= uChaos; i++) {
    float q = uCurls[i];
    curlPos += curl(curlPos * c * q) * 1.0 / q;
  }

  // Sets the output color of the fragment shader:
  // - mix(a, b, c) linearly interpolates between a and b by r.
  vec3 chaoticPos = mix(pos, curlPos, noise(pos + t)) * uAlpha;
  gl_FragColor = vec4(mix(pos, chaoticPos, 1.0 - p), 1.0);
}
