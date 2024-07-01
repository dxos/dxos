//
// Copyright 2024 DXOS.org
//

import { TextType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';

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
