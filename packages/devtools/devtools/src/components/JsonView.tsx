//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
// eslint-disable-next-line no-restricted-imports
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import styleDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
// eslint-disable-next-line no-restricted-imports
import styleLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { useThemeContext } from '@dxos/react-ui';
import { arrayToBuffer } from '@dxos/util';

export const JsonView: FC<{ data?: Object; truncate?: boolean }> = ({ data, truncate = true }) => {
  const { themeMode } = useThemeContext();
  console.log('JsonView', themeMode);
  return (
    <SyntaxHighlighter language='json' style={themeMode === 'dark' ? styleDark : styleLight} className='w-full'>
      {JSON.stringify(data, replacer(truncate), 2)}
    </SyntaxHighlighter>
  );
};

// TODO(burdon): Factor out.
// TODO(mykola): Add proto schema. Decode bytes.
// TODO(mykola): Write our own recursive replacing, to avoid double serialization.
const replacer =
  (truncate = false) =>
  (key: any, value: any) => {
    // TODO(dmaretskyi): Overly aggressive and breaks lots of other strings.
    // if (typeof value === 'string') {
    //   if (truncate) {
    //     const k = PublicKey.safeFrom(value);
    //     if (k) {
    //       return k.truncate();
    //     }
    //   }
    // }

    if (typeof value === 'object') {
      if (truncate) {
        if (value instanceof PublicKey) {
          return value.truncate();
        }
      }

      if (value instanceof Uint8Array) {
        return arrayToBuffer(value).toString('hex');
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
