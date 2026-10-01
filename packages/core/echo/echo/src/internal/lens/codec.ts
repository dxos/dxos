//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { EntityId } from '@dxos/keys';

import * as Obj from '../../Obj.ts';
import * as Type from '../../Type.ts';
import { EntityKind, KindId } from '../common/types/index.ts';
import { canonical, endpointOf, nameOf, planDigest } from './identity.ts';
import { plan as compile, readSource } from './mapping.ts';
import { getOverlay } from './overlay.ts';
import {
  type AnyLens,
  type CodedMapping,
  type Lens,
  LensTypeId,
  type MakeOptions,
  type Mapping,
  type Plan,
  type ResolvedEntry,
  type Write,
} from './types.ts';

const read = (obj: Obj.Unknown | Obj.Snapshot) => (property: string) => Obj.getValue(obj, [property]);

/**
 * Project a base object through a compiled plan. Exported for {@link Lens.compose}, which builds a
 * plan whose entries chain through more than one lens but still applies it this same way — there is
 * only ever one write-set mechanism, not one per hop.
 */
export const project = (obj: Obj.Unknown | Obj.Snapshot, id: string, plan: Plan): Record<string, unknown> => {
  const view: Record<string, unknown> = { id: (obj as { id: string }).id };
  for (const entry of plan.entries) {
    const value = entry.get(readSource(read(obj), entry.from));
    if (value !== undefined) {
      view[entry.property] = value;
    }
  }
  for (const property of plan.overlays) {
    const value = getOverlay(obj, id, property);
    if (value !== undefined) {
      view[property] = value;
    }
  }
  return view;
};

/** Invert a view against a compiled plan into minimal writes. Exported for {@link Lens.compose} — see {@link project}. */
export const invert = (view: Record<string, unknown>, obj: Obj.Unknown, id: string, plan: Plan): readonly Write[] => {
  const byProperty = new Map<string, ResolvedEntry>(plan.entries.map((entry) => [entry.property, entry]));
  const overlays = new Set(plan.overlays);
  const writes: Write[] = [];

  for (const [property, value] of Object.entries(view)) {
    if (property === 'id') {
      continue;
    }

    const entry = byProperty.get(property);
    if (entry) {
      if (!entry.put) {
        // Dropping the write silently is the worst outcome: the UI would show a value the object
        // never received. A read-only property must be visibly read-only, so this is loud.
        throw new TypeError(`Lens: "${property}" is read-only.`);
      }
      const changed = entry.put(value, readSource(read(obj), entry.from));
      for (const [target, next] of Object.entries(changed)) {
        writes.push({ kind: 'assign', path: [target], value: next });
      }
      continue;
    }

    if (overlays.has(property)) {
      writes.push({ kind: 'overlay', lens: id, property, value });
      continue;
    }

    throw new TypeError(`Lens: "${property}" is not a property of the target, or is unmapped.`);
  }

  return writes;
};

/**
 * Define a lens between a source ECHO type and a declared target type. It is named by the two types,
 * and there is at most one lens per pair.
 *
 * The mapping is partial: a target property with a same-named, type-compatible source property maps
 * itself, and one with no counterpart stores itself in the object's annotation dictionary. Neither
 * convenience is silent — `Lens.coverage` reports what was decided.
 */
export const make = <S extends Type.AnyObj, T extends Type.AnyObj | Schema.Top>(
  source: S,
  target: T,
  mapping: Mapping<Type.InstanceType<S>, TargetOf<T>> = {},
  options: MakeOptions = {},
): Lens<Type.InstanceType<S>, TargetOf<T>> => {
  const name = nameOf(source, target);
  const plan = compile(source, target, mapping as Mapping);
  const defaults = options.defaults ?? {};
  return {
    [LensTypeId]: LensTypeId,
    [KindId]: EntityKind.Lens,
    id: EntityId.random(),
    name,
    digest: planDigest(source, target, plan, defaults),
    overlayKey: name,
    defaults,
    source,
    target,
    plan,
    get: (obj) => project(obj, name, plan) as TargetOf<T>,
    put: (view, obj) => invert(view as Record<string, unknown>, obj, name, plan),
  };
};

/**
 * Define a lens whose transform is opaque — parsing, tree construction, serialization: anything no
 * per-property mapping can express. Indistinguishable from `make` to every consumer.
 */
export const coded = <S extends Type.AnyObj, T extends Type.AnyObj | Schema.Top>(
  source: S,
  target: T,
  mapping: CodedMapping<Type.InstanceType<S>, TargetOf<T>>,
): Lens<Type.InstanceType<S>, TargetOf<T>> => {
  const name = nameOf(source, target);
  return {
    [LensTypeId]: LensTypeId,
    [KindId]: EntityKind.Lens,
    id: EntityId.random(),
    name,
    digest: canonical({
      source: Type.getURI(source),
      target: endpointOf(target),
      version: mapping.version ?? null,
      code: `${mapping.get}\n${mapping.put}`,
    }),
    overlayKey: name,
    defaults: {},
    source,
    target,
    get: (obj) => mapping.get(obj as Type.InstanceType<S>),
    put: (view, obj) => mapping.put(view, mapping.get(obj as Type.InstanceType<S>), obj as Type.InstanceType<S>),
  };
};

/** The instance type a target declares, whether it is an ECHO type or a plain schema. */
export type TargetOf<T> = T extends Type.AnyObj
  ? Type.InstanceType<T>
  : T extends Schema.Codec<infer A, any, any>
    ? A
    : never;

/** Project the base object into the target shape (a detached snapshot; see `of` for a live view). */
export const get = <S, T>(obj: Obj.Unknown, lens: Lens<S, T>): T => lens.get(obj);

/** The writes a partial view would produce, without applying them. */
export const writes = (obj: Obj.Unknown, lens: AnyLens, view: Record<string, unknown>): readonly Write[] =>
  lens.put(view, obj);
