//
// Copyright 2026 DXOS.org
//

//
// Packet flow (F-5.6), ported from the echo3d prototype's beads: traffic along links in bursts, a quick train of
// packets one way and then a quiet spell, each packet in its source's colour unless the `alert` share turns it red.
// One module draws circles for `2d` and spheres for `3d`.
//

export const PACKET_FLOW_SOURCE = `
import { along, defineEffect } from '@dxos/plugin-animator/effect';

const LINK_COLOR = '#8ea2e6';
const ALERT_COLOR = '#ff3b3b';
const GAP = [0.6, 2.8];

const linkState = (state, id) => (state.links[id] ??= { next: undefined, beads: [] });

export default defineEffect({
  init: () => ({ links: {} }),
  step: (state, ctx) => {
    const params = ctx.params;
    const count = Math.max(0, Math.round(params.count ?? 6));
    const speed = params.speed ?? 0.5;
    const boost = params.boost ?? {};
    for (const link of ctx.bound.links ?? []) {
      const flow = linkState(state, link.id);
      // 'boost' gives links touching the objects it names heavier traffic: more packets, shorter quiet spells.
      const boosted = (boost.objects ?? []).some((id) => id === link.from || id === link.to);
      const size = boosted ? (boost.count ?? count) : count;
      const gap = (boosted && boost.gap) || params.gap || GAP;
      if (size > 0 && ctx.t >= (params.start ?? 0)) {
        flow.next ??= ctx.t;
        if (ctx.t >= flow.next) {
          const reverse = params.both ? ctx.random() < 0.5 : false;
          const idle = Math.max(0, size - flow.beads.length);
          const train = Math.min(idle, 1 + Math.floor(ctx.random() * size * 0.75));
          for (let order = 0; order < train; order++) {
            flow.beads.push({
              phase: 0,
              wait: order * (0.05 + ctx.random() * 0.1),
              rate: 0.9 + ctx.random() * 0.5,
              alert: ctx.random() < (params.alert ?? 0),
              reverse,
            });
          }
          flow.next = ctx.t + gap[0] + ctx.random() * (gap[1] - gap[0]);
        }
      } else {
        flow.next = undefined;
      }
      for (const bead of flow.beads) {
        if (bead.wait > 0) {
          bead.wait -= ctx.dt;
        } else {
          bead.phase += ctx.dt * speed * bead.rate;
        }
      }
      flow.beads = flow.beads.filter((bead) => bead.phase < 1);
    }
    return state;
  },
  draw: (state, ctx) => {
    const params = ctx.params;
    const items = [];
    for (const link of ctx.bound.links ?? []) {
      const flow = state.links[link.id];
      if (!flow) {
        continue;
      }
      const from = ctx.objects[link.from];
      const to = ctx.objects[link.to];
      const visible = Math.min(from?.opacity ?? 1, to?.opacity ?? 1);
      const radius = Math.min(from?.radius ?? 4, to?.radius ?? 4);
      const size = params.size ?? Math.max(0.05, radius * 0.25);
      for (const bead of flow.beads) {
        if (bead.wait > 0) {
          continue;
        }
        const source = bead.reverse ? to : from;
        const color = bead.alert ? ALERT_COLOR : (source?.color ?? params.color ?? LINK_COLOR);
        // Fading in and out at the ends, so a packet emerges from one object and sinks into the other.
        const opacity = visible * (params.opacity ?? 1) * Math.sin(Math.PI * bead.phase);
        const position = along(link.points, bead.reverse ? 1 - bead.phase : bead.phase);
        items.push(
          ctx.renderer === '3d'
            ? { primitive: 'sphere', position, scale: size, color, opacity }
            : { kind: 'circle', center: { x: position.x, y: position.y }, radius: size, color, opacity },
        );
      }
    }
    return items;
  },
});
`;

export const PACKET_FLOW_PARAMS = {
  type: 'object',
  properties: {
    links: {
      'type': 'array',
      'items': { type: 'string' },
      'x-binding': 'link',
      'description': 'Links to flow along; all when empty.',
    },
    count: { type: 'number', default: 6, description: 'Most packets on a link at once.' },
    speed: { type: 'number', default: 0.5, description: 'Lengths of the link a packet travels per second.' },
    gap: { type: 'array', items: { type: 'number' }, description: 'Shortest and longest quiet spell, in seconds.' },
    alert: { type: 'number', default: 0, description: 'The share of packets drawn red.' },
    both: { type: 'boolean', default: false, description: 'Trains run either way.' },
    size: { type: 'number', description: 'Packet radius; a quarter of the smaller end object when unset.' },
    opacity: { type: 'number', default: 1 },
    start: { type: 'number', default: 0, description: 'Seconds before the first train.' },
    boost: {
      type: 'object',
      description: 'Heavier traffic on links touching these objects.',
      properties: {
        objects: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
        gap: { type: 'array', items: { type: 'number' } },
      },
    },
  },
};
