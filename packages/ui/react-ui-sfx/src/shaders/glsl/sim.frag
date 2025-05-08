#pragma glslify: curl = require('glsl-curl-noise2')
#pragma glslify: noise = require('glsl-noise/classic/3d.glsl')

uniform sampler2D positions;
uniform float uTime;
uniform float uCurl;
uniform float[5] uCurls;
uniform float uAlpha;
uniform float uPerturbation;
uniform int uChaos;
varying vec2 vUv;

void main() {
  vec3 pos = texture2D(positions, vUv).rgb;
  vec3 curlPos = texture2D(positions, vUv).rgb;

  float t = uTime * 0.03;
  float c = uCurl;
  float a = clamp(uPerturbation, 0.2, 1.0);
  if (uPerturbation < 0.1) {
    // Cycle curl over time when inactive; low values are smooth.
    // c = mix(0.2, uCurl, 0.5 + (sin(t * 0.5) * 0.5));
  }

  pos = curl(t + pos * c);
  curlPos  = curl(t + curlPos * c);
  for (int i = 0; i <= uChaos; i++) {
    float q = uCurls[i];
    curlPos += curl(curlPos * c * q) * 1.0 / q;
  }

  // Sets the output color of the fragment shader:
  // - mix(a, b, c) linearly interpolates between a and b by r.
  vec3 chaoticPos = mix(pos, curlPos, noise(pos + t)) * uAlpha;
  gl_FragColor = vec4(mix(pos, chaoticPos, 1.0 - a), 1.0);
}
