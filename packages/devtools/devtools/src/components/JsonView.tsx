//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
// eslint-disable-next-line no-restricted-imports
import { JSONTree } from 'react-json-tree';

import { schema } from '@dxos/protocols';

// TODO(mykola): Add proto schema. Decode bytes.
export const JsonView: FC<{ data?: Object; className?: string }> = ({ data, className }) => {
  // TODO(mykola): Write our own recursive replacing, to avoid double serialization.
  const replaced = JSON.parse(JSON.stringify(data ?? {}, replacer));

  return (
    <div className={className}>
      <JSONTree data={replaced} theme='monokai' invertTheme={true} />
    </div>
  );
};

const replacer = (key: string, value: any) => {
  if (typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString('hex');
    }
    if (value?.type === 'Buffer') {
      return Buffer.from(value.data).toString('hex');
    }
    if (value?.['@type'] === 'google.protobuf.Any') {
      try {
        const codec = schema.getCodecForType(value.type_url);
        return {
          '@type': value.type_url,
          ...codec.decode(value.value),
        };
      } catch {}
    }
  }
  return value;
};
