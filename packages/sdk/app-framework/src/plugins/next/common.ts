//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { defineInterface } from './plugin';

export const ReactContext = defineInterface<{ context: FC<PropsWithChildren> }>(
  '@dxos/app-framework/common/react-context',
);
export const ReactRoot = defineInterface<{ root: FC<PropsWithChildren> }>('@dxos/app-framework/common/react-root');
