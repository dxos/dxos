import { Rpc, RpcGroup } from '@effect/rpc';
import { Pipeable, type Context, type Effect, type Layer } from 'effect';

import * as Event from './Event';

export const TypeId = '~@dxos/service-mesh/Service' as const;

export type TypeId = typeof TypeId;

export interface Service<in out Tag extends string, in out R extends Rpc.Any, in out E extends Event.Any>
  extends Pipeable.Pipeable {
  new (_: never): {};
  readonly [TypeId]: TypeId;
  readonly _tag: Tag;
  readonly rpcGroup: RpcGroup.RpcGroup<R>;
  readonly events: readonly E[];

  toLayerEventHandler: <EX = never, RX = never>(
    build: EventHandlerFrom<E> | Effect.Effect<EventHandlerFrom<E>, EX, RX>,
  ) => Layer.Layer<EventHandler<Tag>, EX, RX>;
}

export interface Any extends Pipeable.Pipeable {
  readonly [TypeId]: TypeId;
  new (_: never): {};
  readonly _tag: string;
  readonly rpcGroup: RpcGroup.RpcGroup<any>;
  readonly events: readonly Event.Any[];
}

export type Tag<S extends Any> = S extends Service<infer Tag, infer R, infer E> ? Tag : never;
export type Rpcs<S extends Any> = S extends Service<infer Tag, infer R, infer E> ? R : never;
export type Events<S extends Any> = S extends Service<infer Tag, infer R, infer E> ? E : never;

export const make: {
  <Tag extends string, R extends Rpc.Any, E extends Event.Any>(
    tag: Tag,
    options: {
      rpc: RpcGroup.RpcGroup<R>;
      events: readonly E[];
    },
  ): Service<Tag, R, E>;
} = (tag, options) =>
  makeProto({
    _tag: tag,
    rpcGroup: options.rpc,
    events: options.events,
  });

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return Pipeable.pipeArguments(this, arguments);
  },
};

const makeProto = <Tag extends string, R extends Rpc.Any, E extends Event.Any>(options: {
  _tag: Tag;
  rpcGroup: RpcGroup.RpcGroup<R>;
  events: readonly E[];
}): Service<Tag, R, E> => {
  function Service() {}
  Object.setPrototypeOf(Service, Proto);
  Object.assign(Service, options);
  return Service as any;
};

export interface EventHandler<ServiceTag> {
  readonly _: unique symbol;
  readonly serviceTag: ServiceTag;
  readonly event: Event.Any;
  readonly handler: (event: unknown) => Effect.Effect<void>;
}

export type ToEventHandler<S extends Any> = S extends Service<infer Tag, infer R, infer E> ? EventHandler<Tag> : never;

export type EventHandlerFrom<E extends Event.Any> = (event: Event.MessageOf<E>) => Effect.Effect<void>;

export type HandersFor<S extends Any> =
  S extends Service<infer Tag, infer R, infer E> ? Rpc.ToHandler<Rpcs<S>> | EventHandler<Tag> : never;
