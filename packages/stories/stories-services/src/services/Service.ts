//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { BaseError } from '@dxos/errors';

/** No host this consumer can reach provides the contract; `context` names the key and the unmet features. */
export class NotAvailableError extends BaseError.extend('ServiceNotAvailableError', 'No provider for the service.') {}

/** The provider failed, or the call did not survive the wire; `context` names the key and the member. */
export class CallError extends BaseError.extend('ServiceCallError', 'The service call failed.') {}

export type Failure = NotAvailableError | CallError;

/** One method of a contract: a payload schema, a result schema, and whether the result is a stream. */
export type MethodSpec = {
  readonly payload: Schema.Top;
  readonly success: Schema.Top;
  readonly stream?: boolean;
};

/** What a contract declares: methods, reactive properties and events, each with a schema. */
export type Shape = {
  readonly methods: Readonly<Record<string, MethodSpec>>;
  readonly properties: Readonly<Record<string, Schema.Top>>;
  readonly events: Readonly<Record<string, Schema.Top>>;
};

type TypeOf<S> = S extends Schema.Top ? Schema.Schema.Type<S> : never;

export type Method<M extends MethodSpec> = M extends { readonly stream: true }
  ? (payload: TypeOf<M['payload']>) => Stream.Stream<TypeOf<M['success']>, Failure>
  : (payload: TypeOf<M['payload']>) => Effect.Effect<TypeOf<M['success']>, Failure>;

/** A reactive value of a service: its current value and every later one. */
export interface Property<A> {
  readonly get: Effect.Effect<A, Failure>;
  /** Emits the current value first. */
  readonly changes: Stream.Stream<A, Failure>;
}

/**
 * What a consumer holds, and what a provider implements: the same type, so a provider in the
 * consumer's host is called directly with nothing in between.
 */
export type Client<S extends Shape> = {
  readonly [K in keyof S['methods']]: Method<S['methods'][K]>;
} & {
  readonly [K in keyof S['properties']]: Property<TypeOf<S['properties'][K]>>;
} & {
  readonly [K in keyof S['events']]: Stream.Stream<TypeOf<S['events'][K]>, Failure>;
};

/** A contract with its shape erased, for registries that hold every contract behind one type. */
export interface AnyContract {
  readonly key: string;
  readonly version: string;
  readonly shape: Shape;
  /** The wire form: one rpc per method, two per property, one per event, each tag under `<key>/`. */
  readonly group: RpcGroup.RpcGroup<Rpc.Any>;
}

declare const RequirementTypeId: unique symbol;

/**
 * What an Effect requires once it yields a contract: the service with that key. It is a type only,
 * and names the key so a missing service reads as the contract that was not provided.
 */
export interface Requirement<Key extends string> {
  readonly [RequirementTypeId]: Key;
}

/**
 * A contract is also the Effect service key of its client: an Effect yields it to get the client,
 * the contract's `Requirement` then shows in the Effect's requirements, and an operation lists it in
 * `services`. A host provides it with `ServiceHost.layer`.
 */
export interface Contract<Key extends string, S extends Shape>
  extends AnyContract, Context.Service<Requirement<Key>, Client<S>> {
  readonly key: Key;
  readonly shape: S;
}

/** An error as it crosses the wire; the classes above do not survive encoding. */
const WireError = Schema.Struct({ message: Schema.String });

type Member = 'call' | 'get' | 'watch' | 'on';

/** The rpc tag of a contract member. A contract is identified by its key string, never by object identity. */
export const tag = (key: string, member: Member, name: string): string => `${key}/${member}/${name}`;

/** The prefix a host's router serves a contract under. */
export const prefix = (key: string): string => `${key}/`;

/**
 * Defines a contract. `key` is an NSID and `version` a semver of the interface.
 */
export const make = <const Key extends string, const S extends Shape>(
  key: Key,
  spec: { readonly version: string } & S,
): Contract<Key, S> => {
  const rpcs: Rpc.Any[] = [];
  for (const [name, method] of Object.entries(spec.methods)) {
    rpcs.push(
      Rpc.make(tag(key, 'call', name), {
        payload: method.payload,
        success: method.success,
        error: WireError,
        stream: method.stream === true,
      }),
    );
  }
  for (const [name, schema] of Object.entries(spec.properties)) {
    rpcs.push(Rpc.make(tag(key, 'get', name), { success: schema, error: WireError }));
    rpcs.push(Rpc.make(tag(key, 'watch', name), { success: schema, error: WireError, stream: true }));
  }
  for (const [name, schema] of Object.entries(spec.events)) {
    rpcs.push(Rpc.make(tag(key, 'on', name), { success: schema, error: WireError, stream: true }));
  }

  // The contract's key is the service key, so one string names the contract on the wire and in a context.
  return Object.assign(Context.Service<Requirement<Key>, Client<S>>(key), {
    key,
    version: spec.version,
    shape: { methods: spec.methods, properties: spec.properties, events: spec.events } as S,
    group: RpcGroup.make(...rpcs),
  });
};

/**
 * Whether a provider at `provided` satisfies a consumer built against `wanted`: the same major
 * version and an equal or higher minor.
 */
export const satisfies = (provided: string, wanted: string): boolean => {
  const [providedMajor, providedMinor = 0] = provided.split('.').map(Number);
  const [wantedMajor, wantedMinor = 0] = wanted.split('.').map(Number);
  return providedMajor === wantedMajor && providedMinor >= wantedMinor;
};

//
// Provider
//

/** What a host gives a provider when it activates it. */
export interface ProviderContext {
  readonly hostId: string;
  /** A feature of the host, which the provider declared in `needs`. */
  readonly feature: <T>(name: string) => T;
}

/** A provider with its shape erased. */
export interface AnyProvider {
  readonly contract: AnyContract;
  /** Host features the provider cannot run without. */
  readonly needs: readonly string[];
  readonly make: (context: ProviderContext) => Effect.Effect<unknown, never, Scope.Scope>;
}

export interface Provider<S extends Shape> extends AnyProvider {
  readonly make: (context: ProviderContext) => Effect.Effect<Client<S>, never, Scope.Scope>;
}

/** Declares that a plugin implements `contract`, and what its host must have. */
export const provide = <Key extends string, S extends Shape>(
  contract: Contract<Key, S>,
  options: {
    readonly needs?: readonly string[];
    readonly make: (context: ProviderContext) => Effect.Effect<Client<S>, never, Scope.Scope>;
  },
): Provider<S> => ({ contract, needs: options.needs ?? [], make: options.make });

//
// Wire
//

const toWire = (error: unknown) => ({ message: error instanceof Error ? error.message : String(error) });

/** A member of an implementation, as the wire handlers read it. */
type Implementation = Record<string, unknown>;

type WireHandler = (payload: unknown) => unknown;

const isProperty = (value: unknown): value is Property<unknown> =>
  typeof value === 'object' && value !== null && 'get' in value && 'changes' in value;

/**
 * The rpc handlers that serve `implementation` to another host, keyed by tag. The implementation
 * is typed by its contract where it is written; here it is read member by member by name.
 */
export const toHandlers = (contract: AnyContract, implementation: Implementation): Record<string, WireHandler> => {
  const handlers: Record<string, WireHandler> = {};
  for (const [name, method] of Object.entries(contract.shape.methods)) {
    const member = implementation[name];
    handlers[tag(contract.key, 'call', name)] = (payload) => {
      const result = typeof member === 'function' ? member(payload) : undefined;
      if (method.stream === true) {
        return Stream.isStream(result) ? Stream.mapError(result, toWire) : Stream.fail(toWire('not a stream'));
      }
      return Effect.isEffect(result) ? Effect.mapError(result, toWire) : Effect.fail(toWire('not an effect'));
    };
  }
  for (const name of Object.keys(contract.shape.properties)) {
    const member = implementation[name];
    handlers[tag(contract.key, 'get', name)] = () =>
      isProperty(member) ? Effect.mapError(member.get, toWire) : Effect.fail(toWire('not a property'));
    handlers[tag(contract.key, 'watch', name)] = () =>
      isProperty(member) ? Stream.mapError(member.changes, toWire) : Stream.fail(toWire('not a property'));
  }
  for (const name of Object.keys(contract.shape.events)) {
    const member = implementation[name];
    handlers[tag(contract.key, 'on', name)] = () =>
      Stream.isStream(member) ? Stream.mapError(member, toWire) : Stream.fail(toWire('not an event'));
  }
  return handlers;
};

/** A flattened rpc client: one function over every tag of a group. */
export type WireCall = (tag: string, payload: unknown) => unknown;

/**
 * The client a consumer holds when the provider is in another host: every member calls `call`
 * with the member's tag. `call` is the flattened rpc client of the contract's group.
 */
export const toStub = <Key extends string, S extends Shape>(contract: Contract<Key, S>, call: WireCall): Client<S> => {
  const failure = (member: string) => (cause: unknown) =>
    new CallError({ cause, context: { key: contract.key, member } });
  const effect = (member: Member, name: string, payload: unknown): Effect.Effect<unknown, Failure> => {
    const result = call(tag(contract.key, member, name), payload);
    return Effect.isEffect(result)
      ? Effect.mapError(result as Effect.Effect<unknown, unknown>, failure(name))
      : Effect.fail(failure(name)('not an effect'));
  };
  const stream = (member: Member, name: string, payload: unknown): Stream.Stream<unknown, Failure> => {
    const result = call(tag(contract.key, member, name), payload);
    return Stream.isStream(result)
      ? Stream.mapError(result as Stream.Stream<unknown, unknown>, failure(name))
      : Stream.fail(failure(name)('not a stream'));
  };

  const client: Record<string, unknown> = {};
  for (const [name, method] of Object.entries(contract.shape.methods)) {
    client[name] =
      method.stream === true
        ? (payload: unknown) => stream('call', name, payload)
        : (payload: unknown) => effect('call', name, payload);
  }
  for (const name of Object.keys(contract.shape.properties)) {
    const property: Property<unknown> = {
      get: Effect.suspend(() => effect('get', name, undefined)),
      changes: Stream.suspend(() => stream('watch', name, undefined)),
    };
    client[name] = property;
  }
  for (const name of Object.keys(contract.shape.events)) {
    client[name] = Stream.suspend(() => stream('on', name, undefined));
  }
  // The record was built member by member from the contract's own shape, which is what `Client<S>` maps over.
  return client as Client<S>;
};
