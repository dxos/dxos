//
// Copyright 2020 DXOS.org
//

import { humanize, keyToString } from '@dxos/crypto';

/**
 * JSON.stringify replacer.
 */
export function jsonReplacer (this: any, key: string, value: any): any {
  // TODO(burdon): Why is this represented as { type: 'Buffer', data }
  if (value !== null && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    if (value.data.length === 32) {
      const key = Buffer.from(value.data);
      return `[${humanize(key)}]:[${keyToString(key)}]`;
    } else {
      const buf = Buffer.from(value.data);
      return (buf as any).inspect();
    }
  }

  // TODO(burdon): Option.
  // if (Array.isArray(value)) {
  //   return value.length;
  // } else {
  return value;
  // }
}
