// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

export default LayoutOperation.UpdateSidebar.pipe(
  Operation.withHandler(() => Effect.void),
);
