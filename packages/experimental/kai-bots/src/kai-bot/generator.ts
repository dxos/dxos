//
// Copyright 2023 DXOS.org
//

import { Space } from '@dxos/client';
import { Document } from '@dxos/echo-schema';

import { ChatModel } from './chat-model';

export interface Generator<T extends Document> {
  update(chatModel: ChatModel, space: Space, object: T): Promise<void>;
}
