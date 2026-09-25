//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { ChangeId, SchemaId, TypeEntityId, TypeId } from '@dxos/echo/internal';

import { getOverlay } from './overlay.ts';
import { type AnyLens, type Lens } from './types.ts';
import { applyWrites } from './write.ts';

//
// The live handle. There is only ever ONE object in the database: this is a view of it, not a copy.
// Reads project through the mapping, writes invert onto the base object's own properties, and identity
// is never lensed — `Obj.getURI` still resolves to the base object.
//

/**
 * A lensed object reports the TARGET's type, which is what makes the whole approach pay: everything
 * that dispatches on typename (surfaces, forms, cards, the navtree) resolves the interface already
 * written for the target type, with no changes to that interface.
 */
const typeIdentity = (lens: AnyLens): Map<symbol, unknown> => {
  const identity = new Map<symbol, unknown>();
  const target = lens.target as Type.AnyEntity;
  if (Type.isType(target)) {
    identity.set(SchemaId, Type.getSchema(target));
    identity.set(TypeId, Type.getURI(target));
    identity.set(TypeEntityId, target);
  }
  return identity;
};

/**
 * View a live object through a lens.
 *
 * The result satisfies the ordinary `Obj.*` API — including `Obj.update`, which batches every
 * assignment made in its callback into a single change against the base object, writing only the
 * properties that were actually assigned.
 */
export const of = <S, T extends Record<string, any>>(obj: Obj.Unknown, lens: Lens<S, T>): Obj.OfShape<T> => {
  const identity = typeIdentity(lens);
  const mapped = new Set(lens.plan?.entries.map((entry) => entry.property) ?? []);
  const overlays = new Set(lens.plan?.overlays ?? []);
  const readEntry = new Map(lens.plan?.entries.map((entry) => [entry.property, entry]) ?? []);

  /** One transaction for the whole callback: record assignments, then invert them together. */
  const change = (callback: (draft: any) => void): void => {
    const recorded: Record<string, unknown> = {};
    const draft = new Proxy(Object.create(null), {
      // A read must observe a write recorded earlier in the same callback; `view` reads the base
      // object, which has not been written yet.
      get: (_target, property) =>
        typeof property !== 'string' ? undefined : property in recorded ? recorded[property] : view(property),
      set: (_target, property, value) => {
        if (typeof property !== 'string') {
          return false;
        }
        recorded[property] = value;
        return true;
      },
      deleteProperty: (_target, property) => {
        if (typeof property !== 'string') {
          return false;
        }
        recorded[property] = undefined;
        return true;
      },
      has: (_target, property) => typeof property === 'string' && (mapped.has(property) || overlays.has(property)),
      ownKeys: () => [...mapped, ...overlays],
      getOwnPropertyDescriptor: (_target, property) => ({
        enumerable: true,
        configurable: true,
        writable: true,
        // Without a value the descriptor completes to `undefined`, so spreading the draft would erase
        // every property it copies.
        value: typeof property !== 'string' ? undefined : property in recorded ? recorded[property] : view(property),
      }),
    });

    callback(draft);
    applyWrites(obj, lens.put(recorded as Partial<T>, obj));
  };

  const view = (property: string): unknown => {
    if (property === 'id') {
      return (obj as { id: string }).id;
    }
    const entry = readEntry.get(property);
    if (entry) {
      const source: Record<string, unknown> = {};
      for (const name of entry.from) {
        source[name] = Obj.getValue(obj, [name]);
      }
      return entry.get(source);
    }
    if (overlays.has(property)) {
      return getOverlay(obj, lens.id, property);
    }
    // A coded lens has no per-property plan, so its whole view is recomputed and read from.
    if (!lens.plan) {
      return (lens.get(obj) as Record<string, unknown>)[property];
    }
    return undefined;
  };

  const known = (property: string | symbol): boolean =>
    typeof property === 'string' && (property === 'id' || mapped.has(property) || overlays.has(property));

  return new Proxy(obj, {
    get: (target, property, receiver) => {
      if (property === ChangeId) {
        return change;
      }
      if (typeof property === 'symbol') {
        return identity.has(property) ? identity.get(property) : Reflect.get(target, property, receiver);
      }
      if (known(property) || !lens.plan) {
        return view(property);
      }
      // Everything not in the target shape — `toJSON`, prototype members — stays the base object's.
      return Reflect.get(target, property, receiver);
    },
    set: () => {
      // Matching ECHO's own semantics: direct mutation outside a change transaction is an error, not
      // a silent write.
      throw new Error('Lens: mutate a lensed object inside Obj.update().');
    },
    has: (target, property) => known(property) || Reflect.has(target, property),
    ownKeys: () => ['id', ...mapped, ...overlays],
    getOwnPropertyDescriptor: (target, property) =>
      known(property)
        ? { enumerable: true, configurable: true, value: view(property as string), writable: true }
        : Reflect.getOwnPropertyDescriptor(target, property),
  }) as unknown as Obj.OfShape<T>;
};

/** The schema of the lensed shape, for a form or table rendering the target. */
export const targetSchema = (lens: AnyLens): Schema.Top => {
  const target = lens.target as Type.AnyEntity;
  return Type.isType(target) ? (Type.getSchema(target) as Schema.Top) : (lens.target as Schema.Top);
};
