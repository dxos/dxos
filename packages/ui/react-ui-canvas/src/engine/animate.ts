//
// Copyright 2026 DXOS.org
//

//
// The animated projection (ANIMATION.md §5.3, §5.4): wraps any projection so its scene is sampled at the view's clock,
// and turns an edit made away from the start into keys at the playhead. The timeline is the host's (an animator shot,
// plugin-animator F-2.3), never stored in the View, so keys leave through `onTimelineChange` rather than as intents.
// The surface is unchanged: it still sends intents and draws a `Scene`.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import {
  type AnimatableKind,
  type Clock,
  type Timeline,
  createTimeline,
  getPath,
  hasTrack,
  removePath,
  setKey,
  setPath,
} from '@dxos/animation';
import { type Node } from '@dxos/scene';

import { BASE_ANIMATABLE, type Intent, type NodeValues, type View, sampleView } from '../model/index.ts';
import { resizeNode } from '../utils/index.ts';
import { type Projection } from './projection.ts';

export type AnimateOptions = {
  registry: Registry.AtomRegistry;
  clock: Clock;
  /** The timeline that animates the scenes. */
  timeline: Atom.Atom<Timeline | undefined>;
  /** Takes the timeline with the keys an edit made; absent, nothing is keyed and every edit writes the base. */
  onTimelineChange?: (timeline: Timeline) => void;
  /** Whether an edit away from t = 0 keys the property (on by default, ANIMATION.md §5.4). */
  autoKey?: () => boolean;
  /** The animatable properties of a node's type; the shared ones (`center`, `size`, `style.opacity`) by default. */
  animatable?: (node: Node) => Readonly<Record<string, AnimatableKind>>;
};

/** Edits nearer the start than this are at t = 0. */
const START_EPSILON = 1e-6;

/**
 * `base` with its scene sampled at the clock's time and its intents rewritten into keys where §5.4 says they land. A
 * scene without a timeline, edited at t = 0, behaves exactly as `base` does.
 */
export const animate = (base: Projection, options: AnimateOptions): Projection => {
  const { registry, clock, onTimelineChange } = options;
  const scene = Atom.keepAlive(Atom.make((get) => sampleView(get(base.scene), get(options.timeline), get(clock.time))));
  return {
    ...base,
    scene,
    apply: (intent) => {
      // A host that takes no keys gets plain edits: nothing is keyed, so nothing is lost.
      const timeline = onTimelineChange ? registry.get(options.timeline) : undefined;
      const rewritten = rewriteIntent(registry.get(base.scene), timeline, intent, registry.get(clock.time), {
        autoKey: onTimelineChange ? options.autoKey : () => false,
        animatable: options.animatable,
      });
      if (rewritten.timeline !== timeline && rewritten.timeline) {
        onTimelineChange?.(rewritten.timeline);
      }
      if (rewritten.intent) {
        base.apply(rewritten.intent);
      }
    },
    constrain: base.constrain,
  };
};

/** What an intent becomes: the part written to the base (none when all of it was keyed), and the keyed timeline. */
export type RewrittenIntent = { intent?: Intent; timeline?: Timeline };

/**
 * Where `intent` lands on `scene` (the base, unsampled) at time `t` of `timeline`: unchanged at the start for
 * properties with no track, otherwise as keys at `t` (with auto-key) or as base values (without). Exported for tests.
 */
export const rewriteIntent = (
  scene: View,
  initial: Timeline | undefined,
  intent: Intent,
  t: number,
  { autoKey = () => true, animatable = () => BASE_ANIMATABLE }: Pick<AnimateOptions, 'autoKey' | 'animatable'> = {},
): RewrittenIntent => {
  const atStart = Math.abs(t) < START_EPSILON;
  const keying = autoKey();
  const shown = sampleView(scene, initial, t);
  let timeline: Timeline | undefined = initial;
  const rest: Intent[] = [];

  /** Whether `property` of `node` is keyed rather than written to the base. */
  const keys = (node: Node, property: string): boolean =>
    animatable(node)[property] !== undefined && (hasTrack(timeline, node.id, property) || (!atStart && keying));

  const key = (node: Node, property: string, value: unknown) => {
    timeline = setKey(timeline ?? createTimeline(), node.id, property, { t, value });
  };

  /**
   * `value` of `property` (a struct such as `style`) with each keyed field inside it written back as the base holds
   * it: a changed one is keyed instead, and an unchanged one is the sampled value, which must not reach the base.
   */
  const keyNested = (node: Node, property: string, value: unknown): unknown => {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    let next: unknown = value;
    for (const path of Object.keys(animatable(node))) {
      if (!path.startsWith(`${property}.`) || !keys(node, path)) {
        continue;
      }
      const field = path.slice(property.length + 1);
      const edited = getPath(value, field);
      if (edited !== undefined && getPath(node, path) !== edited) {
        key(node, path, edited);
      }
      const base = getPath(scene.nodes[node.id], path);
      next = base === undefined ? removePath(next, field) : setPath(next, field, base);
    }
    return next;
  };

  const visit = (intent: Intent): void => {
    switch (intent.kind) {
      case 'move': {
        const plain: string[] = [];
        for (const id of intent.ids) {
          const node = shown.nodes[id];
          if (!node || node.locked) {
            continue;
          }
          if (keys(node, 'center')) {
            key(node, 'center', { x: node.center.x + intent.delta.x, y: node.center.y + intent.delta.y });
          } else {
            plain.push(id);
          }
        }
        if (plain.length === intent.ids.length) {
          rest.push(intent);
        } else if (plain.length > 0) {
          rest.push({ ...intent, ids: plain });
        }
        return;
      }
      case 'resize': {
        const node = shown.nodes[intent.id];
        if (!node || node.locked) {
          return;
        }
        const resized = resizeNode(node, intent.bounds);
        const center = keys(node, 'center');
        const size = keys(node, 'size');
        if (!center && !size) {
          rest.push(intent);
          return;
        }
        if (center) {
          key(node, 'center', resized.center);
        } else {
          rest.push(update(node.id, { center: resized.center }));
        }
        if (size) {
          key(node, 'size', resized.size);
        } else {
          rest.push(update(node.id, { size: resized.size }));
        }
        return;
      }
      case 'update': {
        const node = shown.nodes[intent.id];
        if (!node) {
          rest.push(intent);
          return;
        }
        const values: Record<string, unknown> = {};
        for (const [property, value] of Object.entries(intent.values)) {
          if (keys(node, property) && getPath(node, property) !== value) {
            key(node, property, value);
          } else {
            values[property] = keyNested(node, property, value);
          }
        }
        if (Object.keys(values).length > 0) {
          rest.push(update(node.id, values));
        }
        return;
      }
      case 'batch':
        intent.intents.forEach(visit);
        return;
      default:
        rest.push(intent);
    }
  };

  visit(intent);
  return {
    ...(rest.length === 0 ? {} : { intent: rest.length === 1 ? rest[0] : { kind: 'batch', intents: rest } }),
    timeline,
  };
};

const update = (id: string, values: NodeValues): Intent => ({ kind: 'update', id, values });
