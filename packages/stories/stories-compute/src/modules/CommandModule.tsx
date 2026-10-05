//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { CommandPanel } from '../components/index.ts';
import { useCompute } from './ComputeContext.tsx';

/** Story module: spawns processes at the chosen location. */
export const CommandModule = () => {
  const { remote, ready, error, create } = useCompute();
  return <CommandPanel remote={remote} ready={ready} error={error} onCreate={create} />;
};
