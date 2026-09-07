//
// Copyright 2024 DXOS.org
//

import * as Equal from 'effect/Equal';
import * as Hash from 'effect/Hash';
import * as Schema from 'effect/Schema';
import { type InspectOptionsStylized } from 'node:util';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { SchemaAST } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import { getSchemaURI } from '../../Annotation/annotations';
import { isEntity } from '../../Entity/guard';
import { toEffectSchema } from '../../JsonSchema/json-schema';
import { ObjectDeletedId, ParentId, SchemaId, StaticTypeSchemaSlot, TypeEntityId, TypeId } from '../types';
import { executeChange, queueNotification } from './change-context';
import { defineHiddenProperty } from './define-hidden-property';
import { createTextMethodError } from './errors';
import { batchEvents } from './event-batch';
import {
  changeKeyOf,
  getEchoRoot,
  getOwner,
  getRawTarget,
  hasForeignOwner,
  notifyOwnerChain,
  setOwnerRecursive,
  wouldCreateCycle,
} from './ownership';
import { type ReactiveHandler, objectData } from './proxy-types';
import {
  assertMutable,
  createProxy,
  isProxy,
  isReactiveRecord,
  isValidProxyTarget,
  normalizeSpliceRange,
  symbolReactivePrototype,
} from './proxy-utils';
import { ReactiveArray } from './reactive-array';
import { SchemaValidator, assertsWithDetail } from './schema-validator';
import { ChangeId, ChangeKeyId, EventId } from './symbols';

// Re-export for external consumers.
export { getEchoRoot, setMetaOwner } from './ownership';

type ProxyTarget = {
  /**
   * Typename or type DXN.
   */
  [TypeId]: string;

  /**
   * Schema for the root.
   */
  [SchemaId]: Schema.Top;
  [ParentId]?: any;

  /**
   * For modifications.
   */
  [EventId]: Event<void>;
} & ({ [key: keyof any]: any } | any[]);

/**
 * Deep copy a value, handling arrays and nested objects.
 * Preserves ReactiveArray type and hidden properties (SchemaId, TypeId).
 * Does not copy class instances or functions (except ReactiveArray).
 *
 * Note: Cannot use structuredClone because we need to:
 * - Unwrap proxies
 * - Preserve ReactiveArray instances
 * - Copy Symbol-keyed hidden properties (SchemaId, TypeId)
 * - Convert plain arrays to ReactiveArray
 *
 * Performance: O(n) where n is the total number of nested objects/arrays.
 * For large structures, consider using Refs for frequently reassigned subtrees.
 */
const deepCopy = <T>(value: T, visited = new Map<object, object>()): T => {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  // Handle proxies - get the underlying target.
  const actualValue = getRawTarget(value);

  // Check for circular references in the copy.
  if (visited.has(actualValue)) {
    return visited.get(actualValue) as T;
  }

  // Handle ReactiveArray specially to preserve reactivity.
  if (actualValue instanceof ReactiveArray) {
    const copy = new ReactiveArray<any>();
    visited.set(actualValue, copy);
    for (const item of actualValue) {
      copy.push(deepCopy(item, visited));
    }
    // Copy hidden properties.
    copyHiddenProperties(actualValue, copy);
    return copy as T;
  }

  // Don't copy other class instances (objects with non-Object prototype). A reactive record
  // (its metadata moved onto a behaviour prototype) still counts as a plain data record here.
  const proto = Object.getPrototypeOf(actualValue);
  if (proto !== Array.prototype && proto !== null && !isReactiveRecord(actualValue)) {
    return value; // Return as-is, don't copy class instances.
  }

  if (Array.isArray(actualValue)) {
    // Plain arrays become ReactiveArrays.
    const copy = new ReactiveArray<any>();
    visited.set(actualValue, copy);
    for (const item of actualValue) {
      copy.push(deepCopy(item, visited));
    }
    return copy as T;
  }

  const copy: Record<string, any> = {};
  visited.set(actualValue, copy);
  for (const key of Object.keys(actualValue)) {
    copy[key] = deepCopy((actualValue as any)[key], visited);
  }
  // Copy hidden properties (SchemaId, TypeId).
  copyHiddenProperties(actualValue, copy);
  return copy as T;
};

/**
 * Write `value` at `path`, unwrapping each hop to its raw target. A nested record is stored as its
 * sub-proxy, and writing through one would re-impose the per-delta validation the text path exists to
 * skip.
 */
const setDeepOnRawTargets = (target: object, path: readonly (string | number)[], value: unknown): void => {
  let parent: any = getRawTarget(target);
  for (const key of path.slice(0, -1)) {
    parent = getRawTarget(parent[key]);
  }
  parent[path[path.length - 1]] = value;
};

/**
 * Copy hidden properties (SchemaId, TypeId) from source to target.
 */
const copyHiddenProperties = (source: any, target: any): void => {
  if (SchemaId in source) {
    defineHiddenProperty(target, SchemaId, source[SchemaId]);
  }
  if (TypeId in source) {
    defineHiddenProperty(target, TypeId, source[TypeId]);
  }
};

//
// Object layering for an in-memory typed reactive object (`TypedReactiveHandler`).
//
// Unlike the database-backed handler (echo-client/echo-prototypes.ts), here USER DATA lives as
// real OWN properties on the target — there is no document behind it. Only the per-object metadata
// is relocated onto a prototype, so swapping handlers doesn't disturb the data shape:
//
//   proxy ──Proxy(target, REACTIVE_PROXY_HANDLER → TypedReactiveHandler)
//     │         set/has/... traps run here; there is no `get` trap, so reads land on the target
//     ▼
//   target            the user's object. OWN enumerable props = user data ({ name, age, ... });
//     │ [[Prototype]] OWN symbol props are removed by `compactMetadataToInstanceState` after init.
//     ▼
//   instanceState     `Object.create(TypedObjectPrototype)`. Holds the relocated symbol-keyed
//     │ [[Prototype]] metadata as hidden props: [EventId] (root only), [ObjectDeletedId], [SchemaId],
//     │               [TypeId], [TypeEntityId], cached [StaticTypeSchemaSlot], ... (Arrays are
//     │               exempt — they keep their ReactiveArray chain and are never compacted.)
//     ▼
//   TypedObjectPrototype     shared behaviour. Carries [symbolReactivePrototype]=true (so the
//     │ [[Prototype]] "plain object" gates still treat the record as data) plus the system
//     │               accessors [objectData], [ChangeId], [StaticTypeSchemaSlot]; the get trap
//     │               delegates to these via `isBehaviourAccessor` instead of switching.
//     ▼
//   Object.prototype ──▶ null     a `getPrototypeOf` trap reports `Object.prototype` so consumers
//                     see a plain object; the real instanceState prototype stays hidden.
//
// Root vs nested: a root object owns an `[EventId]`; nested records share their root's reactivity
// and have none. That presence is the "is this an initialized root" signal (it replaced an earlier
// `[ChangeId] === true` marker).
//
// `this` in the accessors below: the get trap calls `Reflect.get(target, prop, receiver)`, so
// `this` is the PROXY (receiver) on the common path, or the raw target when read directly.
// `getRawTarget(this)` normalizes to the underlying target — needed here because user data and the
// metadata chain both hang off the raw target, and `executeChange` keys the change context by it.
//
/**
 * Behaviour prototype for typed reactive records. A record's per-object metadata is moved onto an
 * intermediate instance-state object whose prototype is this, so that swapping the handler that
 * backs an object (e.g. an in-memory object becoming database-backed) is a prototype re-point that
 * doesn't perturb the target's own-property shape. Marked as a reactive prototype so the "plain
 * object" gates (`isValidProxyTarget` / `deepCopy`) still treat such targets as data records.
 */
const TypedObjectPrototype: object = Object.create(Object.prototype);
defineHiddenProperty(TypedObjectPrototype, symbolReactivePrototype, true);

// The ECHO system surface is exposed as accessors on the behaviour prototype rather than as
// branches in the `get` trap. `this` is the proxy receiver (or the raw target when read directly);
// `getRawTarget` resolves either to the underlying target.
Object.defineProperties(TypedObjectPrototype, {
  // TODO(burdon): Remove?
  [objectData]: {
    get(this: ProxyTarget) {
      return toJSON(getRawTarget(this));
    },
  },
  [ChangeKeyId]: {
    get(this: ProxyTarget) {
      return changeKeyOf(this);
    },
  },
  [ChangeId]: {
    // A function that runs a mutation inside a controlled change context. Only root objects (which
    // own an `EventId`) expose one; nested records share their root's reactivity and return undefined.
    get(this: ProxyTarget) {
      const target = getRawTarget(this);
      if (!(EventId in target)) {
        return undefined;
      }
      return (callback: (obj: any) => void) => executeChange(target, target, this, callback);
    },
  },
  // Effect `Hash`/`Equal` traits, keyed by entity id: an entity has exactly one live proxy, and the
  // bare `id` spells that invariant without the throw a derived URI risks on a malformed id.
  // Effect's structural default would instead deep-read the record and go stale on the next mutation.
  // Selected by the `[KindId]` brand, not by the presence of an `id`, since a nested record sharing
  // this prototype may carry an application-level one; those keep reference identity.
  [Hash.symbol]: {
    get(this: ProxyTarget) {
      const target = getRawTarget(this);
      return () => (isEntity(target) ? Hash.hash(target.id) : Hash.random(target));
    },
  },
  [Equal.symbol]: {
    get(this: ProxyTarget) {
      const target = getRawTarget(this);
      return isEntity(target)
        ? (that: unknown) => isEntity(that) && that.id === target.id
        : (that: unknown) => getRawTarget(that) === target;
    },
  },
  [StaticTypeSchemaSlot]: {
    // Lazily rebuild the source Effect Schema from `jsonSchema` and cache it as an own (hidden)
    // property so subsequent reads short-circuit this accessor; the set-trap deletes the cache when
    // `jsonSchema` is mutated.
    get(this: ProxyTarget) {
      const target = getRawTarget(this);
      const jsonSchema = (target as any).jsonSchema;
      if (jsonSchema == null) {
        return undefined;
      }
      const rebuilt = toEffectSchema(jsonSchema);
      defineHiddenProperty(target, StaticTypeSchemaSlot, rebuilt);
      return rebuilt;
    },
  },
});

/** True if `prop` resolves to an accessor on the behaviour-prototype chain (not an own property). */
const isBehaviourAccessor = (target: object, prop: symbol): boolean => {
  let proto = Object.getPrototypeOf(target);
  while (proto != null && proto !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (descriptor != null) {
      return descriptor.get != null;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return false;
};

/**
 * True once the root owns an `[EventId]`, i.e. is past construction and notifies on change. The
 * read-only gate itself lives in the shared proxy handler (`assertMutable`), keyed by `[ChangeKeyId]`.
 */
const isInitialized = (echoRoot: object): boolean => EventId in echoRoot;

/**
 * Move a record's per-object metadata (symbol-keyed hidden properties) onto a fresh instance-state
 * object inserted between the target and {@link TypedObjectPrototype}. The target keeps only its
 * user data as own properties. Arrays are exempt — they keep their own (ReactiveArray) prototype chain.
 */
const compactMetadataToInstanceState = (target: ProxyTarget): void => {
  if (Array.isArray(target) || Object.getPrototypeOf(target) !== Object.prototype) {
    return;
  }
  const state = Object.create(TypedObjectPrototype);
  for (const symbol of Object.getOwnPropertySymbols(target)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, symbol)!;
    Object.defineProperty(state, symbol, descriptor);
    // Non-configurable symbols (e.g. `SchemaId`/`TypeId`, locked by `setSchema`/`setTypename` on
    // objects decoded from JSON) cannot be deleted — leave them as an own property on the target,
    // shadowing the copy on `state`; reads still resolve correctly since own properties take
    // precedence over the prototype chain.
    if (descriptor.configurable) {
      // Dynamic delete over arbitrary symbol keys: `ProxyTarget` declares these as required, so the
      // statically-typed view cannot express deleting them; the symbol set is only known at runtime.
      delete (target as any)[symbol];
    }
  }
  Object.setPrototypeOf(target, state);
};

/**
 * Typed in-memory reactive store (with Schema).
 * Reactivity is based on Event subscriptions, not signals.
 */
export class TypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance: ReactiveHandler<any> = new TypedReactiveHandler();

  readonly _proxyMap = new WeakMap<object, any>();
  private _inSet = false;

  private constructor() {}

  init(target: ProxyTarget): void {
    assertArgument(typeof target === 'object' && target !== null, 'target');
    invariant(SchemaId in target, 'Schema is not defined for the target');

    // Only set EventId on root objects (those without an owner).
    // Nested objects share their root's EventId for centralized reactivity.
    const hasOwner = !!getOwner(target);
    if (!(EventId in target) && !hasOwner) {
      defineHiddenProperty(target, EventId, new Event());
    }

    // Default to not-deleted, but preserve a deletion marker already stamped on the target (e.g. by
    // `objectFromJSON` when hydrating a tombstone snapshot).
    if (!(ObjectDeletedId in target)) {
      defineHiddenProperty(target, ObjectDeletedId, false);
    }

    // Only set owners if this is a root object (no existing owner).
    // Nested objects already have owners set by their root's initialization.
    // If we re-set owners here for nested objects, we'd incorrectly point
    // array elements to the array instead of the true root ECHO object.
    if (!hasOwner) {
      // Set owner on all nested objects to this root ECHO object.
      // All nested records point directly to this root for centralized reactivity.
      for (const key in target) {
        if (isProxy(target)) {
          continue;
        }
        let value = (target as any)[key];
        if (isValidProxyTarget(value) || isProxy(value)) {
          // Deep copy values that have foreign owners (owned by a different object,
          // or are root ECHO objects whose nested structures would be owned by them).
          // This recursively checks all nested objects.
          if (hasForeignOwner(value, target)) {
            value = deepCopy(value);
            (target as any)[key] = value;
          }
          setOwnerRecursive(value, target);
        }
      }
    }

    // Maybe have been set by `create`.
    Object.defineProperty(target, inspectCustom, {
      enumerable: false,
      configurable: true,
      value: this._inspect.bind(target),
    });

    // Relocate per-object metadata onto an instance-state prototype, leaving only user data as own
    // properties on the target. Done last so all metadata set above (and by `prepareTypedTarget`) moves.
    compactMetadataToInstanceState(target);

    // After compaction and ownership, so each child is stamped and owned before it gets a proxy of its
    // own. Recursive: wrapping a child runs its `init`, which wraps that child's children.
    this._wrapNestedValues(target);
  }

  /**
   * Replaces every raw nested record and array on the target with the sub-proxy a read returns, so a
   * forwarded read hands out the same reactive view the `get` trap used to build. Class instances,
   * `Ref`s and primitives are not proxy targets and stay as they are.
   */
  private _wrapNestedValues(target: ProxyTarget): void {
    for (const key of Object.keys(target)) {
      // The descriptor first: reading an own getter here would invoke it, and a type entity's
      // `jsonSchema` getter can reach a schema still inside its own `const` initializer.
      if (Object.getOwnPropertyDescriptor(target, key)?.get) {
        continue;
      }
      const value = (target as any)[key];
      if (isValidProxyTarget(value)) {
        (target as any)[key] = createProxy(value, this);
      }
    }
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    const echoRoot = getEchoRoot(target);
    const initialized = isInitialized(echoRoot);

    let result: boolean = false;
    this._inSet = true;
    try {
      batchEvents(() => {
        const { echoRoot: _, preparedValue } = this._prepareValueForAssignment(target, prop, value);
        result = Reflect.set(target, prop, preparedValue, receiver);
        // Invalidate the cached source Effect Schema when `jsonSchema` changes
        // (e.g. `Type.addFields`) so `Type.getSchema` rebuilds from the new shape.
        if (prop === 'jsonSchema') {
          Reflect.deleteProperty(target, StaticTypeSchemaSlot);
        }
        // Queue notification instead of emitting immediately (batched).
        if (initialized) {
          queueNotification(echoRoot);
          // Also notify the owner chain so parent objects are updated when nested objects change.
          notifyOwnerChain(target);
        }
      });
    } finally {
      this._inSet = false;
    }
    return result;
  }

  deleteProperty(target: ProxyTarget, property: string | symbol): boolean {
    const echoRoot = getEchoRoot(target);

    const initialized = isInitialized(echoRoot);
    const result = Reflect.deleteProperty(target, property);
    if (initialized) {
      queueNotification(echoRoot);
    }
    return result;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const echoRoot = getEchoRoot(target);
    const initialized = isInitialized(echoRoot);

    const { echoRoot: _, preparedValue } = this._prepareValueForAssignment(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: preparedValue,
    });
    if (!this._inSet && initialized) {
      // Queue notification instead of emitting immediately (batched).
      queueNotification(echoRoot);
    }
    return result;
  }

  textUpdate(target: ProxyTarget, path: readonly (string | number)[], newText: string): void {
    this._applyTextMutation(target, 'update', path, () => newText);
  }

  textSplice(
    target: ProxyTarget,
    path: readonly (string | number)[],
    start: number,
    deleteCount: number,
    insert: string,
  ): string {
    let removed = '';
    this._applyTextMutation(target, 'splice', path, (current) => {
      const range = normalizeSpliceRange(current.length, start, deleteCount);
      removed = current.slice(range.start, range.start + range.deleteCount);
      return current.slice(0, range.start) + insert + current.slice(range.start + range.deleteCount);
    });
    return removed;
  }

  /**
   * Shared read-modify-write for the in-memory string CRDT path. A method call is invisible to the proxy,
   * so it runs the same `assertMutable` gate the traps run, then mutates and notifies through the same
   * batched notification path so reactivity fires.
   *
   * Writes on the raw targets, intentionally bypassing `_prepareValueForAssignment` /
   * `_validateValue`: a string CRDT delta produces a string, and per-delta schema checks (pattern,
   * maxLength) would reject valid intermediate states during incremental edits. Such constraints are
   * enforced at the initial assignment or as application-level invariants, mirroring the Automerge path.
   */
  private _applyTextMutation(
    target: ProxyTarget,
    method: string,
    path: readonly (string | number)[],
    compute: (current: string) => string,
  ): void {
    assertMutable(target, method, createTextMethodError);

    const echoRoot = getEchoRoot(target);
    const keyPath = [...path];
    invariant(keyPath.length > 0, 'Text path must be non-empty');
    const current = getDeep(target, keyPath);
    if (typeof current !== 'string') {
      throw new TypeError(`Text mutation target at "${keyPath.join('.')}" is not a string.`);
    }

    const next = compute(current);
    batchEvents(() => {
      // Write directly on the raw target (not the proxy) and notify through the same batched path
      // the `set` trap uses, so subscribers fire once per `Obj.update`.
      setDeepOnRawTargets(target, keyPath, next);
      queueNotification(echoRoot);
      notifyOwnerChain(target);
    });
  }

  /**
   * Prepare a value for assignment to a typed object property.
   * Handles cycle detection, copy-on-assign, array conversion, validation, and ownership.
   */
  private _prepareValueForAssignment(
    target: ProxyTarget,
    prop: string | symbol,
    value: any,
  ): { echoRoot: object; preparedValue: any } {
    const echoRoot = getEchoRoot(target);

    if (typeof prop === 'symbol') {
      return { echoRoot, preparedValue: value };
    }

    // Check for cycles before assignment.
    if (isValidProxyTarget(value) || isProxy(value)) {
      if (wouldCreateCycle(echoRoot, value)) {
        throw new Error('Cannot create cycles in typed object graph. Consider using Ref for circular references.');
      }
    }

    // Prevent direct assignment of root ECHO objects (those created with Obj.make/Relation.make).
    // These must be wrapped with Ref.make for proper reference handling.
    // This matches database object behavior for consistency.
    if (isValidProxyTarget(value) || isProxy(value)) {
      const actualValue = getRawTarget(value);
      const isRootEchoObject = EventId in actualValue;
      if (isRootEchoObject) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      }
    }

    // Copy-on-assign: If the value is a nested record owned by a different ECHO object, deep copy it.
    if (isValidProxyTarget(value) || isProxy(value)) {
      const actualValue = getRawTarget(value);
      const existingOwner = getOwner(actualValue);
      if (existingOwner != null && existingOwner !== echoRoot) {
        value = deepCopy(value);
      }
    }

    // Convert arrays to reactive arrays — the whole subtree, as construction does, not just the top
    // level: an array reached through an assigned record is proxied like any other and must be gated
    // and reactive too.
    if (Array.isArray(value) && !(value instanceof ReactiveArray)) {
      value = ReactiveArray.from(value);
    }
    if (value != null && typeof value === 'object' && !isProxy(value)) {
      makeArraysReactive(value);
    }

    const validatedValue = this._validateValue(target, prop, value);

    // Set owner on new value to the root ECHO object.
    if (isValidProxyTarget(validatedValue) || isProxy(validatedValue)) {
      setOwnerRecursive(validatedValue, echoRoot);
    }

    // Stored wrapped, for the same reason `init` wraps: the target is what a forwarded read sees.
    return {
      echoRoot,
      preparedValue: isValidProxyTarget(validatedValue) ? createProxy(validatedValue, this) : validatedValue,
    };
  }

  private _validateValue(target: any, prop: string | symbol, value: any) {
    if (prop === ParentId) {
      return value;
    }
    const schema = SchemaValidator.getTargetPropertySchema(target, prop);
    // Clearing an optional property is admitted here rather than by the property's own schema: v4
    // keeps optionality on the property's context instead of widening its type to `T | undefined`.
    if (value !== undefined || !SchemaValidator.isOptionalProperty(target, prop)) {
      assertsWithDetail(schema, value);
    }
    SchemaValidator.assertExactProperties(schema, value, (path) => getDeep(value, path));
    if (isValidProxyTarget(value)) {
      setSchemaProperties(value, schema);
    }

    return value;
  }

  private _inspect(
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ): string {
    const inspected = inspectFn(this, {
      ...options,
      showHidden: false,
      customInspect: false,
    });

    return `Typed ${inspected}`;
  }
}

/**
 * @deprecated Use `Obj.toJSON` instead.
 */
// TODO(burdon): Remove?
const toJSON = (target: ProxyTarget): any => {
  return { '@type': 'TypedReactiveObject', ...target };
};

/**
 * Pointer to a `Type.Type` entity, stamped as the back-reference (`TypeEntityId`)
 * on instances and read by the `SchemaId` getter installed below.
 *
 * Structural shape (not `Type.AnyEntity`) because `internal/common/proxy/`
 * can't import the top-level `Type` module without a cycle. Every kind of
 * `Type.Type` entity satisfies this shape:
 *   - Static (`Type.makeObject(dxn)` pipe) — slot set directly on the object.
 *   - Persisted (echo-handler-wrapped) — slot exposed via that handler's
 *     `get` trap (rebuilds from `data.jsonSchema`).
 *   - In-memory pre-persist (`Type.makeObjectFromJsonSchema`) — slot exposed
 *     via the `case StaticTypeSchemaSlot:` arm in this file's `get` trap.
 */
export type TypeSource = { readonly [StaticTypeSchemaSlot]?: Schema.Top };

/**
 * Recursively set AST on all potential proxy targets.
 *
 * @param skipOwnStamp Skip stamping `TypeId`/`SchemaId` on `obj` itself (still recurses into
 *   children, which always get stamped). Used for objects decoded from JSON, whose own `TypeId`/
 *   `SchemaId` are already set by `setTypename`/`setSchema` as `configurable: false` — redefining
 *   them here (with `configurable: true`) would throw.
 */
const setSchemaProperties = (obj: any, schema: Schema.Top, typeSource?: TypeSource, skipOwnStamp = false) => {
  if (!skipOwnStamp) {
    const schemaType = getSchemaURI(schema);
    if (schemaType != null) {
      defineHiddenProperty(obj, TypeId, schemaType);
    }

    if (typeSource != null) {
      // Keep a back-reference to the type entity so `Obj.getType` /
      // `Relation.getType` / `Entity.getType` can return it.
      defineHiddenProperty(obj, TypeEntityId, typeSource);

      // Install `SchemaId` as a getter that reads through the entity's static
      // schema slot. The three entity shapes (static / persisted / in-memory
      // pre-persist) each populate the slot via their own get-trap path, so
      // `Type.update` / `Type.addFields` mutations propagate into validation
      // for objects created via `Obj.make(typeEntity, ...)` without this file
      // having to rebuild from `jsonSchema` itself.
      Object.defineProperty(obj, SchemaId, {
        get: () => typeSource[StaticTypeSchemaSlot] ?? schema,
        enumerable: false,
        configurable: true,
      });
    } else {
      defineHiddenProperty(obj, SchemaId, schema);
    }
  }

  if (Array.isArray(obj)) {
    for (let index = 0; index < obj.length; index++) {
      if (isValidProxyTarget(obj[index])) {
        const elementSchema = SchemaValidator.getIndexedElementSchema(schema, index) ?? Schema.Any;
        setSchemaProperties(obj[index], elementSchema);
      }
    }
    return;
  }

  for (const key in obj) {
    if (isValidProxyTarget(obj[key])) {
      let elementSchema: Schema.Schema<any>;
      try {
        elementSchema = SchemaValidator.getTargetPropertySchema(obj, key);
      } catch {
        // Property not in schema — treat as untyped so the proxy can still wrap it.
        elementSchema = Schema.Any;
      }
      setSchemaProperties(obj[key], elementSchema);
    }
  }
};

// Accepts any encoded type: the typed handler operates on the decoded representation, so schemas
// whose encoded form differs (e.g. refs encode as `{ '/': uri }`) are valid here.
export const prepareTypedTarget = <T>(target: T, schema: Schema.Schema<T>, typeSource?: TypeSource) => {
  // log.info('prepareTypedTarget', { target, schema });
  validateAndReactifyTarget(target, schema);
  setSchemaProperties(target, schema, typeSource);
};

/**
 * Validate a target against its schema and convert nested arrays to `ReactiveArray`. Shared by
 * {@link prepareTypedTarget} and {@link prepareDecodedTypedTarget}.
 */
export const validateAndReactifyTarget = <T>(target: T, schema: Schema.Schema<T>) => {
  if (!SchemaAST.isObjects(schema.ast)) {
    throw new Error('schema has to describe an object type');
  }

  SchemaValidator.validateSchema(schema);
  assertsWithDetail(schema, target);
  SchemaValidator.assertExactProperties(schema, target, (path) => getDeep(target, path));
  makeArraysReactive(target);
};

/**
 * Like {@link prepareTypedTarget}, for a target whose own `SchemaId`/`TypeId` are already stamped
 * and locked `configurable: false` — e.g. an object decoded from JSON via `setSchema`/`setTypename`
 * (see `objectFromJSON`). Validates and reactifies as usual, then stamps `SchemaId`/`TypeId` on
 * nested records/arrays only, leaving the target's own (locked) stamps untouched.
 */
export const prepareDecodedTypedTarget = <T>(target: T, schema: Schema.Schema<T>) => {
  validateAndReactifyTarget(target, schema);
  setSchemaProperties(target, schema, undefined, true);
};

/**
 * Convert every plain array in a subtree to a {@link ReactiveArray}, in place. A plain array has
 * neither the batched mutating methods nor the `[ChangeKeyId]` the read-only gate reads off its
 * prototype, so one left in the tree would mutate silently and notify nobody.
 *
 * An already-proxied child is skipped: it belongs to the graph already and writing through its proxy
 * would run the whole assignment path again.
 */
const makeArraysReactive = (target: any) => {
  for (const key in target) {
    const value = target[key];
    if (value == null || typeof value !== 'object' || isProxy(value)) {
      continue;
    }
    if (Array.isArray(value) && !(value instanceof ReactiveArray)) {
      target[key] = ReactiveArray.from(value);
    }
    makeArraysReactive(target[key]);
  }
};
