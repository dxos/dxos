//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { mx } from '@dxos/aurora-theme';
import { schema } from '@dxos/protocols';

// TODO(mykola): Add proto schema. Decode bytes.
export const JsonView: FC<{ data?: Object; className?: string }> = ({ data, className }) => {
  return (
    <SyntaxHighlighter className={mx('flex flex-1 text-xs', className)} language='json' style={style}>
      {JSON.stringify(data, replacer, 2)}
    </SyntaxHighlighter>
  );
};

const replacer = (key: string, value: any) => {
  if (typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString('hex');
    }
    if (value?.type === 'Buffer') {
      return Buffer.from(value.data).toString('hex');
    } else if (value?.['@type'] === 'google.protobuf.Any') {
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
