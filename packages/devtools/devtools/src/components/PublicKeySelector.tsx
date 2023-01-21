//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Selector } from '@dxos/kai';
import { PublicKey } from '@dxos/keys';
import { ComplexSet, humanize } from '@dxos/util';

// TODO(burdon): Factor out.
const removeDuplicates = (keys: PublicKey[]) => {
  const set = new ComplexSet(PublicKey.hash, keys);
  return Array.from(set.values());
};

interface PublicKeySelectorProps {
  id?: string;
  placeholder?: string;
  keys: PublicKey[];
  value: PublicKey | undefined;
  onSelect: (value: PublicKey | undefined) => void;
}

// TODO(burdon): Why is this wrapper needed? Remove?
export const PublicKeySelector = ({
  id = 'key-select', // TODO(burdon): Why is id needed?
  placeholder = 'Key',
  keys,
  value,
  onSelect
}: PublicKeySelectorProps) => (
  <div id={id}>
    <Selector
      options={removeDuplicates(keys).map((key) => ({
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
