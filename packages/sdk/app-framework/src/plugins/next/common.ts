//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { defineInterface } from './host';
import { type IntentContext, type AnyIntentResolver } from '../plugin-intent';
import { type SurfaceDefinition } from '../plugin-surface';

export const ReactContext = defineInterface<{ context: FC<PropsWithChildren> }>(
  'dxos.org/app-framework/common/react-context',
);

export const ReactRoot = defineInterface<{ root: FC<PropsWithChildren> }>('dxos.org/app-framework/common/react-root');

export const ReactSurface = defineInterface<{ definitions: SurfaceDefinition | SurfaceDefinition[] }>(
  'dxos.org/app-framework/common/react-surface',
);

export const IntentResolver = defineInterface<{ resolvers: AnyIntentResolver | AnyIntentResolver[] }>(
  'dxos.org/app-framework/common/intent-resolver',
);

export const IntentDispatcher = defineInterface<Omit<IntentContext, 'registerResolver'>>(
  'dxos.org/app-framework/common/intent-dispatcher',
);
