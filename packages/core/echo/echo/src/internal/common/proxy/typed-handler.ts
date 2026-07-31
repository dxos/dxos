//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { type InspectOptionsStylized } from 'node:util';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';
import { getDeep, setDeep } from '@dxos/util';

import { getSchemaURI } from '../../Annotation/annotations';
import { toEffectSchema } from '../../JsonSchema/json-schema';
import { ObjectDeletedId, ParentId, SchemaId, StaticTypeSchemaSlot, TypeEntityId, TypeId } from '../types';
import { executeChange, isInChangeContext, queueNotification } from './change-context';
import { defineHiddenProperty } from './define-hidden-property';
import { createPropertyDeleteError } from './errors';
import { batchEvents } from './event-batch';
import {
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
  createProxy,
  isProxy,
  isReactiveRecord,
  isValidProxyTarget,
  normalizeSpliceRange,
  symbolIsProxy,
  symbolReactivePrototype,
} from './proxy-utils';
import { ReactiveArray } from './reactive-array';
import { SchemaValidator } from './schema-validator';
import { ChangeId, EventId } from './symbols';

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
  [SchemaId]: Schema.Schema.AnyNoContext;
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
//   proxy ──Proxy(target, ProxyHandlerSlot → TypedReactiveHandler)
//     │         get/set/has/... traps run here
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
 * Enforce that user-data mutations only happen inside `Obj.update()`. A root object owns an
 * `EventId` once initialized; before that (and for non-root records or symbol-keyed system
 * properties) mutations pass through. Returns whether the root is initialized so callers can gate
 * change notifications.
 */
const assertMutableWithinChange = (echoRoot: object, prop: string | symbol): boolean => {
  const isInitialized = EventId in echoRoot;
  if (isInitialized && typeof prop !== 'symbol' && !isInChangeContext(echoRoot)) {
    throw new Error(
      `Cannot modify object property "${String(prop)}" outside of Obj.update(). ` +
        'Use Obj.update(obj, (mutableObj) => { mutableObj.property = value; }) instead.',
    );
  }
  return isInitialized;
};

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
        if ((target as any)[symbolIsProxy]) {
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
  }

  /**
   * Hide the internal instance-state prototype so consumers see a plain object; arrays keep their
   * real (ReactiveArray) prototype.
   */
  getPrototypeOf(target: ProxyTarget): object | null {
    return Array.isArray(target) ? Reflect.getPrototypeOf(target) : Object.prototype;
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    // The ECHO system surface (objectData, ChangeId, StaticTypeSchemaSlot, ...) lives as accessors
    // on the behaviour prototype; resolve them via Reflect.get and return as-is — these are not user
    // data and must never be proxy-wrapped.
    if (typeof prop === 'symbol' && isBehaviourAccessor(target, prop)) {
      return Reflect.get(target, prop, receiver);
    }

    // The back-reference to the type entity is own metadata — return the raw value so we don't
    // re-wrap an already-reactive `Type.Type` entity in another proxy (which would fail the
    // SchemaId-in-target invariant).
    if (prop === TypeEntityId) {
      return Reflect.get(target, prop, receiver);
    }

    // Own getter properties (e.g. the `SchemaId` slot installed by `setSchemaProperties`).
    if (Object.getOwnPropertyDescriptor(target, prop)?.get) {
      return Reflect.get(target, prop, receiver);
    }

    const value = Reflect.get(target, prop, receiver);
    if (isValidProxyTarget(value)) {
      return createProxy(value, this);
    }

    return value;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    const echoRoot = getEchoRoot(target);
    const isInitialized = assertMutableWithinChange(echoRoot, prop);

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
        if (isInitialized) {
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

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    return Reflect.ownKeys(target);
  }

  deleteProperty(target: ProxyTarget, property: string | symbol): boolean {
    const echoRoot = getEchoRoot(target);

    // Check readonly enforcement - mutations only allowed within Obj.update().
    // Skip for symbol properties (internal infrastructure, not user data).
    const isInitialized = EventId in echoRoot;
    const isSymbolProp = typeof property === 'symbol';
    if (isInitialized && !isSymbolProp && !isInChangeContext(echoRoot)) {
      throw createPropertyDeleteError(property);
    }

    const result = Reflect.deleteProperty(target, property);
    if (isInitialized) {
      queueNotification(echoRoot);
    }
    return result;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const echoRoot = getEchoRoot(target);
    const isInitialized = assertMutableWithinChange(echoRoot, property);

    const { echoRoot: _, preparedValue } = this._prepareValueForAssignment(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: preparedValue,
    });
    if (!this._inSet && isInitialized) {
      // Queue notification instead of emitting immediately (batched).
      queueNotification(echoRoot);
    }
    return result;
  }

  textUpdate(target: ProxyTarget, path: readonly (string | number)[], newText: string): void {
    this._applyTextMutation(target, path, () => newText);
  }

  textSplice(
    target: ProxyTarget,
    path: readonly (string | number)[],
    start: number,
    deleteCount: number,
    insert: string,
  ): string {
    let removed = '';
    this._applyTextMutation(target, path, (current) => {
      const range = normalizeSpliceRange(current.length, start, deleteCount);
      removed = current.slice(range.start, range.start + range.deleteCount);
      return current.slice(0, range.start) + insert + current.slice(range.start + range.deleteCount);
    });
    return removed;
  }

  /**
   * Shared read-modify-write for the in-memory string CRDT path. Mirrors the `set` trap: enforce the
   * change context, then mutate and notify through the same batched notification path so reactivity fires.
   *
   * Writes via `setDeep` on the raw target, intentionally bypassing `_prepareValueForAssignment` /
   * `_validateValue`: a string CRDT delta produces a string, and per-delta schema checks (pattern,
   * maxLength) would reject valid intermediate states during incremental edits. Such constraints are
   * enforced at the initial assignment or as application-level invariants, mirroring the Automerge path.
   */
  private _applyTextMutation(
    target: ProxyTarget,
    path: readonly (string | number)[],
    compute: (current: string) => string,
  ): void {
    const echoRoot = getEchoRoot(target);
    if (!isInChangeContext(echoRoot)) {
      throw new Error(
        `Cannot modify text at "${path.join('.')}" outside of Obj.update(). ` +
          'Use Obj.update(obj, () => { Text.splice(obj, path, ...); }) instead.',
      );
    }

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
      setDeep(target, keyPath, next);
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

    // Convert arrays to reactive arrays.
    if (Array.isArray(value) && !(value instanceof ReactiveArray)) {
      value = ReactiveArray.from(value);
    }

    const validatedValue = this._validateValue(target, prop, value);

    // Set owner on new value to the root ECHO object.
    if (isValidProxyTarget(validatedValue) || isProxy(validatedValue)) {
      setOwnerRecursive(validatedValue, echoRoot);
    }

    return { echoRoot, preparedValue: validatedValue };
  }

  private _validateValue(target: any, prop: string | symbol, value: any) {
    if (prop === ParentId) {
      return value;
    }
    const schema = SchemaValidator.getTargetPropertySchema(target, prop);
    const _ = Schema.asserts(schema)(value);
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
export type TypeSource = { readonly [StaticTypeSchemaSlot]?: Schema.Schema.AnyNoContext };

/**
 * Recursively set AST on all potential proxy targets.
 *
 * @param skipOwnStamp Skip stamping `TypeId`/`SchemaId` on `obj` itself (still recurses into
 *   children, which always get stamped). Used for objects decoded from JSON, whose own `TypeId`/
 *   `SchemaId` are already set by `setTypename`/`setSchema` as `configurable: false` — redefining
 *   them here (with `configurable: true`) would throw.
 */
const setSchemaProperties = (
  obj: any,
  schema: Schema.Schema.AnyNoContext,
  typeSource?: TypeSource,
  skipOwnStamp = false,
) => {
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
export const prepareTypedTarget = <T>(target: T, schema: Schema.Schema<T, any>, typeSource?: TypeSource) => {
  // log.info('prepareTypedTarget', { target, schema });
  validateAndReactifyTarget(target, schema);
  setSchemaProperties(target, schema, typeSource);
};

/**
 * Validate a target against its schema and convert nested arrays to `ReactiveArray`. Shared by
 * {@link prepareTypedTarget} and {@link prepareDecodedTypedTarget}.
 */
export const validateAndReactifyTarget = <T>(target: T, schema: Schema.Schema<T, any>) => {
  if (!SchemaAST.isTypeLiteral(schema.ast)) {
    throw new Error('schema has to describe an object type');
  }

  SchemaValidator.validateSchema(schema);
  const _ = Schema.asserts(schema)(target);
  SchemaValidator.assertExactProperties(schema, target, (path) => getDeep(target, path));
  makeArraysReactive(target);
};

/**
 * Like {@link prepareTypedTarget}, for a target whose own `SchemaId`/`TypeId` are already stamped
 * and locked `configurable: false` — e.g. an object decoded from JSON via `setSchema`/`setTypename`
 * (see `objectFromJSON`). Validates and reactifies as usual, then stamps `SchemaId`/`TypeId` on
 * nested records/arrays only, leaving the target's own (locked) stamps untouched.
 */
export const prepareDecodedTypedTarget = <T>(target: T, schema: Schema.Schema<T, any>) => {
  validateAndReactifyTarget(target, schema);
  setSchemaProperties(target, schema, undefined, true);
};

const makeArraysReactive = (target: any) => {
  for (const key in target) {
    if (target[symbolIsProxy]) {
      continue;
    }
    if (Array.isArray(target[key])) {
      target[key] = ReactiveArray.from(target[key]);
    }
    if (typeof target[key] === 'object') {
      makeArraysReactive(target[key]);
    }
  }
};
