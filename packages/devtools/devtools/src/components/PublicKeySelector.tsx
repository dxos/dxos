//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Selector } from '@dxos/kai';
import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

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

export type PublicKeySelectorProps = {
  placeholder?: string;
  keys: PublicKey[];
  value: PublicKey | undefined;
  onSelect: (value: PublicKey | undefined) => void;
};

// TODO(burdon): Why is this wrapper needed? Remove?
export const PublicKeySelector = ({ placeholder, keys, value, onSelect }: PublicKeySelectorProps) => (
  <Selector
    options={removeDuplicates(keys).map((key) => ({
      id: key.toHex(),
      title: `${key.truncate(4)} [${humanize(key)}]`
    }))}
    value={value?.toHex()}
    placeholder={placeholder}
    onSelect={(id) => {
      id && onSelect(PublicKey.fromHex(id));
    }}
  />
);
