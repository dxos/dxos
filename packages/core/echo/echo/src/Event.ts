//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { type EID, type EntityId, type URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from './Database.ts';
import * as Entity from './Entity.ts';
import * as Error from './Error.ts';
import * as internal from './internal/index.ts';
import * as objInternal from './internal/Obj/index.ts';
import type * as Ref from './Ref.ts';
import * as Type from './Type.ts';

/**
 * An immutable entry in an object's event feed.
 *
 * Events have an id, a URI and a user-defined type (see `Type.makeEvent`), and may hold references
 * to objects and relations. They cannot have a parent, cannot be the target of a reference or a
 * relation, and cannot be changed once made. They reach storage only through `Obj.appendEvents`.
 */
export interface Unknown extends Entity.OfKind<typeof Entity.Kind.Event> {}

/**
 * Event with arbitrary properties.
 */
export interface Any extends Unknown {
  [key: string]: unknown;
}

/**
 * Event of a specific shape.
 */
export type OfShape<T> = T & Unknown;

/**
 * JSON representation of an event.
 */
export type JSON = internal.ObjectJSON;

/**
 * Properties accepted by {@link make}: the type's fields, with an optional id and meta.
 */
export type MakeProps<T extends Type.AnyEvent> = {
  id?: EntityId;
  [internal.MetaId]?: Partial<internal.EntityMeta>;
} & Entity.Properties<Type.InstanceType<T>>;

/**
 * Creates an event of the given type.
 *
 * The event is immutable: `Entity.update` / `Obj.update` throw, and a direct assignment throws as it
 * does for any entity outside an update. Its creation time is recorded for {@link getTimestamp}.
 *
 * @example
 * ```ts
 * const viewed = Event.make(Viewed, { by: 'alice' });
 * Obj.appendEvents(document, [viewed]);
 * ```
 */
export function make<T extends Type.AnyEvent>(type: T, props: NoInfer<MakeProps<T>>): OfShape<Type.InstanceType<T>>;
export function make(type: Type.AnyEvent, props: any): Unknown {
  const schema = Type.getSchema(type);
  assertArgument(internal.getTypeAnnotation(schema)?.kind === Entity.Kind.Event, 'schema', 'Expected an event schema');
  if (internal.ParentId in props) {
    throw new Error.EventNotSupportedError('parent');
  }

  let meta: Partial<internal.EntityMeta> | undefined;
  if (props[internal.MetaId] != null) {
    meta = props[internal.MetaId];
    delete props[internal.MetaId];
  }

  const data = Object.fromEntries(Object.entries(props).filter(([_, value]) => value !== undefined));
  const event = internal.makeObject(schema, data, { keys: [], tags: [], annotations: {}, ...meta }, type);
  invariant(isEvent(event), 'Event.make produced a non-event entity');
  internal.defineHiddenProperty(event, internal.EventTimestampId, Date.now());
  return event;
}

/**
 * Determine if a value is an ECHO event.
 */
export const isEvent = (value: unknown): value is Unknown => internal.isEventEntity(value);

/**
 * Test if a value is an event of the given type.
 */
export const instanceOf = <T extends Type.AnyEvent>(type: T, value: unknown): value is Type.InstanceType<T> => {
  const entityType: Type.AnyEntity = type;
  return isEvent(value) && internal.isInstanceOf(entityType, value);
};

/**
 * Get the event's URI.
 */
export const getURI = (event: Unknown, options?: internal.GetURIOptions): URI.URI => {
  assertArgument(!Schema.isSchema(event), 'event', 'Event should not be a schema.');
  return internal.getUri(event, options);
};

/**
 * Get the URI of the event's type.
 */
export const getTypeURI = (event: Unknown): URI.URI => {
  const type = internal.getTypeURI(event);
  invariant(type != null, 'Corrupted event: missing type.');
  return type;
};

/**
 * Get the type entity the event was created from.
 */
export const getType = (event: Unknown): Type.AnyEvent | undefined =>
  internal.getType(event) as Type.AnyEvent | undefined;

/**
 * @returns The typename of the event's type.
 * @example `com.example.type.viewed`
 */
export const getTypename = (event: Unknown): string | undefined => internal.getTypename(event);

/**
 * Get the event's creation time (unix ms), recorded once by {@link make} and never changed.
 * `undefined` only for an event decoded from JSON that predates the timestamp.
 */
export const getTimestamp = (event: Unknown): number | undefined => {
  assumeType<{ [internal.EventTimestampId]?: number }>(event);
  return event[internal.EventTimestampId];
};

/**
 * Get the URI of the object whose event feed holds the event.
 * `undefined` until the event is appended with `Obj.appendEvents` or read back from a feed.
 */
export const getObjectURI = (event: Unknown): EID.EID | undefined => {
  assumeType<{ [internal.EventOwnerId]?: EID.EID }>(event);
  return event[internal.EventOwnerId];
};

/**
 * Get the database the event belongs to, once appended or read back.
 */
export const getDatabase = (event: Unknown): Database.Database | undefined => internal.getDatabase(event);

/**
 * Get the event's meta keys for the given source.
 */
export const getKeys = (event: Unknown, source: string) => internal.getKeys(event, source);

/**
 * Converts an event to its JSON representation.
 */
export const toJSON = (event: Unknown): JSON => objInternal.objectToJSON(event);

/**
 * Creates an event from its JSON representation, performing schema validation.
 */
export const fromJSON = async (
  json: unknown,
  options?: { refResolver?: Ref.Resolver; uri?: URI.URI; database?: Database.Database },
): Promise<Unknown> => {
  const entity = await objInternal.objectFromJSON(json, options);
  assertArgument(isEvent(entity), 'json', 'Expected an event');
  return entity;
};
