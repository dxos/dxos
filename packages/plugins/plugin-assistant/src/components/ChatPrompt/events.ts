//
// Copyright 2025 DXOS.org
//

export type ChatEvent =
  | { type: 'submit'; text: string }
  | { type: 'cancel' }
  | { type: 'thread-open' }
  | { type: 'thread-close' }
  | { type: 'scroll-to-bottom' }
  | { type: 'record-start' }
  | { type: 'record-stop' };
