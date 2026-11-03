//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { CanvasOperation, Generator } from '#types';

const operations = [
  CanvasOperation.CreateGenerator,
  CanvasOperation.UpdateGenerator,
  CanvasOperation.InspectGenerator,
  CanvasOperation.AddGenerator,
];

export const key = Generator.SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key: Generator.SKILL_KEY,
    name: 'Canvas generators',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({ source: INSTRUCTIONS }),
  });

/** The contract a generator is written against (react-ui-canvas ANIMATION.md §6), and how to work with one. */
export const INSTRUCTIONS = trim`
  You write generators: code a canvas drawing runs to draw motion that keyframes cannot express (particles, flows,
  shimmer, bodies that travel along links). A generator is one TypeScript module, stored as a Generator object and
  placed in a drawing as a generator node with parameters. It draws by returning shapes; it never touches the page.

  ## Workflow

  1. canvas.createGenerator with the source and a JSON schema of its parameters. Fix any compile errors with
     canvas.updateGenerator (every update bumps the version; canvases showing it recompile and replay).
  2. canvas.inspectGenerator with the parameters and frame you intend, and times across the span you care about. Read
     the report: deterministic must be true; meanStepMs must stay under budgetMs (4 ms per step); look at the contact
     sheet (an SVG of the frames) to judge the motion. Revise and check again until it reads as asked.
  3. canvas.addGenerator to put it in a drawing's scene, binding node or link ids in its parameters.
  4. To animate, make an Animation over the drawing's canvas (animator.createAnimation) and key its shot with
     animator.setKey: numeric parameters (path "<node>:params.<name>"), node properties (center, size,
     style.opacity) or the camera ("camera:x", "camera:y": the scene point at the view centre; "camera:zoom").

  ## The module

  The default export is defineGenerator({ ... }) from '@dxos/react-ui-canvas/motion', the only import allowed. Either:
  - stateless: sample(ctx) returns Shape[] for time ctx.t. Use it when the content is a function of time alone.
  - stateful: init(ctx) returns a state; step(state, ctx) returns the next one, called at a fixed 120 Hz whatever the
    display; draw(state, ctx) returns Shape[]. Optional warmup (seconds) steps before t = 0. The state must be plain
    data (it is cloned into a checkpoint every 2 s, so scrubbing back replays at most 2 s).

  ctx holds: t (seconds), dt (the fixed step; 0 when sampling), params (the node's parameters at t, keys applied),
  random() (seeded per node: the only randomness allowed), scene (sampled at t), bounds (the node's frame), and bound:
  for each parameter marked "x-binding": "node" or "link" in the schema, the resolved geometry at t
  ({ id, center, size, bounds } for a node; { id, path, points } for a link). Read geometry from bound every step and
  never store it: a bound node moving on the timeline moves what the generator does.

  Rules: no Date, timers, performance, fetch, DOM or Math.random (they are not there, or throw). The same parameters,
  seed and time must give the same shapes. A generator that throws, or whose mean step goes over budget, is paused
  and shows why on the canvas.

  Shapes, in scene coordinates: { kind: 'circle', center, radius }, { kind: 'rect', bounds, radius? },
  { kind: 'path', d, width?, reveal? } (reveal 0..1 draws that much of the stroke from its start), and
  { kind: 'instance', composite, center, scale? } (draws a composite object). Each takes opacity (0..1) and a colour:
  hue (a theme hue: neutral, red, orange, amber, green, teal, sky, blue, violet) or color (CSS).

  Motion library: along(route, { speed, easing }) follows a path, polyline or bound link; orbit(center, { radius,
  period, phase }); settle(from, to, { duration, easing }); andThen(first, next) runs next once first is done;
  jitter(motion, { amplitude, seed, frequency }). Each is a function of time returning { position, angle, done }.
  Math kit: lerp, clamp, ease(easing, progress), seeded(seed), hashSeed(text), pointOnPath(d, fraction).

  ## Worked example: particles orbiting a bound node

  Parameters schema:
  { "type": "object", "properties": {
      "target": { "type": "string", "x-binding": "node" },
      "count": { "type": "number" }, "period": { "type": "number" } } }

  Source:
  import { defineGenerator, jitter, orbit } from '@dxos/react-ui-canvas/motion';

  type Params = { target: string; count: number; period: number };

  export default defineGenerator<Params>({
    sample: (ctx) => {
      const [target] = ctx.bound.target ?? [];
      if (!target || !('center' in target)) {
        return [];
      }
      const radius = Math.max(target.size.width, target.size.height) * 0.6;
      return Array.from({ length: ctx.params.count }, (_, index) => {
        const path = jitter(orbit(target.center, { radius, period: ctx.params.period, phase: (index / ctx.params.count) * Math.PI * 2 }), { amplitude: 6, seed: index });
        return { kind: 'circle', center: path(ctx.t).position, radius: 3, hue: 'sky', opacity: 0.8 };
      });
    },
  });

  It is stateless, so it scrubs freely; bound to a node, it follows the node as the timeline moves it.
`;
