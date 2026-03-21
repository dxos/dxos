// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Summarize } from './definitions';

export default Summarize.pipe(Operation.withHandler(() => Effect.fail(new Error('Not implemented'))));
