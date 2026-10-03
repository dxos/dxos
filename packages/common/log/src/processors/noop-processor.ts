//
// Copyright 2026 DXOS.org
//

import { type LogProcessor } from '../context.ts';

/** Writes nothing, for a process whose stdout carries a protocol; other processors still receive entries. */
export const NOOP_PROCESSOR: LogProcessor = () => {};
