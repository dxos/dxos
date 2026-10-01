//
// Copyright 2026 DXOS.org
//

import { EntityId } from '@dxos/keys';

import type * as Obj from '../../Obj.ts';
import * as Type from '../../Type.ts';
import { EntityKind, KindId } from '../common/types/index.ts';
import { invert as invertPlan, project } from './codec.ts';
import { canonical, nameOf } from './identity.ts';
import { readSource } from './mapping.ts';
import { type AnyLens, type Coverage, LensTypeId, type Plan, type ResolvedEntry } from './types.ts';

//
// Composing two lenses end to end, `first.source -> first.target (= second.source) -> second.target`,
// by chaining their COMPILED ENTRIES rather than nesting `get`/`put` calls. The intermediate value is
// never a real ECHO object — nothing persists it — and every existing reader (`Obj.getValue`, the
// overlay dictionary) needs one. Building a single plan whose entries read straight through to the
// ORIGINAL base object's own properties sidesteps that (see `chainedEntry`), and gets the composed
// lens the same `Lens.of` fast path, and the same overlay id, as a hand-written lens would have.
//

/** The `first`-stage entry that produces one property of the intermediate shape, if there is a plain one. */
const midEntry = (first: AnyLens, property: string): ResolvedEntry | undefined =>
  first.plan?.entries.find((candidate) => candidate.property === property);

/**
 * Chain a `second`-stage entry back through `first`'s entries, so it reads and writes `first`'s
 * SOURCE properties directly instead of a hypothetical intermediate object.
 *
 * Throws at compose time (not read/write time) when `second` depends on an intermediate property that
 * `first` only overlays or does not map at all — there is then no plain read path through both hops,
 * which is exactly what {@link compose} requires.
 */
const chainedEntry = (first: AnyLens, second: AnyLens, entry: ResolvedEntry): ResolvedEntry => {
  const steps = entry.from.map((name) => {
    const step = midEntry(first, name);
    if (!step) {
      throw new TypeError(
        `Lens.compose: "${second.name}" reads "${name}" from "${first.name}", which has no plain mapping for it ` +
          '(only an overlay or an unmapped property) — composition needs a direct read path through every hop.',
      );
    }
    return step;
  });

  /** Recompute just the intermediate properties this entry needs, from the ultimate source values. */
  const readMid = (source: Record<string, unknown>): Record<string, unknown> => {
    const mid: Record<string, unknown> = {};
    for (const step of steps) {
      mid[step.property] = step.get(readSource((name) => source[name], step.from));
    }
    return mid;
  };

  // Captured, not re-read from `entry` in the closure: the guard proves it exists here, which a
  // later `entry.put` access cannot (mirrors `mapping.ts`'s `entryFor`).
  const put = entry.put;
  return {
    property: entry.property,
    from: [...new Set(steps.flatMap((step) => step.from))],
    get: (source) => entry.get(readMid(source)),
    put:
      put &&
      ((value, source) => {
        const patch: Record<string, unknown> = {};
        for (const [midProperty, midValue] of Object.entries(put(value, readMid(source)))) {
          const step = midEntry(first, midProperty);
          if (step?.put) {
            Object.assign(
              patch,
              step.put(
                midValue,
                readSource((name) => source[name], step.from),
              ),
            );
          }
        }
        return patch;
      }),
    origin: entry.origin,
  };
};

/**
 * Compose two lenses into one from `first`'s source directly to `second`'s target.
 *
 * Both must be declarative ({@link make}, not {@link coded}): a coded lens's `get`/`put` are opaque
 * functions over a real ECHO object, and the intermediate value here is never one. `first.target` and
 * `second.source` must name the same declared type — by `typename@version`, not by reference — so a
 * lens found by `Lens.findPath` composes exactly like one written by hand.
 *
 * A property `second` overlays (no counterpart on the intermediate shape) still reads and writes under
 * `second`'s own id on the ORIGINAL base object: composing never re-homes an overlay under a synthetic
 * id, which is also why the composed lens keeps `second`'s overlay key.
 */
export const compose = (first: AnyLens, second: AnyLens): AnyLens => {
  if (!first.plan || !second.plan) {
    throw new TypeError(
      `Lens.compose: "${first.name}" and "${second.name}" must both be declarative lenses; a coded lens has no ` +
        'per-property mapping to compose through.',
    );
  }
  const target = first.target;
  if (!Type.isType(target) || !Type.isObject(target) || Type.getURI(target) !== Type.getURI(second.source)) {
    throw new TypeError(`Lens.compose: "${first.name}" targets a different type than "${second.name}" sources.`);
  }

  const entries = second.plan.entries.map((entry) => chainedEntry(first, second, entry));

  // A property is dropped from the composed view either because `first` never read it at all, or
  // because it fed a mid-level property that `second` never reads — either way it never reaches `T`.
  const droppedFromFirst = new Set(first.plan.coverage.dropped);
  const droppedViaSecond = new Set<string>();
  for (const property of second.plan.coverage.dropped) {
    const step = midEntry(first, property);
    if (step) {
      for (const name of step.from) {
        droppedViaSecond.add(name);
      }
    }
  }
  const coverage: Coverage = {
    explicit: second.plan.coverage.explicit,
    automatic: second.plan.coverage.automatic,
    overlaid: second.plan.coverage.overlaid,
    suspicious: second.plan.coverage.suspicious,
    dropped: [...new Set([...droppedFromFirst, ...droppedViaSecond])].sort(),
  };

  const plan: Plan = { entries, overlays: second.plan.overlays, coverage };

  return {
    [LensTypeId]: LensTypeId,
    [KindId]: EntityKind.Lens,
    id: EntityId.random(),
    name: nameOf(first.source, second.target),
    digest: canonical([first.digest, second.digest]),
    overlayKey: second.overlayKey,
    defaults: { ...first.defaults, ...second.defaults },
    source: first.source,
    target: second.target,
    plan,
    get: (obj: Obj.Unknown) => project(obj, second.overlayKey, plan),
    put: (view: Record<string, unknown>, obj: Obj.Unknown) => invertPlan(view, obj, second.overlayKey, plan),
  };
};
