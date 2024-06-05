//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
// eslint-disable-next-line no-restricted-imports
import { JSONTree } from 'react-json-tree';

// Importing light & async version directly from dist to avoid any chance of the heavy one being loaded.
// https://www.npmjs.com/package/react-syntax-highlighter#async-build
// eslint-disable-next-line no-restricted-imports
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light-async';
// eslint-disable-next-line no-restricted-imports
import styleDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
// eslint-disable-next-line no-restricted-imports
import styleLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { arrayToBuffer } from '@dxos/util';

export const JsonView: FC<{ data?: Object; truncate?: boolean }> = ({ data, truncate = true }) => {
  const { themeMode } = useThemeContext();
  return (
    <SyntaxHighlighter language='json' style={themeMode === 'dark' ? styleDark : styleLight} className='w-full'>
      {JSON.stringify(data, replacer(truncate), 2)}
    </SyntaxHighlighter>
  );
};

// TODO(burdon): Light/dark mode.
// https://github.com/gaearon/base16-js/tree/master/src
const theme = {
  scheme: 'dxos',
  author: 'DXOS',
  base00: '#ffffff',
  base01: '#302e00',
  base02: '#5f5b17',
  base03: '#6c6823',
  base04: '#86813b',
  base05: '#948e48',
  base06: '#ccc37a',
  base07: '#faf0a5',
  base08: '#c35359',
  base09: '#b36144',
  base0A: '#a88339',
  base0B: '#18974e',
  base0C: '#75a738',
  base0D: '#477ca1',
  base0E: '#8868b3',
  base0F: '#b3588e',
};

export const JsonTreeView: FC<{
  data?: Object;
  className?: string;
  level?: number;
  showRoot?: boolean;
  showMeta?: boolean;
}> = ({ data, className, level = 3, showRoot = false, showMeta = false }) => {
  const replaced = JSON.parse(JSON.stringify(data ?? {}, replacer()));

  return (
    <div className={mx('m-2', className)}>
      <JSONTree
        data={replaced}
        hideRoot={!showRoot}
        getItemString={showMeta ? undefined : () => null}
        shouldExpandNodeInitially={(_, __, _level) => _level < level}
        labelRenderer={([key]) => key}
        // TODO(burdon): Fix.
        /*
        valueRenderer={(key, value) => {
          return replacer('', value);
        }}
        */

        theme={{
          extend: theme,
          valueLabel: {
            textDecoration: 'underline',
          },
        }}
      />
    </div>
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
