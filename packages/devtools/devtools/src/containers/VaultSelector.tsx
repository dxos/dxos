//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { Select } from '@dxos/react-appkit';

// TODO(burdon): Configurable (remember custom values).
const targets = [
  { label: 'No remote target', value: '' },
  { label: 'localhost:3967', value: 'http://localhost:3967' },
  { label: 'halo.dxos.org', value: 'https://halo.dxos.org' },
  { label: 'halo.dev.dxos.org', value: 'https://halo.dev.dxos.org' },
];

export const VaultSelector = () => {
  const vault = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const target = searchParams.get('target');
    const vault = targets.find(({ value }) => value !== '' && target?.indexOf(value) !== -1) ?? targets[0];
    return vault.value;
  }, []);

  const handleSetVault = (vault: string) => {
    const url = new URL(window.location.href);
    window.location.href = url.origin + (vault !== '' ? '?target=vault:' + vault + '/vault.html' : '') + url.hash;
  };

  return (
    <Select value={vault} onValueChange={(value) => handleSetVault(value)}>
      {targets.map(({ label, value }) => (
        <Select.Item key={value} value={value} className='font-mono'>
          {label}
        </Select.Item>
      ))}
    </Select>
  );
};
