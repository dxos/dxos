//
// Copyright 2026 DXOS.org
//

//
// A generator, as an agent writes it (the canvas-generators skill): sparks that rise and fade over the DXOS mark. The
// story submits this file's text through `canvas.createGenerator`; it is not imported as code.
//

import { defineGenerator } from '@dxos/react-ui-canvas/motion';

type Params = {
  /** The logo instance; the mark is the square at its left. */
  target: string;
  /** Sparks born per second. */
  rate: number;
  /** Mean spark radius, in scene units. */
  radius: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number };

export default defineGenerator<Params, Spark[]>({
  init: () => [],

  step: (sparks, ctx) => {
    const next = sparks
      .map((spark) => ({
        ...spark,
        x: spark.x + spark.vx * ctx.dt,
        y: spark.y + spark.vy * ctx.dt,
        age: spark.age + ctx.dt,
      }))
      .filter((spark) => spark.age < spark.life);
    const [target] = ctx.bound.target ?? [];
    if (!target || !('bounds' in target)) {
      return next;
    }
    // Born inside a disc over the mark, which is the square at the left of the lockup.
    const { x, y, height } = target.bounds;
    const centre = { x: x + height / 2, y: y + height / 2 };
    const expected = Math.max(0, ctx.params.rate) * ctx.dt;
    let count = Math.floor(expected) + (ctx.random() < expected % 1 ? 1 : 0);
    while (count-- > 0) {
      const angle = ctx.random() * Math.PI * 2;
      const distance = Math.sqrt(ctx.random()) * height * 0.45;
      next.push({
        x: centre.x + Math.cos(angle) * distance,
        y: centre.y + Math.sin(angle) * distance,
        vx: (ctx.random() - 0.5) * 16,
        vy: -8 - ctx.random() * 18,
        age: 0,
        life: 0.5 + ctx.random() * 0.9,
        size: (0.5 + ctx.random()) * ctx.params.radius,
      });
    }
    return next;
  },

  draw: (sparks, ctx) => {
    // The sparks fade in and out with the logo they sit on.
    const [target] = ctx.bound.target ?? [];
    const fade = target && 'node' in target ? (target.node.opacity ?? 1) : 1;
    return sparks.map((spark) => ({
      kind: 'circle' as const,
      center: { x: spark.x, y: spark.y },
      radius: spark.size,
      color: '#d6e2ff',
      opacity: 0.6 * Math.sin((spark.age / spark.life) * Math.PI) * fade,
    }));
  },
});
