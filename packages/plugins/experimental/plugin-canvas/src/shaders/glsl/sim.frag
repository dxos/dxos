//
// Copyright 2024 DXOS.org
//

uniform sampler2D positions;
uniform float uTime;
uniform float uCurl;
uniform float uPerturbation;
uniform int uChaos;
varying vec2 vUv;

#pragma glslify: curl = require(glsl-curl-noise2)
#pragma glslify: noise = require(glsl-noise/classic/3d.glsl)

void main() {
  float t = uTime * 0.03;
  vec3 pos = texture2D(positions, vUv).rgb;
  vec3 curlPos = texture2D(positions, vUv).rgb;

  pos = curl(pos * uCurl + t);

  curlPos  = curl(curlPos * uCurl + t);
  if (uChaos > 0) {
    curlPos += curl(curlPos * uCurl * 2.0) * 0.5;
  }
  if (uChaos > 1) {
    curlPos += curl(curlPos * uCurl * 4.0) * 0.25;
  }
  if (uChaos > 2) {
    curlPos += curl(curlPos * uCurl * 8.0) * 0.125;
  }
  if (uChaos > 3) {
    curlPos += curl(curlPos * uCurl * 16.0) * 0.0625;
  }

  vec3 chaoticPost = mix(pos, curlPos, noise(pos + t)) * 1.8;
  // This line sets the output color of the fragment shader:
  // - mix() linearly interpolates between chaoticPost and (pos * x) based on uPerturbation value (0-1)
  // - The result is scaled by 0.7 to reduce overall intensity
  // - The vec4 constructor creates a 4D vector with the mixed/scaled color and alpha=1.0
  gl_FragColor = vec4(mix(chaoticPost, pos * 0.5, uPerturbation) * 0.5, 1.0);
}
