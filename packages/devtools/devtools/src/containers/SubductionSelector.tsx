//
// Copyright 2025 DXOS.org
//

import merge from 'lodash.merge';
import React, { useMemo } from 'react';

import { SaveConfig, Storage } from '@dxos/config';
import { useConfig } from '@dxos/react-client';
import { Input } from '@dxos/react-ui';

import { getTarget } from './VaultSelector';

export const SubductionSelector = () => {
  const config = useConfig();
  const target = useMemo(() => getTarget(), [window.location.search]);
  const enabled = !!config.values.runtime?.client?.edgeFeatures?.subductionReplicator;

  const handleToggle = async (checked: boolean) => {
    const existing = await Storage();
    await SaveConfig(
      merge({}, existing, {
        runtime: { client: { edgeFeatures: { subductionReplicator: checked } } },
      }),
    );
    window.location.reload();
  };

  return (
    <Input.Root>
      <Input.Label classNames='text-xs px-2'>Subduction</Input.Label>
      <Input.Switch disabled={target.value !== 'default'} checked={enabled} onCheckedChange={handleToggle} />
    </Input.Root>
  );
};
