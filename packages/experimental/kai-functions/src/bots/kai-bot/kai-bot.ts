//
// Copyright 2023 DXOS.org
//

import { type Subscription } from '@dxos/echo-schema';
import { DocumentStack } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { ChatModel } from './chat-model';
import { ContactStackResolver } from './generators';
import { Bot } from '../bot';
import { getKey } from '../util';

export class KaiBot extends Bot {
  private _chatModel?: ChatModel;
  private _subscription?: Subscription;

  override async onInit() {
    this._chatModel = new ChatModel({
      orgId: process.env.COM_OPENAI_ORG_ID ?? getKey(this.config, 'openai.com/org_id')!,
      apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(this.config, 'openai.com/api_key')!,
    });
  }

  override async onStart() {
    // TODO(burdon): Generalize generators and triggers.
    const resolver = new ContactStackResolver(this.id, this._chatModel!);
    const stacks = this.space.db.query(DocumentStack.filter());
    this._subscription = stacks.subscribe(async ({ objects: stacks }) => {
      log.info('updated', { objects: stacks.length });
      for (const stack of stacks) {
        log.info('stack', { stack: JSON.stringify(stack) });
        await resolver.update(this.space, stack);
      }
    });
  }

  override async onStop() {
    this._subscription?.();
  }
}
