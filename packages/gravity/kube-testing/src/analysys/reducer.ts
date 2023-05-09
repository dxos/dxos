//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { LogEntry, LogLevel } from '@dxos/log';
import { Message } from '@dxos/messaging';
import { SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { readFileSync } from 'node:fs';

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
  // peerId: PublicKey;
  // timestamp: number;
} & (
  | {
      type: 'SENT_MESSAGE' | 'RECEIVE_MESSAGE';
      sender: string;
      receiver: string;
      message: string;
    }
  | {
      peerId: string;
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

export class LogReader implements AsyncIterable<SerializedLogEntry> {
  private _logs: any[] = [];

  addFile(path: string) {
    // TODO(dmaretskyi): Read files chunk by chunk.
    this._logs.push(...readFileSync(path, 'utf-8').split('\n').filter(line => line.trim().length > 0).map(line => JSON.parse(line)))
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<SerializedLogEntry> {
    let idx = 0;
    while(idx < this._logs.length) {
      yield this._logs[idx++];
    }
  }
}

export type SerializedLogEntry<T = any> = {
  level: LogLevel
  message: string
  timestamp: number
  context: T,
  meta: {
    // TODO(dmaretskyi): .
  }
}