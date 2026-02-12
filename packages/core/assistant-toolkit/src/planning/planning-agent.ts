//
// Copyright 2025 DXOS.org
//

import { AiSession } from '@dxos/assistant';
import { Effect } from 'effect';
import { Message } from '@dxos/types';

export class PlanningAgent {
  #session = new AiSession();

  #history: Message.Message[] = [];

  run(prompt: string) {
    
  }
}
