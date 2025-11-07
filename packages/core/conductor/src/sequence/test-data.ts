//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

// TODO(burdon): Convert to queue.
export const TEST_EMAILS: Message.Message[] = [
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: {
      email: 'alice@example.com',
    },
    properties: {
      subject: 'Introduction email',
    },
    blocks: [
      {
        _tag: 'text',
        text: "Hi there! I came across your work and would love to connect. I'm working on some interesting projects in the decentralized space and think there could be good collaboration opportunities.",
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: {
      email: 'bob@example.com',
    },
    properties: {
      subject: 'Question about integration',
    },
    blocks: [
      {
        _tag: 'text',
        text: "Hello, I was wondering if your system supports integration with external APIs? We have some custom services we'd like to connect. Could you explain the process?",
      },
    ],
  }),
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: {
      email: 'spammer123@sketchy.com',
    },
    properties: {
      subject: 'MAKE MONEY FAST!!!',
    },
    blocks: [
      {
        _tag: 'text',
        text: 'CONGRATULATIONS!!! You have been selected to receive $10 MILLION dollars! Just send us your bank details and social security number to claim your prize NOW!!!',
      },
    ],
  }),
];
