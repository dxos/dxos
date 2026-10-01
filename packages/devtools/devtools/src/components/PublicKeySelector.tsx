//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { Next } from '@dxos/react-ui/next';
import { humanize } from '@dxos/util';

export type PublicKeySelectorProps = {
  placeholder: string;
  keys: PublicKey[];
  value?: PublicKey;
  getLabel?: (key: PublicKey) => string;
  onChange?: (key: PublicKey) => any;
};

export const PublicKeySelector = ({
  placeholder,
  getLabel = humanize,
  keys,
  value,
  onChange,
}: PublicKeySelectorProps) => {
  return (
    <Next.Select.Root
      value={value?.toHex()}
      onValueChange={(id) => {
        id && onChange?.(PublicKey.fromHex(id));
      }}
    >
      <Next.Select.Trigger placeholder={placeholder} />
      <Next.Select.Content>
        {removeDuplicates(keys).map((key) => (
          <Next.Select.Item key={key.toHex()} value={key.toHex()}>
            <div className='flex items-center gap-2'>
              <span className='font-mono text-neutral-250'>{key.truncate()}</span>
              {getLabel(key)}
            </div>
          </Next.Select.Item>
        ))}
      </Next.Select.Content>
    </Next.Select.Root>
  );
};

// TODO(burdon): Factor out.
const removeDuplicates = (keys: PublicKey[]) =>
  keys.reduce<PublicKey[]>((result, key) => {
    if (key !== undefined && !result.some((existing) => existing.equals(key))) {
      result.push(key);
    }

    return result;
  }, []);
