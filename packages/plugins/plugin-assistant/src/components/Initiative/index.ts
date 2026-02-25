//
// Copyright 2026 DXOS.org
//

import { type FunctionComponent, lazy } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import type { Initiative } from '@dxos/assistant-toolkit';

import type { InitiativeContainerProps } from './InitiativeContainer';

export const InitiativeContainer: FunctionComponent<InitiativeContainerProps> = lazy(
  () => import('./InitiativeContainer'),
);

export const InitiativeSettings: FunctionComponent<SurfaceComponentProps<Initiative.Initiative>> = lazy(
  () => import('./InitiativeSettings'),
);
