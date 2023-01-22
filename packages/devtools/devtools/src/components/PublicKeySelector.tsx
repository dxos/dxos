//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Selector } from '@dxos/kai';
import { PublicKey } from '@dxos/keys';
import { ComplexSet } from '@dxos/util';

// TODO(burdon): Factor out.
const removeDuplicates = (keys: PublicKey[]) => {
  const set = new ComplexSet(PublicKey.hash, keys);
  return Array.from(set.values());
};

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
      title: key.truncate(4)
    }))}
    value={value?.toHex()}
    placeholder={placeholder}
    onSelect={(key) => {
      key && onSelect(PublicKey.fromHex(key));
    }}
  />
);
