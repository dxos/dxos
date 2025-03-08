//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/live-object';
import { TextType } from '@dxos/schema';

export const SOURCE_ID = 'hub.dxos.network/mailbox';

// TODO(burdon): Import type from lib.
export type EmailMessage = {
  id: number;
  status?: string;
  created: number;
  from: string;
  to: string;
  subject: string;
  body: string;
};

export const text = (content: string) => create(TextType, { content });
