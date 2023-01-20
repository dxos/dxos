//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Selector } from '@dxos/kai';
import { PublicKey } from '@dxos/keys';
import { ComplexSet, humanize } from '@dxos/util';

interface PublicKeySelectorProps {
  id?: string;
  placeholder?: string;
  keys: PublicKey[];
  value: PublicKey | undefined;
  onSelect: (value: PublicKey | undefined) => void;
}

const dropDoubledKeys = (keys: PublicKey[]) => {
  const set = new ComplexSet(PublicKey.hash, keys);
  return Array.from(set.values());
};

export const PublicKeySelector = ({
  id = 'key-select',
  placeholder = 'Key',
  keys,
  value,
  onSelect
}: PublicKeySelectorProps) => (
  <div id={id}>
    <Selector
      options={dropDoubledKeys(keys).map((key) => ({
        id: key.toHex(),
        title: humanize(key)
      }))}
      value={value?.toHex()}
      placeholder={placeholder}
      onSelect={(key) => {
        key && onSelect(PublicKey.fromHex(key));
      }}
    />
  </div>
);
