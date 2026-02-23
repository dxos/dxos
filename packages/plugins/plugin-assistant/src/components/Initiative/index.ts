//
// Copyright 2026 DXOS.org
//

import { lazy, type FunctionComponent } from 'react';
import type { InitiativeContainerProps } from './InitiativeContainer';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import type { Initiative } from '@dxos/assistant-toolkit';

export const InitiativeContainer: FunctionComponent<InitiativeContainerProps> = lazy(
  () => import('./InitiativeContainer'),
);

export const InitiativeSettings: FunctionComponent<SurfaceComponentProps<Initiative.Initiative>> = lazy(
  () => import('./InitiativeSettings'),
);
