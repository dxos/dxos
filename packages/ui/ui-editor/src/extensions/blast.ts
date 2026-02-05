//
// Copyright 2023 DXOS.org
// Based on a demo by Joel Besada and Kushagra Gour.
// https://twitter.com/JoelBesada/status/670343885655293952
// https://github.com/chinchang/code-blast-codemirror/blob/master/code-blast.js
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import defaultsDeep from 'lodash.defaultsdeep';

import { throttle } from '@dxos/async';
import { invariant } from '@dxos/invariant';

export type BlastOptions = {
  effect?: number;
  maxParticles: number;
  particleGravity: number;
  particleAlphaFadeout: number;
  particleSize: { min: number; max: number };
  particleNumRange: { min: number; max: number };
  particleVelocityRange: { x: [number, number]; y: [number, number] };
  particleShrinkRate: number;
  shakeIntensity: number;
  color?: () => number[];
};

export const defaultOptions: BlastOptions = {
  effect: 2,
  maxParticles: 200,
  particleGravity: 0.08,
  particleAlphaFadeout: 0.996,
  particleSize: { min: 2, max: 8 },
  particleNumRange: { min: 5, max: 10 },
  particleVelocityRange: { x: [-1, 1], y: [-3.5, -1.5] },
  particleShrinkRate: 0.95,
  shakeIntensity: 5,
};

export const blast = (options: Partial<BlastOptions> = defaultOptions): Extension => {
  let blaster: Blaster | undefined;
  let last = 0;

  const getPoint = (view: EditorView, pos: number) => {
    const { left: x = 0, top: y = 0 } = view.coordsForChar(pos) ?? {};
    const element = document.elementFromPoint(x, y);

    const { offsetLeft: left = 0, offsetTop: top = 0 } = view.scrollDOM.parentElement ?? {};
    const point = { x: x - left, y: y - top };

    return { element, point };
  };

  return [
    // Cursor moved.
    EditorView.updateListener.of((update) => {
      // NOTE: The MarkdownEditor may recreated the EditorView.
      if (blaster?.node !== update.view.scrollDOM) {
        if (blaster) {
          blaster.destroy();
        }

        blaster = new Blaster(
          update.view.scrollDOM,
          defaultsDeep(
            {
              particleGravity: 0.2,
              particleShrinkRate: 0.995,
              color: () => [100 + Math.random() * 100, 0, 0],
            },
            options,
            defaultOptions,
          ),
        );
        blaster.initialize();
        blaster.start(); // TODO(burdon): Stop/clean-up.
      } else {
        blaster.resize();
      }

      const current = update.state.selection.main.head;
      if (current !== last) {
        last = current;
        // TODO(burdon): Null if end of line.
        const { element, point } = getPoint(update.view, current - 1);
        if (element && point) {
          blaster.spawn({ element, point });
        }
      }
    }),

    keymap.of([
      {
        any: (_, event) => {
          if (blaster) {
            if (event.key === 'Enter' && event.shiftKey) {
              blaster.shake({ time: 0.8 });
              return true;
            }
          }

          return false;
        },
      },
    ]),
  ];
};

//
// Blaster (no CM deps).
//

class Blaster {
  private readonly _effect: Effect;

  _canvas: HTMLCanvasElement | undefined;
  _ctx: CanvasRenderingContext2D | undefined | null;

  _running = false;
  _lastTime: number | undefined;
  _shakeTime = 0;
  _shakeTimeMax = 0;

  _particles: Particle[] = [];
  _particlePointer = 0;

  _lastPoint = { x: 0, y: 0 };

  constructor(
    private readonly _node: HTMLElement,
    private readonly _options: BlastOptions,
  ) {
    this._effect = this._options.effect === 1 ? new Effect1(_options) : new Effect2(_options);
  }

  get node() {
    return this._node;
  }

  initialize(): void {
    // console.log('initialize');
    invariant(!this._canvas && !this._ctx);

    this._canvas = document.createElement('canvas');
    this._canvas.id = 'code-blast-canvas';
    this._canvas.style.position = 'absolute';
    this._canvas.style.zIndex = '0';
    this._canvas.style.pointerEvents = 'none';
    // this._canvas.style.border = '2px dashed red';

    this._ctx = this._canvas.getContext('2d');

    const parent = this._node.parentElement?.parentElement;
    parent?.appendChild(this._canvas);

    this.resize();
  }

  destroy(): void {
    this.stop();
    // console.log('destroy');
    if (this._canvas) {
      this._canvas.remove();
      this._canvas = undefined;
      this._ctx = undefined;
    }
  }

  resize(): void {
    if (this._node.parentElement && this._canvas) {
      const { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = this._node.parentElement;
      this._canvas.style.top = `${y}px`;
      this._canvas.style.left = `${x}px`;
      this._canvas.width = width;
      this._canvas.height = height;
    }
  }

  start(): void {
    // console.log('start');
    invariant(this._canvas && this._ctx);
    this._running = true;
    this.loop();
  }

  stop(): void {
    // console.log('stop');
    this._running = false;
    this._node.style.transform = 'translate(0px, 0px)';
  }

  loop(): void {
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

  shake = throttle(({ time }: { time: number }) => {
    this._shakeTime = this._shakeTimeMax || time;
    this._shakeTimeMax = time;
  }, 100);

  spawn = throttle(({ element, point }: { element: Element; point: { x: number; y: number } }) => {
    const color = getRGBComponents(element, this._options.color);
    const numParticles = random(this._options.particleNumRange.min, this._options.particleNumRange.max);
    const dir = this._lastPoint.x === point.x ? 0 : this._lastPoint.x < point.x ? 1 : -1;
    this._lastPoint = point;
    for (let i = numParticles; i--; i > 0) {
      this._particles[this._particlePointer] = this._effect.create(point.x - dir * 16, point.y, color);
      this._particlePointer = (this._particlePointer + 1) % this._options.maxParticles;
    }
  }, 100);

  drawParticles(): void {
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
      vx: random(this._options.particleVelocityRange.x[0], this._options.particleVelocityRange.x[1]),
      vy: random(this._options.particleVelocityRange.y[0], this._options.particleVelocityRange.y[1]),
      size: random(this._options.particleSize.min, this._options.particleSize.max),
      color,
      alpha: 1,
    };
  }

  update(ctx: CanvasRenderingContext2D, particle: Particle): void {
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
      vx: random(this._options.particleVelocityRange.x[0], this._options.particleVelocityRange.x[1]),
      vy: random(this._options.particleVelocityRange.y[0], this._options.particleVelocityRange.y[1]),
      size: random(this._options.particleSize.min, this._options.particleSize.max),
      color,
      alpha: 1,
      theta: (random(0, 360) * Math.PI) / 180,
      drag: 0.92,
      wander: 0.15,
    };
  }

  update(ctx: CanvasRenderingContext2D, particle: Particle): void {
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

const getRGBComponents = (node: Element, color: BlastOptions['color']): Particle['color'] => {
  if (typeof color === 'function') {
    return color();
  }

  const bgColor = getComputedStyle(node).color;
  if (bgColor) {
    const x = bgColor.match(/(\d+), (\d+), (\d+)/)?.slice(1);
    if (x) {
      return x;
    }
  }

  return [50, 50, 50];
};

const random = (min: number, max: number) => {
  if (!max) {
    max = min;
    min = 0;
  }

  return min + ~~(Math.random() * (max - min + 1));
};
