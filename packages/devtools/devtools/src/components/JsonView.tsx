//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
// eslint-disable-next-line no-restricted-imports
import { JSONTree } from 'react-json-tree';

import { mx } from '@dxos/aurora-theme';
import { schema } from '@dxos/protocols';

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

// const getItemString = (type: string) => <span className='text-sm'>[{type}]</span>;

export const JsonView: FC<{
  data?: Object;
  className?: string;
  level?: number;
  showRoot?: boolean;
  showMeta?: boolean;
}> = ({ data, className, level = 3, showRoot = false, showMeta = false }) => {
  // TODO(mykola): Add proto schema. Decode bytes.
  // TODO(mykola): Write our own recursive replacing, to avoid double serialization.
  const replaced = JSON.parse(JSON.stringify(data ?? {}, replacer));

  return (
    <div className={mx('m-2', className)}>
      <JSONTree
        hideRoot={!showRoot}
        theme={{
          extend: theme,
          valueLabel: {
            textDecoration: 'underline',
          },
        }}
        getItemString={showMeta ? undefined : () => null}
        data={replaced}
        shouldExpandNodeInitially={(_, __, _level) => _level < level}
        labelRenderer={([key]) => key}
        // TODO(burdon): Fix.
        /*
        valueRenderer={(key, value) => {
          return replacer('', value);
        }}
        */
      />
    </div>
  );
};

const replacer = (key: any, value: any) => {
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
