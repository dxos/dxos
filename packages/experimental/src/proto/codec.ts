//
// Copyright 2020 DXOS.org
//

import { humanize, keyToString } from '@dxos/crypto';
import { Codec } from '@dxos/codec-protobuf';

import TestingSchema from './gen/testing.json';

// TODO(burdon): Create generic for Codec.
export const codec = new Codec('dxos.echo.testing.FeedMessage')
  .addJson(TestingSchema)
  .build();

/**
 * Creates a statically checked message, with optional ANY type.
 * @param data
 * @param typeUrl
 */
export function createMessage<T> (data: T, typeUrl?: string): T {
  return typeUrl ? Object.assign({
    __type_url: typeUrl
  }, data) : data;
}

/**
 * JSON.stringify replacer.
 */
export function jsonReplacer (this: any, key: string, value: any): any {
  // TODO(burdon): Why is this represented as { type: 'Buffer', data }
  if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    const key = Buffer.from(value.data);
    return `[${humanize(key)}]:[${keyToString(key)}]`;
  }

  if (Array.isArray(value)) {
    return value.length;
  } else {
    return value;
  }
}
