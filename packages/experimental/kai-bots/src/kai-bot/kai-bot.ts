//
// Copyright 2023 DXOS.org
//

import { Subscription } from '@dxos/echo-schema';
import { DocumentStack } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { Bot } from '../bot';
import { getKey } from '../util';
import { ChatModel } from './chat-model';
import { ContactStackGenerator } from './generators';

export class KaiBot extends Bot {
  private _chatModel?: ChatModel;
  private _subscription?: Subscription;

  override async onInit() {
    this._chatModel = new ChatModel({
      organization: process.env.COM_OPENAI_ORG_ID ?? getKey(this.config, 'com.openai.org_id')!,
      apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(this.config, 'com.openai.api_key')!
    });
  }

  override async onStart() {
    // TODO(burdon): Generalize generators and triggers.
    const generator = new ContactStackGenerator();
    const stacks = this.space.db.query(DocumentStack.filter());
    this._subscription = stacks.subscribe(async ({ objects: stacks }) => {
      log.info('updated', { objects: stacks.length });
      for (const stack of stacks) {
        log.info('stack', { stack: JSON.stringify(stack) });
        await generator.update(this._chatModel!, this.space, stack);
      }
    });
  }

  override async onStop() {
    this._subscription?.();
  }
}
