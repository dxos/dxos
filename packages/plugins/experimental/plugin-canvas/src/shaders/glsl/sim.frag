//
// Copyright 2024 DXOS.org
//

uniform int uChaos;
uniform sampler2D positions;
uniform float uTime;
uniform float uCurlFreq;
uniform float uPerturbation;
varying vec2 vUv;

#pragma glslify: curl = require(glsl-curl-noise2)
#pragma glslify: noise = require(glsl-noise/classic/3d.glsl)

void main() {
  float t = uTime * 0.01;
  vec3 pos = texture2D(positions, vUv).rgb;
  vec3 curlPos = texture2D(positions, vUv).rgb;

  pos = curl(pos * uCurlFreq + t);
  curlPos = curl(curlPos * uCurlFreq + t);
  curlPos += curl(curlPos * uCurlFreq * 1.2) * 0.5;
  vec3 chaoticPost = mix(pos, curlPos, noise(pos + t)) * 0.5;

  gl_FragColor = vec4(mix(pos * 0.5, chaoticPost, uPerturbation) * 0.9, 1.0);
}
