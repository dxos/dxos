//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { Next } from '@dxos/react-ui';
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
  const items = removeDuplicates(keys).map((key) => ({
    value: key.toHex(),
    label: `${key.truncate()} ${getLabel(key)}`,
  }));
  return (
    <Next.Select.Root
      items={items}
      value={value ? [value.toHex()] : []}
      onValueChange={({ value: [id] }) => {
        id && onChange?.(PublicKey.fromHex(id));
      }}
    >
      <Next.Select.Trigger placeholder={placeholder} />
      <Next.Select.Content>
        {items.map((item) => (
          <Next.Select.Item key={item.value} item={item} />
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
