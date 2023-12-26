//
// Copyright 2023 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import { EditorView, type Rect } from '@codemirror/view';
import defaultsDeep from 'lodash.defaultsdeep';

import { invariant } from '@dxos/invariant';

export type BlastOptions = {
  effect: 1 | 2;
  particleGravity: number;
  particleAlphaFadeout: number;
  particleNumRange: { min: number; max: number };
  particleVelocityRange: { x: [number, number]; y: [number, number] };
  maxParticles: number;
  shakeIntensity: number;
};

const defaultOptions: BlastOptions = {
  effect: 1,
  particleGravity: 0.08,
  particleAlphaFadeout: 0.96,
  particleNumRange: { min: 5, max: 10 },
  particleVelocityRange: { x: [-1, 1], y: [-3.5, -1.5] },
  maxParticles: 500,
  shakeIntensity: 5,
};

// https://github.com/chinchang/code-blast-codemirror/blob/master/code-blast.js

export const blast = (options: Partial<BlastOptions> = defaultOptions): Extension => {
  let blaster: Blaster | undefined;
  let view: EditorView | undefined;

  return [
    EditorView.updateListener.of((update) => {
      if (!blaster) {
        view = update.view;
        blaster = new Blaster(view.contentDOM, defaultsDeep({}, options, defaultOptions));
        blaster.initialize();
        blaster.start();
      }

      blaster.shake(0.3);
      const rect = update.view.coordsForChar(update.view.state.selection.main.head);
      if (rect) {
        blaster.spawn(rect);
      }
    }),

    StateField.define({
      create: () => null,
      update: (_value, transaction) => {
        if (transaction.docChanged) {
          blaster?.shake(0.3);
          const rect = view?.coordsForChar(transaction.selection!.main.head);
          if (rect) {
            blaster?.spawn(rect);
          }
        }

        return null;
      },
    }),
  ];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  theta: number;
  drag: number;
  wander: number;
  size: number;
  color: (string | number)[];
};

class Blaster {
  _canvas: HTMLCanvasElement | undefined;
  _ctx: CanvasRenderingContext2D | undefined | null;

  _running = false;
  _lastTime: number | undefined;
  _shakeTime = 0;
  _shakeTimeMax = 0;

  _particles: Particle[] = [];
  _particlePointer = 0;

  constructor(private readonly _node: HTMLElement, private readonly _options: BlastOptions) {}

  initialize() {
    console.log('initialize');
    invariant(!this._canvas && !this._ctx);

    this._canvas = document.createElement('canvas');
    this._canvas.id = 'code-blast-canvas';
    this._canvas.width = this._node.offsetWidth;
    this._canvas.height = this._node.offsetHeight;
    this._canvas.style.position = 'absolute';
    this._canvas.style.top = '0';
    this._canvas.style.left = '0';
    this._canvas.style.zIndex = '0';
    this._canvas.style.pointerEvents = 'none';

    this._ctx = this._canvas.getContext('2d');
    document.body.appendChild(this._canvas);
  }

  destroy() {
    console.log('destroy');
    if (this._canvas) {
      this._canvas.remove();
      this._canvas = undefined;
      this._ctx = undefined;
    }
  }

  start() {
    console.log('start');
    invariant(this._canvas && this._ctx);
    this._running = true;
    this.loop();
  }

  stop() {
    console.log('stop');
    this._running = false;
    this._node.style.transform = 'translate(0px, 0px)';
  }

  loop() {
    if (!this._running || !this._canvas || !this._ctx) {
      return;
    }

    this._ctx.clearRect(0, 0, this._canvas.width ?? 0, this._canvas.height ?? 0);

    // Calculate the delta from the previous frame.
    const now = new Date().getTime();
    this._lastTime ??= now;
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const magnitude = (this._shakeTime / this._shakeTimeMax) * this._options.shakeIntensity;
      const shakeX = random(-magnitude, magnitude);
      const shakeY = random(-magnitude, magnitude);
      this._node.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
    }

    this.drawParticles();

    requestAnimationFrame(this.loop.bind(this));
  }

  shake = throttle((time: number) => {
    this._shakeTime = time;
    this._shakeTimeMax = time;
  }, 100);

  spawn = throttle((rect: Rect) => {
    const node = document.elementFromPoint(rect.left - 5, rect.top + 5);

    // const cursorPos = cm.getCursor();
    // type = cm.getTokenAt(cursorPos);
    // if (type) {
    //   type = type.type;
    // }

    if (node) {
      const numParticles = random(this._options.particleNumRange.min, this._options.particleNumRange.max);
      const color = getRGBComponents(node);
      for (let i = numParticles; i--; i > 0) {
        this._particles[this._particlePointer] = this.createParticle(rect.left + 10, rect.top, color);
        this._particlePointer = (this._particlePointer + 1) % this._options.maxParticles;
      }
    }
  }, 100);

  drawParticles() {
    for (let i = this._particles.length; i--; i > 0) {
      const particle = this._particles[i];
      if (!particle || particle.alpha < 0.01 || particle.size <= 0.5) {
        continue;
      }

      switch (this._options.effect) {
        case 1: {
          effect1(this._ctx!, particle, this._options);
          break;
        }
        case 2: {
          effect2(this._ctx!, particle, this._options);
          break;
        }
      }
    }
  }

  createParticle(x: number, y: number, color: Particle['color']): Particle {
    const particle: Partial<Particle> = {
      x,
      y: y + 10,
      alpha: 1,
      color,
    };

    switch (this._options.effect) {
      case 1: {
        return {
          ...particle,
          size: random(2, 4),
          vx:
            this._options.particleVelocityRange.x[0] +
            Math.random() * (this._options.particleVelocityRange.x[1] - this._options.particleVelocityRange.x[0]),
          vy:
            this._options.particleVelocityRange.y[0] +
            Math.random() * (this._options.particleVelocityRange.y[1] - this._options.particleVelocityRange.y[0]),
        } as Particle;
      }

      case 2: {
        return {
          ...particle,
          size: random(2, 8),
          drag: 0.92,
          vx: random(-3, 3),
          vy: random(-3, 3),
          wander: 0.15,
          theta: (random(0, 360) * Math.PI) / 180,
        } as Particle;
      }
    }

    throw new Error();
  }
}

const effect1 = (ctx: CanvasRenderingContext2D, particle: Particle, options: BlastOptions) => {
  particle.vy += options.particleGravity;
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.alpha *= options.particleAlphaFadeout;

  ctx.fillStyle = `rgba(${particle.color[0]},${particle.color[1]},${particle.color[2]},${particle.alpha})`;
  ctx.fillRect(Math.round(particle.x - 1), Math.round(particle.y - 1), particle.size, particle.size);
};

// Based on Soulwire's demo: http://codepen.io/soulwire/pen/foktm
const effect2 = (ctx: CanvasRenderingContext2D, particle: Particle, options: BlastOptions) => {
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.vx *= particle.drag;
  particle.vy *= particle.drag;
  particle.theta += random(-0.5, 0.5);
  particle.vx += Math.sin(particle.theta) * 0.1;
  particle.vy += Math.cos(particle.theta) * 0.1;
  particle.size *= 0.96;

  ctx.fillStyle = `rgba(${particle.color[0]},${particle.color[1]},${particle.color[2]},${particle.alpha})`;
  ctx.beginPath();
  ctx.arc(Math.round(particle.x - 1), Math.round(particle.y - 1), particle.size, 0, 2 * Math.PI);
  ctx.fill();
};

//
// Utils
//

function throttle(callback: (...args: any[]) => void, limit: number) {
  let wait = false;
  return function (...args: any[]) {
    if (!wait) {
      // @ts-ignore
      callback.apply(this, args);
      wait = true;
      setTimeout(() => {
        wait = false;
      }, limit);
    }
  };
}

const random = (min: number, max: number) => {
  if (!max) {
    max = min;
    min = 0;
  }

  return min + ~~(Math.random() * (max - min + 1));
};

const getRGBComponents = (node: Element): Particle['color'] => {
  const color = getComputedStyle(node).color;
  if (color) {
    try {
      return color.match(/(\d+), (\d+), (\d+)/)?.slice(1) ?? [255, 255, 255];
    } catch (err) {
      return [255, 255, 255];
    }
  } else {
    return [255, 255, 255];
  }
};
