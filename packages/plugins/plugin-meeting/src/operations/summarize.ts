// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { MeetingOperation } from '../types';

const handler: Operation.WithHandler<typeof MeetingOperation.Summarize> = MeetingOperation.Summarize.pipe(
  Operation.withHandler(() => Effect.fail(new Error('Not implemented'))),
);

export default handler;
