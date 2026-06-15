//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { Select } from '../components';

type Target = { value: string; label: string };

const targets: Target[] = ['default', 'ws://localhost:5001', 'http://localhost:3967'].map((value) => ({
  value,
  label: value,
}));

const parseTarget = (value?: string): Target => targets.find((target) => target.value === value) ?? targets[0];

export const getTarget = () => {
  const searchProps = new URLSearchParams(window.location.search);
  const target = searchProps.get('target');
  return parseTarget(target ?? '');
};

export const VaultSelector = () => {
  const vault = useMemo(() => getTarget(), [window.location.search]);

  const handleSetVault = (value: string) => {
    const url = new URL(window.location.href);
    const target = parseTarget(value);
    url.searchParams.set('target', target.value);
    window.location.href = url.href;
  };

  return <Select value={vault.value} items={targets} onValueChange={(value) => handleSetVault(value)} />;
};
