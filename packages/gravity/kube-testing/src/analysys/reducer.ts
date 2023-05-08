//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { LogEntry } from '@dxos/log';
import { Message } from '@dxos/messaging';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

export enum TestingEvent {
  // Test agent control events.
  AGENT_START = 'AGENT_START',
  AGENT_END = 'AGENT_END',
  AGENT_ERROR = 'AGENT_ERROR',

  // Swarm events.
  JOIN_SWARM = '',
  LEAVE_SWARM = ''
}

export type TraceEvent = {
  peerId: PublicKey;
  timestamp: number;
} & (
  | {
      type: 'SENT_MESSAGE' | 'RECEIVE_MESSAGE';
      message: Message;
    }
  | {
      type: 'SWARM_EVENT';
      topic: PublicKey;
      swarmEvent: SwarmEvent;
    }
  | {
      type: 'LEAVE_SWARM' | 'JOIN_SWARM';
      topic: PublicKey;
    }
  | {
      type: 'ERROR';
      err: Error;
    }
  | {
      type: 'START' | 'STOP';
    }
);

class LogReader implements AsyncIterable<LogEntry> {
  addFile(path: string) {}

  async *[Symbol.asyncIterator](): AsyncGenerator<LogEntry> {
    yield {};
  }
}
const reader = new LogReader();
for await (const log of reader) {
}
