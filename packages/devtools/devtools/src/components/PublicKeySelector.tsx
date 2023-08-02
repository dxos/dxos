//
// Copyright 2021 DXOS.org
//

import React, { FC } from 'react';

import { Select } from '@dxos/react-appkit';
import { PublicKey } from '@dxos/react-client';
import { humanize } from '@dxos/util';
import { log } from 'console';

export type PublicKeySelectorProps = {
  Icon?: FC;
  placeholder?: string;
  getLabel?: (key: PublicKey) => string;
  keys: PublicKey[];
  value?: PublicKey;
  onChange?: (value: PublicKey) => any;
};

export const PublicKeySelector = ({
  Icon,
  placeholder,
  getLabel = humanize,
  keys,
  value,
  onChange,
}: PublicKeySelectorProps) => {
  return (
    <Select
      placeholder={placeholder}
      value={value?.toHex()}
      onValueChange={(id) => {
        id && onChange?.(PublicKey.fromHex(id));
      }}
    >
      {removeDuplicates(keys).map((key) => (
        <Select.Item value={key.toHex()} key={key.toHex()}>
          <div className='flex items-center gap-2'>
            {Icon && (
              <div className='pr-1'>
                <Icon />
              </div>
            )}
            <span className='font-mono text-neutral-250'>{key.truncate()}</span>
            {getLabel(key)}
          </div>
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
