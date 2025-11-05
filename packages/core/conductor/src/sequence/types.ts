//
// Copyright 2025 DXOS.org
//

import type { DataType } from '@dxos/schema';

import type { SequenceStep } from './sequence';

export type SequenceEvent =
  | { type: 'begin'; invocationId: string }
  | { type: 'end'; invocationId: string }
  | { type: 'step-start'; invocationId: string; step: SequenceStep }
  | { type: 'step-complete'; invocationId: string; step: SequenceStep }
  | { type: 'message'; invocationId: string; message: DataType.Message.Message }
  | { type: 'block'; invocationId: string; block: DataType.ContentBlock.Any };

export interface SequenceLogger {
  log(event: SequenceEvent): void;
}
