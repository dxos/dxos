//
// Copyright 2025 DXOS.org
//

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

// TODO(burdon): Convert to queue.
export const TEST_EMAILS: DataType.Message[] = [
  Obj.make(DataType.Message, {
    properties: {
      subject: 'Introduction email',
    },
    sender: {
      email: 'alice@example.com',
    },
    blocks: [
      {
        type: 'text',
        text: "Hi there! I came across your work and would love to connect. I'm working on some interesting projects in the decentralized space and think there could be good collaboration opportunities.",
      },
    ],
    created: new Date().toISOString(),
  }),
  Obj.make(DataType.Message, {
    properties: {
      subject: 'Question about integration',
    },
    sender: {
      email: 'bob@example.com',
    },
    blocks: [
      {
        type: 'text',
        text: "Hello, I was wondering if your system supports integration with external APIs? We have some custom services we'd like to connect. Could you explain the process?",
      },
    ],
    created: new Date().toISOString(),
  }),
  Obj.make(DataType.Message, {
    properties: {
      subject: 'MAKE MONEY FAST!!!',
    },
    sender: {
      email: 'spammer123@sketchy.com',
    },
    blocks: [
      {
        type: 'text',
        text: 'CONGRATULATIONS!!! You have been selected to receive $10 MILLION dollars! Just send us your bank details and social security number to claim your prize NOW!!!',
      },
    ],
    created: new Date().toISOString(),
  }),
];
