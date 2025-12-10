//
// Copyright 2025 DXOS.org
//

import type * as Runtime from 'effect/Runtime';

import { AiConversation, type GenericToolkit } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { type Message } from '@dxos/types';

import { type AiChatServices } from '../../util';

// TODO(burdon): Factor out common guts from assistant plugin.
export class ChatProcessor {
  constructor(
    private readonly _runtime: Runtime.Runtime<AiChatServices>,
    private readonly _toolkit?: GenericToolkit.GenericToolkit,
  ) {}

  get toolkit() {
    return this._toolkit;
  }

  async createConversation(space: Space) {
    const queue = space.queues.create<Message.Message>();
    return new AiConversation(queue, this._toolkit?.toolkit);
  }
}
