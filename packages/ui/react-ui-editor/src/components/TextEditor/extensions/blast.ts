//
// Copyright 2023 DXOS.org
// https://github.com/chinchang/code-blast-codemirror/blob/master/code-blast.js
//

import { type Extension, StateField } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import defaultsDeep from 'lodash.defaultsdeep';

import { invariant } from '@dxos/invariant';

export type BlastOptions = {
  effect?: number;
  maxParticles: number;
  particleGravity: number;
  particleAlphaFadeout: number;
  particleNumRange: { min: number; max: number };
  particleVelocityRange: { x: [number, number]; y: [number, number] };
  particleShrinkRate: number;
  shakeIntensity: number;
  color?: 'random' | 'blood';
};

const defaultOptions1: BlastOptions = {
  maxParticles: 200,
  particleGravity: 0.08,
  particleAlphaFadeout: 0.996,
  particleNumRange: { min: 5, max: 10 },
  particleVelocityRange: { x: [-1, 1], y: [-3.5, -1.5] },
  particleShrinkRate: 0.95,
  shakeIntensity: 5,
};

const defaultOptions2: BlastOptions = {
  maxParticles: 200,
  particleGravity: 0.2,
  particleAlphaFadeout: 0.995,
  particleNumRange: { min: 5, max: 10 },
  particleVelocityRange: { x: [-1, 1], y: [-3.5, -1.5] },
  particleShrinkRate: 0.995,
  shakeIntensity: 5,
  color: 'blood',
};

export const blast = (options: Partial<BlastOptions>): Extension => {
  let blaster: Blaster | undefined;
  let view: EditorView | undefined;
  let last = 0;

  return [
    // Cursor moved.
    EditorView.updateListener.of((update) => {
      if (!blaster) {
        view = update.view;
        blaster = new Blaster(view.contentDOM, defaultsDeep({}, options, defaultOptions1));
        blaster.initialize();
        blaster.start();
        return;
      } else {
        blaster.resize(update.view);
      }

      const current = update.view.state.selection.main.head;
      if (current !== last) {
        last = current;
        // TODO(burdon): Null if end of line.
        const point = getPoint(update.view, current);
        if (point) {
          blaster.spawn(point);
        }
      }
    }),

    // Document changed.
    StateField.define({
      create: () => null,
      update: (_value, transaction) => {
        if (blaster && view && transaction.docChanged) {
          // TODO(burdon): On delete.
          const point = getPoint(view, transaction.selection!.main.head);
          if (point) {
            blaster.spawn(point);
          }
        }

        return null;
      },
    }),

    keymap.of([
      {
        any: (view, event) => {
          if (blaster && event.key === 'Enter' && event.shiftKey) {
            blaster.shake(0.4);
          }

          return false;
        },
      },
    ]),
  ];
};

class Blaster {
  _canvas: HTMLCanvasElement | undefined;
  _ctx: CanvasRenderingContext2D | undefined | null;

  private readonly _effect: Effect;

  _running = false;
  _lastTime: number | undefined;
  _shakeTime = 0;
  _shakeTimeMax = 0;

  _particles: Particle[] = [];
  _particlePointer = 0;

  constructor(private _node: HTMLElement, private readonly _options: BlastOptions) {
    this._effect = this._options.effect === 1 ? new Effect1(_options) : new Effect2(_options);
  }

  initialize() {
    console.log('initialize');
    invariant(!this._canvas && !this._ctx);

    this._canvas = document.createElement('canvas');
    this._canvas.id = 'code-blast-canvas';
    this._canvas.style.position = 'absolute';
    this._canvas.style.top = '0';
    this._canvas.style.left = '0';
    this._canvas.style.zIndex = '0';
    this._canvas.style.pointerEvents = 'none';

    this._ctx = this._canvas.getContext('2d');

    const parent = this._node.parentElement?.parentElement?.parentElement;
    parent?.appendChild(this._canvas);
  }

  destroy() {
    this.stop();
    console.log('destroy');
    if (this._canvas) {
      this._canvas.remove();
      this._canvas = undefined;
      this._ctx = undefined;
    }
  }

  // TODO(burdon): Get view from DOM: EditorView.findFromDOM(this._node)
  //  - View port changes on scroll.
  resize(view: EditorView) {
    this._node = view.contentDOM;
    const node = this._node.parentElement?.parentElement?.parentElement;
    if (node && this._canvas) {
      const { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = node;
      this._canvas.style.top = `${y}px`;
      this._canvas.style.left = `${x}px`;
      this._canvas.width = width;
      this._canvas.height = height;
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
    // this._node.style.transform = 'translate(0px, 0px)';
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
      this._node!.style.transform = `translate(${shakeX}px,${shakeY}px)`;
    }

    this.drawParticles();

    requestAnimationFrame(this.loop.bind(this));
  }

  shake = throttle((time: number) => {
    this._shakeTime = this._shakeTimeMax;
    this._shakeTimeMax = time;
  }, 100);

  spawn = throttle(({ x, y }: { x: number; y: number }) => {
    const node = document.elementFromPoint(x, y);
    if (node) {
      const color = getRGBComponents(node, this._options.color);
      const numParticles = random(this._options.particleNumRange.min, this._options.particleNumRange.max);
      for (let i = numParticles; i--; i > 0) {
        // TODO(burdon): Delta should be based on direction.
        this._particles[this._particlePointer] = this._effect.create(x - 16, y, color);
        this._particlePointer = (this._particlePointer + 1) % this._options.maxParticles;
      }
    }
  }, 100);

  drawParticles() {
    for (let i = this._particles.length; i--; i > 0) {
      const particle = this._particles[i];
      if (!particle) {
        continue;
      }

      if (particle.alpha < 0.01 || particle.size <= 0.5) {
        continue;
      }

      this._effect.update(this._ctx!, particle);
    }
  }
}

//
// Effects
//

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: (string | number)[];
  alpha: number;
  theta?: number;
  drag?: number;
  wander?: number;
};

abstract class Effect {
  constructor(protected readonly _options: BlastOptions) {}
  abstract create(x: number, y: number, color: Particle['color']): Particle;
  abstract update(ctx: CanvasRenderingContext2D, particle: Particle): void;
}

class Effect1 extends Effect {
  create(x: number, y: number, color: Particle['color']) {
    return {
      x,
      y: y + 10,
      vx:
        this._options.particleVelocityRange.x[0] +
        Math.random() * (this._options.particleVelocityRange.x[1] - this._options.particleVelocityRange.x[0]),
      vy:
        this._options.particleVelocityRange.y[0] +
        Math.random() * (this._options.particleVelocityRange.y[1] - this._options.particleVelocityRange.y[0]),
      color,
      size: random(2, 4),
      alpha: 1,
    };
  }

  update(ctx: CanvasRenderingContext2D, particle: Particle) {
    particle.vy += this._options.particleGravity;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.alpha *= this._options.particleAlphaFadeout;

    ctx.fillStyle = `rgba(${particle.color[0]},${particle.color[1]},${particle.color[2]},${particle.alpha})`;
    ctx.fillRect(Math.round(particle.x - 1), Math.round(particle.y - 1), particle.size, particle.size);
  }
}

/**
 * Based on Soulwire's demo.
 * http://codepen.io/soulwire/pen/foktm
 */
class Effect2 extends Effect {
  create(x: number, y: number, color: Particle['color']) {
    return {
      x,
      y: y + 10,
      vx: random(-3, 3),
      vy: random(-3, 3),
      color,
      size: random(2, 8),
      alpha: 1,
      theta: (random(0, 360) * Math.PI) / 180,
      drag: 0.92,
      wander: 0.15,
    };
  }

  update(ctx: CanvasRenderingContext2D, particle: Particle) {
    particle.vy += this._options.particleGravity;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= particle.drag!;
    particle.vy *= particle.drag!;
    particle.theta! += random(-0.5, 0.5);
    particle.vx += Math.sin(particle.theta!) * 0.1;
    particle.vy += Math.cos(particle.theta!) * 0.1;
    particle.size *= this._options.particleShrinkRate;
    particle.alpha *= this._options.particleAlphaFadeout;

    ctx.fillStyle = `rgba(${particle.color[0]},${particle.color[1]},${particle.color[2]},${particle.alpha})`;
    ctx.beginPath();
    ctx.arc(Math.round(particle.x - 1), Math.round(particle.y - 1), particle.size, 0, 2 * Math.PI);
    ctx.fill();
  }
}

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

const getPoint = (view: EditorView, pos: number) => {
  const top = view.coordsAtPos(0);
  const rect = view.coordsForChar(pos);
  return top && rect ? { x: rect.left - top.left, y: rect.top - top.top } : undefined;
};

const getRGBComponents = (node: Element, color: BlastOptions['color']): Particle['color'] => {
  switch (color) {
    case 'random':
      return [Math.random() * 256, Math.random() * 256, Math.random() * 256];

    case 'blood':
      return [random(100, 200), 0, 0];

    default: {
      const color = getComputedStyle(node).color;
      if (color) {
        const x = color.match(/(\d+), (\d+), (\d+)/)?.slice(1);
        if (x) {
          return x;
        }
      }
    }
  }

  return [50, 50, 50];
};
