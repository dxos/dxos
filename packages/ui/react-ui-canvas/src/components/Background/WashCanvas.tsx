//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useRef, useState } from 'react';

import { type Bounds } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type Background, type Camera } from '../../model/index.ts';
import { BACKGROUND_FILLS, WASH_TEXT } from '../../utils/index.ts';

/** The most washes the shader blends; the built-in backgrounds use two. */
const MAX_WASHES = 4;

/** A wash's radius, as a fraction of the field, when it sets none (as the SVG washes take it). */
const WASH_RADIUS = 0.75;

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Per pixel: the surface colour, each wash blended over it with a smoothstep falloff across the field (an ellipse, as an
// SVG gradient over the field's box draws it), all faded towards the field's edges; then dithered by under one 8-bit
// step, so a dim gradient comes out smooth rather than in visible bands, with no texture to see.
const FRAGMENT = `
precision highp float;
uniform vec2 size;
uniform float ratio;
uniform vec3 camera;
uniform vec4 field;
uniform vec3 base;
uniform int count;
uniform vec4 washes[${MAX_WASHES}];
uniform vec3 colors[${MAX_WASHES}];
uniform float fade;

float fall(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 screen = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y) / ratio;
  vec2 scene = screen / camera.z - camera.xy;
  vec2 uv = (scene - field.xy) / field.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float mask = inside;
  if (fade > 0.5) {
    float reach = length(uv - 0.5) / 0.5;
    mask *= reach < 0.3 ? 1.0 : 1.0 - fall((reach - 0.3) / 0.7);
  }
  vec3 color = base;
  for (int index = 0; index < ${MAX_WASHES}; index++) {
    if (index >= count) {
      break;
    }
    vec4 wash = washes[index];
    float alpha = wash.w * (1.0 - fall(length(uv - wash.xy) / wash.z)) * mask;
    color = mix(color, colors[index], alpha);
  }
  float dither = (hash(gl_FragCoord.xy) + hash(gl_FragCoord.yx + 17.0) - 1.0) / 255.0;
  gl_FragColor = vec4(color + dither, 1.0);
}
`;

let webgl: boolean | undefined;

/** Whether this browser can draw the washes on the GPU; elsewhere (a test DOM) the SVG washes stand in. */
export const supportsWashCanvas = (): boolean => {
  if (webgl === undefined) {
    try {
      webgl = typeof document !== 'undefined' && document.createElement('canvas').getContext('webgl') !== null;
    } catch {
      webgl = false;
    }
  }
  return webgl;
};

/** A CSS colour as 0 to 1 RGB, normalised by drawing it: computed styles may be in any colour syntax. */
const toRgb = (context: CanvasRenderingContext2D, css: string): [number, number, number] => {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return [red / 255, green / 255, blue / 255];
};

type Program = {
  gl: WebGLRenderingContext;
  uniform: (name: string) => WebGLUniformLocation | null;
};

const compile = (gl: WebGLRenderingContext): Program | undefined => {
  const shader = (type: number, source: string) => {
    const created = gl.createShader(type);
    if (!created) {
      return undefined;
    }
    gl.shaderSource(created, source);
    gl.compileShader(created);
    return gl.getShaderParameter(created, gl.COMPILE_STATUS) ? created : undefined;
  };
  const vertex = shader(gl.VERTEX_SHADER, VERTEX);
  const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    return undefined;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return undefined;
  }
  gl.useProgram(program);
  // One triangle covering the whole view.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { gl, uniform: (name) => gl.getUniformLocation(program, name) };
};

export type WashCanvasProps = {
  background: Background;
  /** The field the washes and fade lie across, in scene coordinates. */
  field: Bounds;
  camera: Camera;
};

/**
 * A background's surface and colour washes drawn per pixel on the GPU, screen-wide under the scene and following its
 * camera: in place of the canvas fill and the SVG washes, which a browser draws in 8 bits without dithering, so a dim
 * wash shows as bands. Opaque, so nothing is blended over it afterwards to bring the bands back.
 */
export const WashCanvas = ({ background, field, camera }: WashCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probesRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<Program | null | undefined>(undefined);
  const [colors, setColors] = useState<{ base: number[]; washes: number[][] }>();

  // The colours come from the theme's own classes, read off hidden probes, so the washes match their SVG counterparts.
  useLayoutEffect(() => {
    const probes = probesRef.current;
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!probes || !context) {
      return;
    }
    const [surface, ...hues] = Array.from(probes.children);
    setColors({
      base: toRgb(context, getComputedStyle(surface).backgroundColor),
      washes: hues.map((probe) => toRgb(context, getComputedStyle(probe).color)),
    });
  }, [background]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !colors) {
      return;
    }
    if (programRef.current === undefined) {
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
      programRef.current = (gl && compile(gl)) ?? null;
    }
    const program = programRef.current;
    if (!program) {
      return;
    }
    const { gl, uniform } = program;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    const washes = background.washes.slice(0, MAX_WASHES);
    gl.uniform2f(uniform('size'), width, height);
    gl.uniform1f(uniform('ratio'), ratio);
    gl.uniform3f(uniform('camera'), camera.x, camera.y, camera.zoom);
    gl.uniform4f(uniform('field'), field.x, field.y, field.width, field.height);
    gl.uniform3fv(uniform('base'), colors.base);
    gl.uniform1i(uniform('count'), washes.length);
    gl.uniform1f(uniform('fade'), background.fade ? 1 : 0);
    washes.forEach((wash, index) => {
      gl.uniform4f(uniform(`washes[${index}]`), wash.x, wash.y, wash.radius ?? WASH_RADIUS, wash.strength);
      gl.uniform3fv(uniform(`colors[${index}]`), colors.washes[index] ?? [0, 0, 0]);
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });

  return (
    <>
      {/* Sized explicitly: insets alone do not stretch a canvas, which keeps its default 300 by 150. */}
      <canvas
        ref={canvasRef}
        className='absolute inset-0 dx-fill pointer-events-none'
        data-testid='scene-background-washes'
      />
      <div ref={probesRef} className='hidden' aria-hidden>
        <div className={mx(BACKGROUND_FILLS[background.surface] || 'bg-base-surface')} />
        {background.washes.slice(0, MAX_WASHES).map((wash, index) => (
          <span key={index} className={WASH_TEXT[wash.hue]} />
        ))}
      </div>
    </>
  );
};
