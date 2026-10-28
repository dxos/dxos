//
// Copyright 2026 DXOS.org
//

//
// Bindings (DESIGN.md §6): what effects draw on. A stage reports its objects and links for a sample (`StageDef.bind`);
// the animator samples that across the shot at a fixed rate, ahead of time, so a worker can read the bindings at any
// step without the stage object, and the same time always reads the same geometry.
//

import { type Vec3 } from '@dxos/animation';

import { type AnimatorCapabilities } from '#types';

import { type BindingTrack, type Bound } from './types.ts';

/** Bindings sampled per second of shot. */
export const BINDING_RATE = 30;

export const EMPTY_BINDING: AnimatorCapabilities.StageBinding = { objects: {}, links: [] };

/** The stage's bindings across `duration` seconds, from `bindAt` (the stage's `bind` over the shot's sample at a time). */
export const bindingTrack = (
  duration: number,
  bindAt: (t: number) => AnimatorCapabilities.StageBinding,
  rate = BINDING_RATE,
): BindingTrack => {
  const count = Math.max(1, Math.ceil(Math.max(0, duration) * rate) + 1);
  return { rate, frames: Array.from({ length: count }, (_, index) => bindAt(index / rate)) };
};

const mixNumber = (from: number, to: number, amount: number) => from + (to - from) * amount;

const mixVec = (from: Vec3, to: Vec3, amount: number): Vec3 => ({
  x: mixNumber(from.x, to.x, amount),
  y: mixNumber(from.y, to.y, amount),
  z: mixNumber(from.z, to.z, amount),
});

/** The bindings at `t`: positions, radii and opacities interpolated between the samples either side. */
export const bindingAt = (track: BindingTrack | undefined, t: number): AnimatorCapabilities.StageBinding => {
  if (!track || track.frames.length === 0) {
    return EMPTY_BINDING;
  }
  const position = Math.min(track.frames.length - 1, Math.max(0, t * track.rate));
  const index = Math.floor(position);
  const amount = position - index;
  const from = track.frames[index];
  const to = track.frames[Math.min(track.frames.length - 1, index + 1)];
  if (amount === 0 || from === to) {
    return from;
  }
  const objects: Record<string, AnimatorCapabilities.BoundObject> = {};
  for (const [id, object] of Object.entries(from.objects)) {
    const next = to.objects[id];
    objects[id] = next
      ? {
          ...object,
          position: mixVec(object.position, next.position, amount),
          radius: mixNumber(object.radius, next.radius, amount),
          opacity: mixNumber(object.opacity, next.opacity, amount),
        }
      : object;
  }
  const following = new Map(to.links.map((link) => [link.id, link]));
  const links = from.links.map((link) => {
    const next = following.get(link.id);
    return next && next.points.length === link.points.length
      ? { ...link, points: link.points.map((point, index) => mixVec(point, next.points[index], amount)) }
      : link;
  });
  return { objects, links };
};

/** What a parameter schema's bindings are: property name → `object` or `link` (`node` reads as `object`). */
export const bindingsOf = (schema: Record<string, unknown> | undefined): Record<string, 'object' | 'link'> => {
  const properties = schema?.properties;
  const result: Record<string, 'object' | 'link'> = {};
  if (typeof properties !== 'object' || properties === null) {
    return result;
  }
  for (const [name, property] of Object.entries(properties)) {
    const binding: unknown =
      typeof property === 'object' && property !== null ? Reflect.get(property, 'x-binding') : undefined;
    if (binding === 'object' || binding === 'node') {
      result[name] = 'object';
    } else if (binding === 'link') {
      result[name] = 'link';
    }
  }
  return result;
};

/**
 * The bindings among `params`, resolved against `binding`: ids that name nothing are left out, and a binding left
 * unset (or empty) binds every object or link, so an effect placed without bindings draws on the whole stage.
 */
export const resolveBound = (
  binding: AnimatorCapabilities.StageBinding,
  params: Record<string, unknown>,
  bindings: Record<string, 'object' | 'link'>,
): Record<string, Bound> => {
  const result: Record<string, Bound> = {};
  for (const [name, kind] of Object.entries(bindings)) {
    const value = params[name];
    const ids = (Array.isArray(value) ? value : [value]).filter((id): id is string => typeof id === 'string');
    if (kind === 'object') {
      result[name] = ids.length === 0 ? Object.values(binding.objects) : ids.flatMap((id) => binding.objects[id] ?? []);
    } else {
      const links = new Map(binding.links.map((link) => [link.id, link]));
      result[name] = ids.length === 0 ? binding.links : ids.flatMap((id) => links.get(id) ?? []);
    }
  }
  return result;
};
