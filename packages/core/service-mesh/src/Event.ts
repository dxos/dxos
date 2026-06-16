//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Pipeable } from 'effect';
import * as Schema from 'effect/Schema';

export const TypeId = '~@dxos/service-mesh/Event' as const;

export type TypeId = typeof TypeId;

/**
 * Defines an event that can be sent between a service and its clients.
 * Events are fire-and-forget.
 * Events have a direction (server-to-client, client-to-server, both).
 * Event has a defined paylod schema.
 */
export interface Event<in out Tag extends string, in out Data extends unknown, in out _Direction extends Direction>
  extends Pipeable.Pipeable {
  new (_: never): {};
  readonly [TypeId]: TypeId;
  readonly _tag: Tag;
  readonly data: Schema.Schema<Data>;
  readonly direction: _Direction;
}

export interface Any extends Pipeable.Pipeable {
  readonly [TypeId]: TypeId;
  readonly _tag: string;
  readonly data: Schema.Schema<unknown>;
}

export type Direction = 'server-to-client' | 'client-to-server' | 'both';

export const make: {
  <Tag extends string, Data extends unknown, _Direction extends Direction>(
    tag: Tag,
    options: {
      direction: Direction;
      data: Schema.Schema<Data>;
    },
  ): Event<Tag, Data, _Direction>;
} = (tag, options) =>
  makeProto({
    _tag: tag,
    direction: options.direction,
    data: options.data,
  });

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return Pipeable.pipeArguments(this, arguments);
  },
};

const makeProto = <Tag extends string, Data extends unknown, _Direction extends Direction>(options: {
  _tag: Tag;
  direction: Direction;
  data: Schema.Schema<Data>;
}): Event<Tag, Data, _Direction> => {
  function Event() {}
  Object.setPrototypeOf(Event, Proto);
  Object.assign(Event, options);
  return Event as any;
};

/**
 * Instance type for the event.
 */
export interface Message<_Event extends Any> {
  readonly _tag: _Event['_tag'];
  readonly data: Schema.Schema<_Event['data']>;
}
