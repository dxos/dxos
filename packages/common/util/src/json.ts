//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { PublicKey } from '@dxos/keys';

import { humanize } from './human-hash';

/**
 * JSON.stringify replacer.
 */
export function jsonReplacer(this: any, key: string, value: any): any {
  // TODO(burdon): Why is this represented as `{ type: 'Buffer', data }`.
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof value[inspect.custom] === 'function'
  ) {
    return value[inspect.custom]();
  }

  if (
    value !== null &&
    typeof value === 'object' &&
    value.type === 'Buffer' &&
    Array.isArray(value.data)
  ) {
    if (value.data.length === 32) {
      const key = Buffer.from(value.data);
      return `[${humanize(key)}]:[${PublicKey.stringify(key)}]`;
    } else {
      return Buffer.from(value.data).toString('hex');
    }
  }

  // TODO(burdon): Option.
  // code if (Array.isArray(value)) {
  // code   return value.length;
  // code } else {
  return value;
  // code }
}
