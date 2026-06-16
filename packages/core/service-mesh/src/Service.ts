import { Rpc, RpcGroup } from '@effect/rpc';
import { Pipeable } from 'effect';

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
}

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
