//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { Select } from '../components';

type Target = { value: string; label: string };

const targets: Target[] = [undefined, 'ws://localhost:5001', 'http://localhost:3967'].map((value) => ({
  value: value ?? '',
  label: value ?? 'default',
}));

const getTarget = (value: string): Target => targets.find((target) => target.value === value) ?? targets[0];

// TODO(burdon): Configurable (remember custom values).
export const VaultSelector = () => {
  const vault = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const target = searchParams.get('target');
    return getTarget(target ?? '');
  }, [window.location.search]);

  const handleSetVault = (value: string) => {
    const url = new URL(window.location.href);
    const target = getTarget(value);
    url.searchParams.set('target', target.value);
    window.location.href = url.href;
  };

  return <Select value={vault.value ?? ''} items={targets} onValueChange={(value) => handleSetVault(value)} />;
};
