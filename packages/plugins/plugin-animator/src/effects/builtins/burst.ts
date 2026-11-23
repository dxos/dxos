//
// Copyright 2026 DXOS.org
//

//
// Burst (F-5.6), ported from echo3d's engulf: each bound object splits into particles that fly apart and fade. A
// function of time alone; each object's directions are seeded by its id, so they hold still across frames.
//

export const BURST_SOURCE = `
import { defineEffect, easeOutCubic, hashSeed, seeded } from '@dxos/plugin-animator/effect';

export default defineEffect({
  sample: (ctx) => {
    const params = ctx.params;
    const progress = (ctx.t - (params.at ?? 0)) / (params.duration ?? 0.6);
    if (progress <= 0 || progress >= 1) {
      return [];
    }
    const items = [];
    const spread = params.spread ?? 4;
    const count = Math.max(1, Math.round(params.particles ?? 12));
    for (const object of ctx.bound.objects ?? []) {
      const random = seeded(hashSeed(object.id) ^ ctx.seed);
      const reach = object.radius * (1 + spread * easeOutCubic(progress));
      const size = params.size ?? Math.max(0.05, object.radius * 0.15);
      const color = params.color ?? object.color ?? '#ffffff';
      const opacity = 1 - progress;
      for (let index = 0; index < count; index++) {
        // Even directions on a sphere (3D) or a circle (2D), from the same two draws.
        const height = random() * 2 - 1;
        const angle = random() * Math.PI * 2;
        const ring = ctx.renderer === '3d' ? Math.sqrt(1 - height * height) : 1;
        const direction = { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring, z: ctx.renderer === '3d' ? height : 0 };
        const position = {
          x: object.position.x + direction.x * reach,
          y: object.position.y + direction.y * reach,
          z: object.position.z + direction.z * reach,
        };
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

export const BURST_PARAMS = {
  type: 'object',
  properties: {
    objects: {
      'type': 'array',
      'items': { type: 'string' },
      'x-binding': 'object',
      'description': 'Objects that burst.',
    },
    at: { type: 'number', default: 0, description: 'Seconds into the effect the burst starts.' },
    duration: { type: 'number', default: 0.6, description: 'Seconds the particles fly.' },
    spread: { type: 'number', default: 4, description: 'How far they fly, in object radii.' },
    particles: { type: 'number', default: 12 },
    size: { type: 'number', description: 'Particle radius; 15% of the object radius when unset.' },
    color: { type: 'string', description: "The particles' colour; the object's when unset." },
  },
};
