//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

import { CodeOperation } from '#types';

import { foldFeatures } from '../fold/fold-features.ts';

const handler: Operation.WithHandler<typeof CodeOperation.MigrateFeatures> = CodeOperation.MigrateFeatures.pipe(
  Operation.withHandler(() => foldFeatures()),
);

export default handler;
