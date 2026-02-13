//
// Copyright 2025 DXOS.org
//

import { AiSession } from '@dxos/assistant';
import { type Message } from '@dxos/types';

export class PlanningAgent {
  // TODO(dmaretskyi): Wire up session and history.
  #session = new AiSession(); // eslint-disable-line no-unused-private-class-members

  #history: Message.Message[] = []; // eslint-disable-line no-unused-private-class-members

  run(_prompt: string) {}
}
