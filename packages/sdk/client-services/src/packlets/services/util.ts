//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

export const ClientServicesProviderResource = Symbol.for('dxos.resource.ClientServices');

// TODO(burdon): Move to util.

export type JsonStringifyOptions = {
  truncate?: boolean;
  humanize?: boolean;
};

export const jsonStringify = <T>(data: T, options: JsonStringifyOptions) => {
  if (options.humanize || options.truncate) {
    return JSON.parse(JSON.stringify(data, jsonKeyReplacer(options)));
  }

  return data;
};

const jsonKeyReplacer = (options: JsonStringifyOptions) => (key: string, value: any) => {
  if (typeof value === 'string') {
    // Infer if key.
    const key = PublicKey.fromHex(value);
    if (key.toHex() === value) {
      return options.humanize ? humanize(key) : key.truncate();
    }
  }

  return value;
};
