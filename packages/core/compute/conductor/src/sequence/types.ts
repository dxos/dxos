//
// Copyright 2025 DXOS.org
//

import { type ContentBlock, type Message } from '@dxos/types';

import type * as Sequence from './Sequence';

export type SequenceEvent =
  | { type: 'begin'; invocationId: string }
  | { type: 'end'; invocationId: string }
  | { type: 'step-start'; invocationId: string; step: Sequence.Step }
  | { type: 'step-complete'; invocationId: string; step: Sequence.Step }
  | { type: 'message'; invocationId: string; message: Message.Message }
  | { type: 'block'; invocationId: string; block: ContentBlock.Any };

export interface SequenceLogger {
  log(event: SequenceEvent): void;
}
