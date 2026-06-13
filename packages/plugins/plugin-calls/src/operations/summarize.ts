// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { CallOperation } from '#types';

const handler: Operation.WithHandler<typeof CallOperation.Summarize> = CallOperation.Summarize.pipe(
  Operation.withHandler(() => Effect.fail(new Error('Not implemented'))),
);

export default handler;
