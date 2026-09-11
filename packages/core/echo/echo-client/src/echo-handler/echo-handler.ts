//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Equal from 'effect/Equal';
import * as Schema from 'effect/Schema';
import { type InspectOptionsStylized } from 'node:util';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { Entity, Obj, Type } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference, PROPERTY_ID, isEncodedReference } from '@dxos/echo-protocol';
import {
  type AnyProperties,
  EntityKind,
  type EntityMeta,
  EventId,
  MetaId,
  ParentId,
  type ReactiveHandler,
  Ref,
  RelationSourceId,
  RelationTargetId,
  SchemaValidator,
  SelfURIId,
  assertMutable,
  assertObjectModel,
  createArrayMethodError,
  createProxy,
  createTextMethodError,
  defineHiddenProperty,
  getEntityKind,
  getProxyHandler,
  getProxyTarget,
  getRefSavedTarget,
  getSchemaURI,
  getTypeAnnotation,
  isInChangeContext,
  isProxy,
  isReactiveRecord,
  normalizeSpliceRange,
  queueNotification,
  setProxyHandler,
} from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { deepMapValues, defaultMap, getDeep, setDeep } from '@dxos/util';

import * as Doc from '../automerge/Doc.ts';
import {
  type DecodedAutomergePrimaryValue,
  META_NAMESPACE,
  ObjectCore,
  type TargetRefreshScope,
} from '../core-db/index.ts';
import { type EchoDatabase } from '../proxy-db/index.ts';
import { EchoArray } from './echo-array.ts';
import { isEchoObject, isRootDataObject } from './echo-object-utils.ts';
import {
  adoptInstanceState,
  createInstanceState,
  createRecordTarget,
  getReified,
  getSchema,
  getTypename,
  handleStoredSchema,
  lookupRef,
  stripShadowingProperties,
} from './echo-prototypes.ts';
import {
  type ProxyTarget,
  TargetKey,
  getEchoDatabase,
  symbolInternals,
  symbolNamespace,
  symbolPath,
} from './echo-proxy-target.ts';

/**
 * Shared for all targets within one ECHO object.
 * @internal
 */
export class EchoReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance = new EchoReactiveHandler();

  /**
   * The document record each target was last filled from, with the document it came from. Automerge
   * shares untouched subtrees structurally, so a record the change did not reach is the identical object
   * and needs no work at all, and within a changed record an untouched key holds the identical value —
   * which is what lets a materialized `Ref`, array or nested proxy keep its identity across a refresh
   * instead of being minted again. Held weakly, and only ever compared by identity: a stale entry costs
   * a refresh that was already the unconditional behaviour.
   */
  _rawRecords = new WeakMap<object, { docHandle: object | undefined; raw: object | undefined }>();

  init(target: ProxyTarget): void {
    invariant(target[symbolInternals]);
    invariant(!isProxy(target));
    invariant(Array.isArray(target[symbolPath]));

    // Clear extra keys from objects
    if (!Array.isArray(target)) {
      for (const key in target) {
        if (typeof key !== 'symbol') {
          delete (target as any)[key];
        }
      }
    }

    if (!(EventId in target)) {
      defineHiddenProperty(target, EventId, new Event());
    }

    // Maybe have been set by `create`.
    Object.defineProperty(target, inspectCustom, {
      enumerable: false,
      configurable: true,
      value: this._inspect.bind(target),
    });

    const core = target[symbolInternals];
    if (target instanceof EchoArray) {
      if (this._canMaterialize(core)) {
        this._refreshArray(target);
      }
    } else {
      this._defineId(target, core);
      if (isRootDataObject(target)) {
        core.refreshTargets = (scope) => this._refreshAll(core, target, scope);
      }
      if (this._canMaterialize(core)) {
        this._refreshRecord(target);
      }
    }
  }

  /**
   * A target is filled as soon as its core has a document to fill it from. It needs no database: a ref
   * materialized here resolves through its core rather than through whatever the core held at the time
   * (see `CoreRefResolver`), so one built before `db.add` still works afterwards.
   */
  private _canMaterialize(core: ObjectCore): boolean {
    return core.hasDoc;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    return this.set(target, property, attributes.value, target);
  }

  /**
   * Re-fills the core's record targets from the document: the root, the nested records and the meta root
   * already handed out (all in `targetsMap`). Arrays hold no data and are skipped. A `scope` narrows this
   * to the single key a write is touching.
   */
  private _refreshAll(core: ObjectCore, root: ProxyTarget, scope?: TargetRefreshScope): void {
    if (scope && this._writeThrough(scope.target as ProxyTarget, scope.key)) {
      return;
    }
    this._refreshRecord(root);
    for (const nested of core.targetsMap.values()) {
      if (nested instanceof EchoArray) {
        this._refreshArray(nested);
      } else {
        this._refreshRecord(nested as ProxyTarget);
      }
    }
  }

  /**
   * Makes an array target's elements mirror the document: one own indexed property per stored element,
   * holding what a read returns, and a `length` that drops whatever the document no longer has. The
   * element values come from the same path-keyed wrapping records use, so a nested record or array keeps
   * the proxy already handed out for it.
   */
  private _refreshArray(target: EchoArray<any>): void {
    const core = target[symbolInternals];
    if (!this._canMaterialize(core)) {
      return;
    }
    const raw: unknown = core.getRaw([target[symbolNamespace], ...target[symbolPath]]);
    const previousRaw = this._previousRaw(target, core);
    if (previousRaw !== undefined && previousRaw === raw) {
      return;
    }
    this._rawRecords.set(target, {
      docHandle: core.docHandle,
      raw: typeof raw === 'object' ? (raw ?? undefined) : undefined,
    });

    // Elements come from the stored form, which is decoded under the meta namespace; the memo above still
    // keys on the raw record, since the decode is derived from it and is a fresh object every read.
    const stored = this._storedRecord(target);
    const elements = Array.isArray(stored) ? stored : [];
    // Staged before anything is applied, so an element that throws leaves the array as it was rather
    // than half of two states — reads are forwarded straight at it and would not recover.
    const materialized = elements.map((element, index) => this._materializeValue(target, String(index), element));
    for (const [index, value] of materialized.entries()) {
      if (target[index] !== value) {
        target[index] = value;
      }
    }
    target.length = materialized.length;
  }

  /**
   * Makes a record target's own properties mirror its record in the document: one own data property per
   * document key, holding what a read returns (primitives decoded, records and arrays as their proxies,
   * refs resolved), and nothing else. Keys the prototype chain answers — the system accessors and
   * `Object.prototype` — are left to it, as the decode path did.
   */
  private _refreshRecord(target: ProxyTarget): void {
    const core = target[symbolInternals];
    if (!this._canMaterialize(core)) {
      return;
    }
    const stored: unknown = core.getRaw([target[symbolNamespace], ...target[symbolPath]]);
    const raw = typeof stored === 'object' && stored !== null ? stored : undefined;
    const previousRaw = this._previousRaw(target, core);
    if (previousRaw !== undefined && previousRaw === raw) {
      return;
    }
    this._rawRecords.set(target, { docHandle: core.docHandle, raw });
    // Both sides of the per-key comparison below, or nothing: with no record to compare against, every
    // key is materialized afresh as it was before.
    const comparable =
      previousRaw !== undefined && raw !== undefined ? { previous: previousRaw, current: raw } : undefined;

    const record = this._storedRecord(target);
    const present = typeof record === 'object' && record !== null && !Array.isArray(record);
    // Materialized in full before anything is applied, so a value that throws leaves the target as it
    // was rather than half of two records — reads are forwarded straight at it and would not recover.
    const materialized: [string, unknown][] = [];
    if (present) {
      const prototype = Object.getPrototypeOf(target);
      for (const [key, value] of Object.entries(record)) {
        if (!Reflect.has(prototype, key)) {
          const unchanged =
            comparable !== undefined &&
            Object.hasOwn(target, key) &&
            Reflect.get(comparable.previous, key) === Reflect.get(comparable.current, key);
          materialized.push([key, unchanged ? Reflect.get(target, key) : this._materializeValue(target, key, value)]);
        }
      }
    }
    for (const [key, value] of materialized) {
      if (!Object.hasOwn(target, key) || (target as any)[key] !== value) {
        Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
      }
    }
    for (const key of Object.keys(target)) {
      if (key !== PROPERTY_ID && (!present || !Object.hasOwn(record, key))) {
        delete (target as any)[key];
      }
    }
    this._defineId(target, core);
  }

  /**
   * `id` is part of a root object's key set but is not in its record — it belongs to the core. Carried as
   * a real own property so the target's own shape is the whole answer and no `ownKeys` trap is needed to
   * synthesize it. Non-writable, like the accessor it shadows, which had no setter.
   */
  private _defineId(target: ProxyTarget, core: ObjectCore): void {
    if (isRootDataObject(target) && !Object.hasOwn(target, PROPERTY_ID) && core.id != null) {
      Object.defineProperty(target, PROPERTY_ID, {
        value: core.id,
        writable: false,
        enumerable: true,
        configurable: true,
      });
    }
  }

  /**
   * The record this target was last filled from, or undefined when there is none to compare against.
   * Discarded when the core has since been bound to a different document — `switchBranch` and
   * `_rebindMemberToBranch` re-point a live core, and values from the old document's tree are not
   * comparable with the new one's.
   */
  private _previousRaw(target: ProxyTarget, core: ObjectCore): object | undefined {
    const cached = this._rawRecords.get(target);
    return cached !== undefined && cached.docHandle === core.docHandle ? cached.raw : undefined;
  }

  /**
   * A target's record as the document holds it. The meta root is read decoded, so `upgradeMeta` supplies
   * the defaults an older document omits; everything else is read raw, since a decode copies the whole
   * subtree where only the top level is wanted.
   */
  private _storedRecord(target: ProxyTarget): unknown {
    const core = target[symbolInternals];
    const namespace = target[symbolNamespace];
    const path = target[symbolPath];
    // The whole meta namespace is read decoded, so `upgradeMeta` supplies the defaults an older document
    // omits and upgrades a legacy bare tag id into a ref; a nested meta target is reached by walking that
    // decoded record rather than by a raw read, which would see the un-upgraded value. Everything else is
    // read raw, since a decode copies the whole subtree where only the top level is wanted.
    return namespace === META_NAMESPACE
      ? getDeep(core.getDecoded([namespace]), path)
      : core.getRaw([namespace, ...path]);
  }

  /**
   * What a read of `key` returns, from the stored form: containers and refs are wrapped by path, so the
   * stored value is only inspected for its kind and never copied; everything else is decoded.
   */
  private _materializeValue(target: ProxyTarget, key: string, stored: unknown): unknown {
    const core = target[symbolInternals];
    const container =
      typeof stored === 'object' &&
      stored !== null &&
      !(stored instanceof Uint8Array) &&
      !(stored instanceof A.RawString);
    return this._wrapInProxyIfRequired(target, {
      namespace: target[symbolNamespace],
      value: container ? stored : core.decode(stored),
      dataPath: [...target[symbolPath], key],
    });
  }

  /**
   * Mirrors one written key onto the target, for a refresh narrowed by a
   * {@link ObjectCore.changeTargetKey} scope, so a single-property write costs one key rather than the
   * object's width. Returns false when the key is not the whole of the change — a container on either
   * side of the write owns a target, and everything already materialized under it, that no longer
   * matches the document — and the caller falls back to refreshing the record.
   */
  private _writeThrough(target: ProxyTarget, key: string): boolean {
    if (!this._canMaterialize(target[symbolInternals])) {
      return true;
    }
    // An array holds no data of its own, so the write is entirely in the targets below it.
    if (target instanceof EchoArray) {
      return false;
    }
    if (Reflect.has(Object.getPrototypeOf(target), key)) {
      return true;
    }
    // This path fills the key from the document without going through `_refreshRecord`, so the memo it
    // keeps would describe neither the record before the write nor the one after. Left in place it is
    // worse than absent: a later refresh comparing against it would find the key equal to a value the
    // target no longer holds, and keep what this write put there.
    this._rawRecords.delete(target);
    const previous = (target as any)[key];
    const record = this._storedRecord(target);
    const stored = typeof record === 'object' && record !== null ? (record as any)[key] : undefined;
    if (stored === undefined) {
      delete (target as any)[key];
      return !isProxy(previous);
    }
    const value = this._materializeValue(target, key, stored);
    Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
    return !isProxy(previous) && !isProxy(value);
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));

    // System setters (currently only [ParentId]) are defined on the prototype
    // chain and, like before, are allowed regardless of change context.
    if (typeof prop === 'symbol' && hasPrototypeSetter(target, prop)) {
      return Reflect.set(target, prop, value, receiver);
    }
    invariant(typeof prop === 'string');

    // createdAt / updatedAt are virtual read-only properties on the meta proxy.
    if (target[symbolNamespace] === META_NAMESPACE && (prop === 'createdAt' || prop === 'updatedAt')) {
      throw new TypeError(`'${prop}' is a read-only system property.`);
    }

    const core = target[symbolInternals];
    if (target instanceof EchoArray && prop === 'length') {
      this._arraySetLength(target, target[symbolPath], value);
      return true;
    }

    const fullPath = [getNamespace(target), ...target[symbolPath], prop];
    const validatedValue = this._validateValue(target, [...target[symbolPath], prop], value);
    // The refresh runs inside the write, narrowed to this key, so a subscriber notified by it already
    // sees the new value.
    core.changeTargetKey(target, prop, () => {
      if (validatedValue === undefined) {
        core.delete(fullPath);
      } else {
        core.setDecoded(fullPath, this._handleLinksAssignment(target, validatedValue));
      }
    });

    // Note: EventId.emit() is called centrally in core.updates.on() to handle both local and remote changes.
    return true;
  }

  /**
   * Hide the internal `instanceState`/behaviour prototypes from consumers so that
   * `Object.getPrototypeOf(obj)` and `instanceof Object`/`Array` behave as for a
   * plain object/array.
   */
  /**
   * Takes a decoded value from the document, and wraps it in a proxy if required.
   * We use it to wrap records and arrays to provide deep mutability.
   * Wrapped targets are cached in the `targetsMap` to ensure that the same proxy is returned for the same path.
   */
  private _wrapInProxyIfRequired(target: ProxyTarget, decodedValueAtPath: DecodedValueAtPath) {
    const { value: decoded, dataPath, namespace } = decodedValueAtPath;
    if (decoded == null) {
      return decoded;
    }
    // A primitive is none of the cases below; settling that first also spares the proxy
    // probe from boxing it and walking its wrapper prototype on every primitive read.
    if (typeof decoded !== 'object') {
      return decoded;
    }
    if (decoded instanceof Uint8Array) {
      return decoded;
    }
    if (isProxy(decoded)) {
      return handleStoredSchema(target, decoded);
    }
    if (isEncodedReference(decoded)) {
      return lookupRef(target, decoded);
    }
    if (Array.isArray(decoded)) {
      const targetKey = TargetKey.new(dataPath, namespace, 'array');
      const newTarget = defaultMap(target[symbolInternals].targetsMap, targetKey, (): ProxyTarget => {
        const array = new EchoArray();
        // Hidden rather than assigned: an assignment to a declared class field leaves it enumerable, and
        // with no `ownKeys` trap to filter them these would show up in `Reflect.ownKeys`, in a spread and
        // in a deep-equality comparison.
        defineHiddenProperty(array, symbolInternals, target[symbolInternals]);
        defineHiddenProperty(array, symbolPath, dataPath);
        defineHiddenProperty(array, symbolNamespace, namespace);
        defineHiddenProperty(array, EventId, target[EventId]);
        return array as any as ProxyTarget;
      });

      return createProxy(newTarget, this);
    }
    if (typeof decoded === 'object') {
      const targetKey = TargetKey.new(dataPath, namespace, 'record');
      // TODO(dmaretskyi): Materialize properties for easier debugging.
      const newTarget = defaultMap(
        target[symbolInternals].targetsMap,
        targetKey,
        // Reuse the root target's event: the central core subscriptions emit on the root's
        // event only, so a derived record proxy with its own event would never notify its
        // subscribers (arrays preserve `target[EventId]` for the same reason).
        (): ProxyTarget =>
          createRecordTarget(
            createInstanceState(target[symbolInternals], namespace, dataPath, {
              event: target[EventId],
            }),
          ),
      );

      return createProxy(newTarget, this);
    }

    return decoded;
  }

  private _validateValue(target: ProxyTarget, path: Doc.KeyPath, value: any): any {
    invariant(path.length > 0);
    if (typeof path.at(-1) === 'symbol') {
      throw new Error('Invalid path');
    }
    if (path.length === 1 && path[0] === 'id') {
      throw new Error('Object Id is readonly');
    }
    throwIfCustomClass(path[path.length - 1], value);
    const rootObjectSchema = getSchema(target);
    if (rootObjectSchema == null) {
      // An untyped object, or a typed one whose schema does not resolve in this runtime (written
      // before a type's version bump, or replicated from a peer that has a type this one lacks):
      // writes pass through unvalidated, since refusing them would make the object unusable
      // wherever its schema happens to be absent.
      return value;
    }

    const propertySchema = SchemaValidator.getPropertySchema(rootObjectSchema, path, (path) => {
      return target[symbolInternals].getDecoded([getNamespace(target), ...path]);
    });

    Schema.asserts(propertySchema, value);
    SchemaValidator.assertExactProperties(propertySchema, value, (path) => getDeep(value, path));
    return value;
  }

  private _handleLinksAssignment(target: ProxyTarget, value: any): any {
    return deepMapValues(value, (value, recurse) => {
      if (isEchoObjectField(value) || isDetachedObjectField(value)) {
        // The value is a value-object field of another object — database-backed or detached. We don't
        // want to create a reference to it or have shared mutability, we need to copy by value.
        // Arrays are copied as arrays: spreading one into an object literal would turn it into a
        // record of numeric keys.
        return recurse(Array.isArray(value) ? [...value] : { ...value });
      } else if (isProxy(value)) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      } else if (Ref.isRef(value)) {
        const savedTarget = getRefSavedTarget(value);
        if (savedTarget) {
          return EncodedReference.fromURI(this.createRef(target, savedTarget));
        } else {
          return EncodedReference.fromURI(value.uri);
        }
      } else if (value instanceof Uint8Array) {
        return value;
      } else {
        return recurse(value);
      }
    });
  }

  deleteProperty(target: ProxyTarget, property: string | symbol): boolean {
    const core = target[symbolInternals];
    if (target instanceof EchoArray) {
      // Note: Automerge support delete array[index] but its behavior is not consistent with JS arrays.
      //       It works as splice but JS arrays substitute `undefined` for deleted elements.
      //       `Undefined` values are not supported in Automerge, so we can't override this behavior.
      log.warn('Deleting properties from EchoArray is not supported. Use `EchoArray.splice` instead.');
      return false;
    } else if (isRootDataObject(target) && property === PROPERTY_ID) {
      return false;
    } else if (typeof property === 'symbol') {
      return false;
    } else if (target instanceof EchoArray && isNaN(parseInt(property))) {
      return false;
    } else if (typeof property === 'string') {
      const fullPath = [getNamespace(target), ...target[symbolPath], property];
      core.changeTargetKey(target, property, () => core.delete(fullPath));
      return true;
    }
    return false;
  }

  arrayPush(target: ProxyTarget, path: Doc.KeyPath, ...items: any[]): number {
    assertMutable(target, 'push', createArrayMethodError);
    const validatedItems = this._validateForArray(target, path, items, target.length);

    const encodedItems = this._encodeForArray(target, validatedItems);
    const result = target[symbolInternals].arrayPush([getNamespace(target), ...path], encodedItems);
    return result;
  }

  arrayPop(target: ProxyTarget, path: Doc.KeyPath): any {
    assertMutable(target, 'pop', createArrayMethodError);
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.pop();
    });

    return returnValue;
  }

  arrayShift(target: ProxyTarget, path: Doc.KeyPath): any {
    assertMutable(target, 'shift', createArrayMethodError);
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.shift();
    });

    return returnValue;
  }

  arrayUnshift(target: ProxyTarget, path: Doc.KeyPath, ...items: any[]): number {
    assertMutable(target, 'unshift', createArrayMethodError);
    const validatedItems = this._validateForArray(target, path, items, 0);
    const fullPath = this._getPropertyMountPath(target, path);
    const encodedItems = this._encodeForArray(target, validatedItems);

    let newLength: number = -1;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.unshift(...encodedItems);
    });

    invariant(newLength !== -1);
    return newLength;
  }

  arraySplice(target: ProxyTarget, path: Doc.KeyPath, start: number, deleteCount?: number, ...items: any[]): any[] {
    assertMutable(target, 'splice', createArrayMethodError);
    const validatedItems = this._validateForArray(target, path, items, start);

    const fullPath = this._getPropertyMountPath(target, path);
    const encodedItems = this._encodeForArray(target, validatedItems);

    let deletedElements: any[] | undefined;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      if (deleteCount != null) {
        deletedElements = array.splice(start, deleteCount, ...encodedItems);
      } else {
        deletedElements = array.splice(start);
      }
    });

    invariant(deletedElements);
    return deletedElements;
  }

  arraySort(target: ProxyTarget, path: Doc.KeyPath, compareFn?: (v1: any, v2: any) => number): any[] {
    assertMutable(target, 'sort', createArrayMethodError);
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const sortedArray = [...array].sort(compareFn);
      setDeep(doc, fullPath, sortedArray);
    });

    return target as EchoArray<any>;
  }

  arrayReverse(target: ProxyTarget, path: Doc.KeyPath): any[] {
    assertMutable(target, 'reverse', createArrayMethodError);
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const reversedArray = [...array].reverse();
      setDeep(doc, fullPath, reversedArray);
    });

    return target as EchoArray<any>;
  }

  textUpdate(target: ProxyTarget, path: Doc.KeyPath, newText: string): void {
    assertMutable(target, 'update', createTextMethodError);
    const fullPath = this._getPropertyMountPath(target, path);
    target[symbolInternals].change((doc: any) => {
      // `A.updateText` computes a minimal diff so cursors/anchors survive and concurrent edits merge.
      // `.slice()` materializes a mutable copy since Automerge mutates the path array.
      A.updateText(doc, fullPath.slice(), newText);
    });
  }

  textSplice(target: ProxyTarget, path: Doc.KeyPath, start: number, deleteCount: number, insert: string): string {
    assertMutable(target, 'splice', createTextMethodError);
    const fullPath = this._getPropertyMountPath(target, path);

    let removed = '';
    target[symbolInternals].change((doc: any) => {
      const current = getDeep(doc, fullPath);
      invariant(typeof current === 'string', 'Text mutation target is not a string');
      const range = normalizeSpliceRange(current.length, start, deleteCount);
      removed = current.slice(range.start, range.start + range.deleteCount);
      A.splice(doc, fullPath.slice(), range.start, range.deleteCount, insert);
    });

    return removed;
  }

  setDatabase(target: ProxyTarget, database: EchoDatabase): void {
    target[symbolInternals].database = database;
  }

  /**
   * Store referenced object.
   * Used when `set` and other mutating methods are called with a proxy.
   * @param target - self
   * @param proxy - the proxy that was passed to the method
   */
  createRef(target: ProxyTarget, proxy: any): URI.URI {
    let otherEchoObj = proxy;

    // Honour a Queue URI carried by the source. Queue-decoded objects (returned by
    // `Feed.query(...).run` / `queue.queryObjects`) have a `SelfURIId` annotation set directly
    // on the plain object (not via proxy) and do not live in `space.db`. Without this
    // short-circuit, the path below would wrap the queue object as a fresh ECHO proxy
    // and call `database.add()`, leaking the object into `space.db`.
    if (typeof otherEchoObj === 'object' && otherEchoObj !== null && !isEchoObject(otherEchoObj)) {
      const selfUri = (otherEchoObj as any)[SelfURIId];
      if (typeof selfUri === 'string' && EID.isEID(selfUri)) {
        return selfUri;
      }
    }

    otherEchoObj = !isEchoObject(otherEchoObj) ? createObject(otherEchoObj) : otherEchoObj;
    const otherObjId = otherEchoObj.id;
    invariant(typeof otherObjId === 'string' && otherObjId.length > 0);

    // Note: Save proxy in `.linkCache` if the object is not yet saved in the database.
    const database = getEchoDatabase(target[symbolInternals]);
    if (!database) {
      invariant(target[symbolInternals].linkCache);

      // Can be caused not using `object(Expando, { ... })` constructor.
      // TODO(dmaretskyi): Add better validation.
      invariant(otherObjId != null);
      target[symbolInternals].linkCache.set(otherObjId, otherEchoObj as Entity.Unknown);
      return EID.make({ entityId: otherObjId });
    }

    // TODO(burdon): Remote?
    const foreignDatabase = getEchoDatabase((getProxyTarget(otherEchoObj) as ProxyTarget)[symbolInternals]);
    if (!foreignDatabase) {
      database.add(otherEchoObj);
      // TODO(dmaretskyi): Is this right.
      return EID.make({ entityId: otherObjId });
    }

    // Note: If the object is in a different database, return a reference to a foreign database.
    if (foreignDatabase !== database) {
      return EID.make({ spaceId: foreignDatabase.spaceId, entityId: otherObjId });
    }

    return EID.make({ entityId: otherObjId });
  }

  /**
   *
   */
  saveRefs(target: ProxyTarget): void {
    if (!target[symbolInternals].linkCache) {
      return;
    }

    if (target[symbolInternals].linkCache) {
      for (const obj of target[symbolInternals].linkCache.values()) {
        this.createRef(target, obj);
      }

      target[symbolInternals].linkCache = undefined;
    }
  }

  /**
   * Re-stamps a relation's source/target references once it joins a database. `setRelationSourceAndTarget`
   * runs at construction time, before the relation has a database, so it can only emit space-less refs.
   * With the database known, each endpoint is bound here: a same-space endpoint stays relative, a
   * cross-space endpoint becomes absolute, and an unpersisted endpoint is added to this database (then
   * relative) — keeping the relation's strong-dependency endpoints resolvable from the persisted ref alone.
   */
  rebindRelationEndpoints(target: ProxyTarget): void {
    const core = target[symbolInternals];
    if (core.getKind() !== EntityKind.Relation) {
      return;
    }
    // Read the raw endpoint proxies off the target (not via the resolving get-trap on the proxy).
    const sourceRef = Reflect.get(target, RelationSourceId);
    const targetRef = Reflect.get(target, RelationTargetId);
    if (isProxy(sourceRef)) {
      core.setSource(EncodedReference.fromURI(this.createRef(target, sourceRef)));
    }
    if (isProxy(targetRef)) {
      core.setTarget(EncodedReference.fromURI(this.createRef(target, targetRef)));
    }
  }

  private _arraySetLength(target: ProxyTarget, path: Doc.KeyPath, newLength: number): void {
    if (newLength < 0) {
      throw new RangeError('Invalid array length');
    }
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const trimmedArray = [...array];
      trimmedArray.length = newLength;
      setDeep(doc, fullPath, trimmedArray);
    });
  }

  private _validateForArray(target: ProxyTarget, path: Doc.KeyPath, items: any[], start: number) {
    return items.map((item, index) => {
      return this._validateValue(target, [...path, String(start + index)], item);
    });
  }

  // TODO(dmaretskyi): Change to not rely on object-core doing linking.
  private _encodeForArray(target: ProxyTarget, items: any[] | undefined): any[] {
    const linksEncoded = this._handleLinksAssignment(target, items);
    return target[symbolInternals].encode(linksEncoded);
  }

  private _getPropertyMountPath(target: ProxyTarget, path: Doc.KeyPath): Doc.KeyPath {
    return [...target[symbolInternals].mountPath, getNamespace(target), ...path];
  }

  // Will be bound to the proxy target.
  _inspect = function (
    this: ProxyTarget,
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    const typename = getTypename(this);
    const isRelation = this[symbolInternals].getKind() === EntityKind.Relation;

    const isTyped = !!this[symbolInternals].getType();
    const reified = getReified(this);
    reified.id = this[symbolInternals].id;
    return `${isTyped ? 'Typed' : ''}Echo${isRelation ? 'Relation' : 'Object'}${typename ? `(${typename})` : ''} ${inspectFn(
      reified,
      {
        ...options,
        compact: true,
        showHidden: false,
        customInspect: false,
      },
    )}`;
  };
}

export const throwIfCustomClass = (prop: Doc.KeyPath[number], value: any) => {
  if (value == null || Array.isArray(value) || Ref.isRef(value) || value instanceof Uint8Array) {
    return;
  }

  // A reactive record is either rooted at `Object.prototype` or carries a reactive behaviour
  // prototype (the typed handler relocates per-object metadata onto an intermediate prototype),
  // so test for that rather than a bare `Object.prototype` identity check.
  if (typeof value === 'object' && !isReactiveRecord(value)) {
    throw new Error(`class instances are not supported: setting ${value} on ${String(prop)}`);
  }
};

/**
 * @returns True if `value` is part of another EchoObjectSchema but not the root data object.
 */
const isEchoObjectField = (value: any) => {
  return (
    isProxy(value) && getProxyHandler(value) instanceof EchoReactiveHandler && !isRootDataObject(getProxyTarget(value))
  );
};

/**
 * @returns True if `value` is a nested record of a detached (never-added) object — an in-memory
 * reactive proxy rather than an {@link EchoReactiveHandler} one. `isEntity` is the handler-agnostic
 * root test: only root objects and relations carry an entity kind, so a nested record fails it.
 */
const isDetachedObjectField = (value: any) => {
  return isProxy(value) && !(getProxyHandler(value) instanceof EchoReactiveHandler) && !Entity.isEntity(value);
};

const getNamespace = (target: ProxyTarget): string => target[symbolNamespace];

/**
 * Walk the prototype chain looking for an accessor with a setter for `prop`.
 * Used by the `set` trap to route writes to system setters (e.g. `[ParentId]`).
 */
const hasPrototypeSetter = (target: object, prop: string | symbol): boolean => {
  let obj: object | null = target;
  while (obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (descriptor) {
      return typeof descriptor.set === 'function';
    }
    obj = Object.getPrototypeOf(obj);
  }
  return false;
};

interface DecodedValueAtPath {
  value: any;
  namespace: string;
  dataPath: Doc.KeyPath;
}

/**
 * Used to determine if the value should be placed at the root of a separate ECHO object.
 *
 * @returns True if `value` is a reactive object with an EchoHandler backend or a schema that has an `Object` annotation.
 */
// TODO(dmaretskyi): Reconcile with `isEchoObject`.
export const isTypedObjectProxy = (value: any): value is any => {
  if (isEchoObject(value)) {
    return true;
  }

  const type = Obj.getType(value);
  if (type != null) {
    return !!getTypeAnnotation(Type.getSchema(type));
  }

  return false;
};

/**
 * Helper type to preserve Obj<Props> types, otherwise return Entity.Entity<T>.
 */
type CreateObjectReturn<T> = T extends Obj.Unknown ? T : Entity.Entity<T>;

/**
 * Creates a reactive ECHO object backed by a CRDT.
 * @internal
 */
export const createObject = <T extends AnyProperties>(obj: T): CreateObjectReturn<T> => {
  assertArgument(!isEchoObject(obj), 'obj', 'Object is already an ECHO object');
  const type = Obj.getType(obj as unknown as Obj.Unknown);
  const schema = type != null ? Type.getSchema(type) : undefined;
  if (schema != null) {
    validateSchema(schema);
  }
  // Validate initial props on the raw target to avoid change context restrictions.
  const rawTarget = isProxy(obj) ? getProxyTarget(obj) : obj;
  validateInitialProps(rawTarget);

  const core = new ObjectCore();
  if (isProxy(obj)) {
    // Already an echo-schema reactive object.
    const meta = getProxyTarget<EntityMeta>(Entity.getMeta(obj as unknown as Entity.Unknown));

    // The proxy is kept and re-pointed at this handler, so the object's identity survives the
    // conversion from an in-memory typed object into a database-backed one.
    setProxyHandler(obj, EchoReactiveHandler.instance);

    const target = getProxyTarget<ProxyTarget>(obj);
    core.rootSchema = type;
    // Preserve the object's existing Event so reactive subscriptions established while it was an
    // in-memory typed object keep firing once it becomes database-backed.
    const existingEvent = target[EventId];
    // The previous (typed) handler keeps this object's metadata on its instance-state prototype.
    // Re-pointing the prototype below would detach it, but the migration that follows
    // (`initCore`, `setRelationSourceAndTarget`, `rebindRelationEndpoints`) reads parent/relation
    // endpoints off the target — so flatten that metadata onto the target as own properties first.
    // Shadowing copies are removed by `stripShadowingProperties` once migrated into the document.
    const previousState = Object.getPrototypeOf(target);
    if (previousState != null) {
      for (const symbol of Object.getOwnPropertySymbols(previousState)) {
        if (!Object.prototype.hasOwnProperty.call(target, symbol)) {
          Object.defineProperty(target, symbol, Object.getOwnPropertyDescriptor(previousState, symbol)!);
        }
      }
    }
    adoptInstanceState(target, createInstanceState(core, DATA_NAMESPACE, [], { event: existingEvent }));

    subscribeCoreUpdates(core, target);

    // NOTE: This call is recursively linking all nested objects
    //  which can cause recursive loops of `createObject` if `EchoReactiveHandler` is not set prior to this call.
    //  Do not change order.
    initCore(core, target);
    EchoReactiveHandler.instance.init(target);

    setSchemaPropertiesOnObjectCore(core, schema);
    setRelationSourceAndTarget(target, core, schema);

    if (meta && metaNotEmpty(meta)) {
      target[symbolInternals].setMeta(linkMetaRefs(target, meta));
    }

    // Now that the previous handler's metadata (parent, relation source/target,
    // type, ...) has been migrated into the document, remove the own properties it
    // left on the shared target so they don't shadow the ECHO system accessors.
    stripShadowingProperties(target);

    return obj as CreateObjectReturn<T>;
  } else {
    // The clean target carries no own data; `obj`'s properties are seeded onto it
    // only so `initCore` can migrate them into the document (then `init` clears them).
    const target = createRecordTarget(createInstanceState(core, DATA_NAMESPACE, []), obj as any);
    core.rootSchema = type;
    subscribeCoreUpdates(core, target);

    initCore(core, target);
    const proxy = createProxy<ProxyTarget>(target, EchoReactiveHandler.instance);
    setSchemaPropertiesOnObjectCore(core, schema);
    setRelationSourceAndTarget(target, core, schema);

    // Carry over `[MetaId]` from a non-reactive source (e.g. `Obj.makeStatic` /
    // internal `createObject`) which stamps it as a non-enumerable hidden
    // property, so `...(obj as any)` above doesn't pick it up. The reactive
    // proxy branch above does the equivalent via `Entity.getMeta`.
    const seededMeta = (obj as any)[MetaId] as EntityMeta | undefined;
    if (seededMeta && metaNotEmpty(seededMeta)) {
      core.setMeta(linkMetaRefs(target, seededMeta));
    }

    return proxy as unknown as CreateObjectReturn<T>;
  }
};

const metaNotEmpty = (meta: EntityMeta) =>
  meta.keys.length > 0 ||
  meta.tags.length > 0 ||
  (meta.annotations != null && Object.keys(meta.annotations).length > 0) ||
  meta.key !== undefined ||
  meta.version !== undefined;

/**
 * @internal
 */
// TODO(burdon): Call and remove subscriptions.
export const destroyObject = <T extends Obj.Unknown>(proxy: T) => {
  assertArgument(isEchoObject(proxy), 'proxy');
  const core = (getProxyTarget(proxy) as ProxyTarget)[symbolInternals];
  for (const unsubscribe of core.subscriptions) {
    unsubscribe();
  }
};

/**
 * Route the core's document updates to the target: drop the lazily-rebuilt schema-slot cache, then
 * notify — deferred to the change context's exit when one is open, so a batch of writes emits once,
 * and immediately otherwise (a sync from a peer).
 */
const subscribeCoreUpdates = (core: ObjectCore, target: ProxyTarget): void => {
  core.subscriptions.push(
    core.updates.on(() => {
      target[symbolInternals].cachedStaticSlot = undefined;
      if (isInChangeContext(core)) {
        queueNotification(core);
      } else {
        target[EventId]?.emit();
      }
    }),
  );
};

const initCore = (core: ObjectCore, target: ProxyTarget) => {
  // Handle ID pre-generated by `create`.
  if (PROPERTY_ID in target) {
    target[symbolInternals].id = target[PROPERTY_ID];
    delete target[PROPERTY_ID];
  }

  core.initNewObject(linkAllNestedProperties(target));

  // Handle parent reference set via [Obj.Parent] in Obj.make.
  const parentValue = (target as any)[ParentId];
  if (parentValue !== undefined) {
    const parentId = parentValue.id ?? parentValue;
    if (EntityId.isValid(parentId)) {
      core.setParent(EncodedReference.fromURI(EID.make({ entityId: parentId })));
    }
    delete (target as any)[ParentId];
  }
};

/**
 * @internal
 */
export const initEchoReactiveObjectRootProxy = (core: ObjectCore, database?: EchoDatabase): Entity.Unknown => {
  // Each core owns exactly one root proxy; callers must not call this twice on the same core.
  invariant(!core.rootProxy, 'ObjectCore already has a root proxy; bind to a fresh core instead.');
  core.database = database;
  const target = createRecordTarget(createInstanceState(core, DATA_NAMESPACE, []));

  // TODO(dmaretskyi): Does this need to be disposed?
  core.updates.on(() => {
    if (isInChangeContext(core)) {
      // Defer notification until the change context exits.
      queueNotification(core);
    } else {
      // Immediate notification for external changes (sync from peers).
      target[EventId]?.emit();
    }
  });

  const obj = createProxy<ProxyTarget>(target, EchoReactiveHandler.instance) as any;
  assertObjectModel(obj);

  // Identity, not structure, is this proxy's equality. Effect compares and hashes an unmarked object
  // by walking its properties, so two proxies over the same entity — a branch binding and the live
  // object, or two bindings of one branch — collapse into a single `Atom.family` entry keyed on
  // whichever came first. The survivor's `subscribe` targets a proxy the caller may already have
  // disposed, so the other binding's updates are never delivered.
  Equal.byReferenceUnsafe(obj);

  core.rootProxy = obj;
  return obj;
};

const validateSchema = (schema: Schema.Codec<any, any>) => {
  const dxn = getSchemaURI(schema);
  invariant(dxn, 'Schema must be defined via TypedObject.');
  const entityKind = getEntityKind(schema);
  invariant(entityKind === 'object' || entityKind === 'relation' || entityKind === 'type');
  SchemaValidator.validateSchema(schema);
};

const setSchemaPropertiesOnObjectCore = (core: ObjectCore, schema: Schema.Codec<any, any> | undefined) => {
  if (schema != null) {
    const uri = getSchemaURI(schema);
    invariant(uri, 'Schema must be defined via TypedObject.');
    core.setType(EncodedReference.fromURI(uri));

    const kind = getEntityKind(schema);
    invariant(kind);
    core.setKind(kind);
  }
};

const setRelationSourceAndTarget = (target: ProxyTarget, core: ObjectCore, schema: Schema.Top | undefined) => {
  const kind = schema && getEntityKind(schema);
  if (kind === EntityKind.Relation) {
    // `getSource` and `getTarget` don't work here since they assert entity kind.
    const sourceRef = (target as any)[RelationSourceId];
    const targetRef = (target as any)[RelationTargetId];
    if (!sourceRef || !targetRef) {
      throw new TypeError('Relation source and target must be specified');
    }
    if (!isProxy(sourceRef)) {
      throw new TypeError('source must be an ECHO object');
    }
    if (!isProxy(targetRef)) {
      throw new TypeError('target must be an ECHO object');
    }

    core.setSource(EncodedReference.fromURI(EchoReactiveHandler.instance.createRef(target, sourceRef)));
    core.setTarget(EncodedReference.fromURI(EchoReactiveHandler.instance.createRef(target, targetRef)));
  }
};

const validateInitialProps = (target: any, seen: Set<object> = new Set()) => {
  if (seen.has(target)) {
    return;
  }

  seen.add(target);
  for (const key in target) {
    const value = target[key];
    if (value === undefined) {
      delete target[key];
    } else if (typeof value === 'object') {
      if (Ref.isRef(value)) {
        // Pass refs as is.
      } else if (isTypedObjectProxy(value)) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      } else if ((value as any) instanceof Uint8Array) {
        // Pass binary buffers as is; Automerge stores them natively.
      } else {
        throwIfCustomClass(key, value);
        // Recurse on the raw record: a typed target stores its nested records as sub-proxies, and the
        // `delete` above would be a mutation outside `Obj.update` on one of those.
        validateInitialProps(isProxy(value) ? getProxyTarget(value) : value, seen);
      }
    }
  }
};

const linkAllNestedProperties = (target: ProxyTarget): DecodedAutomergePrimaryValue => {
  return deepMapValues(target, (value, recurse) => {
    if (Ref.isRef(value)) {
      return refToEncodedReference(target, value);
    }

    if (value instanceof Uint8Array) {
      return value;
    }

    return recurse(value);
  });
};

/**
 * Encodes any `Ref`s held in meta (e.g. `meta.tags`) to encoded references before persisting, since
 * `core.setMeta` (unlike the reactive `set` trap) does not run link assignment.
 */
const linkMetaRefs = (target: ProxyTarget, meta: EntityMeta): EntityMeta =>
  deepMapValues(meta, (value, recurse) => {
    if (Ref.isRef(value)) {
      return refToEncodedReference(target, value);
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    return recurse(value);
  }) as EntityMeta;

const refToEncodedReference = (target: ProxyTarget, ref: Ref<any>): EncodedReference => {
  const savedTarget = getRefSavedTarget(ref);
  if (savedTarget) {
    return EncodedReference.fromURI(EchoReactiveHandler.instance.createRef(target, savedTarget));
  } else {
    return EncodedReference.fromURI(ref.uri);
  }
};
