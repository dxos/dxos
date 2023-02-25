//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Select } from '@dxos/react-components';
import { humanize } from '@dxos/util';

export type PublicKeySelectorProps = {
  keys: PublicKey[];
  defaultValue?: PublicKey;
  placeholder?: string;
  onChange?: (value: PublicKey) => any;
};

export const PublicKeySelector = (props: PublicKeySelectorProps) => {
  const { placeholder, keys, defaultValue, onChange } = props;
  return (
    <Select
      defaultValue={defaultValue?.toHex()}
      placeholder={placeholder}
      onValueChange={(id) => {
        id && onChange?.(PublicKey.fromHex(id));
      }}
    >
      {removeDuplicates(keys).map((key) => (
        <Select.Item value={key.toHex()} key={key.toHex()}>
          {humanize(key)} <span className='text-neutral-250'>{key.truncate(4)}</span>
        </Select.Item>
      ))}
    </Select>
  );
};

// TODO(burdon): Factor out.
const removeDuplicates = (keys: PublicKey[]) =>
  keys.reduce((acc, key) => {
    if (acc.some((accKey) => accKey.equals(key))) {
      // Already added.
      return acc;
    } else if (key !== undefined) {
      acc.push(key);
    }
    return acc;
  }, [] as PublicKey[]);
