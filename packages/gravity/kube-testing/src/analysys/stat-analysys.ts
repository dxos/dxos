//
// Copyright 2023 DXOS.org
//

import dfd from 'danfojs-node';

import { PlanResults } from '../plan/spec-base';
import { LogReader, TraceEvent } from './reducer';

export const analyzeMessages = async (results: PlanResults) => {
  const messages = new Map<string, { sent: number; received: number }>();
  const reader = new LogReader();

  for (const { logFile } of Object.values(results.agents)) {
    reader.addFile(logFile);
  }

  for await (const entry of reader) {
    if (entry.message !== 'dxos.test.signal') {
      continue;
    }
    const data: TraceEvent = entry.context;

    switch (data.type) {
      case 'SENT_MESSAGE':
        if (!messages.has(data.message)) {
          messages.set(data.message, { sent: 0, received: 0 });
        }
        messages.get(data.message)!.sent = entry.timestamp;
        break;
      case 'RECEIVE_MESSAGE':
        if (!messages.has(data.message)) {
          messages.set(data.message, { sent: 0, received: 0 });
        }
        messages.get(data.message)!.received = entry.timestamp;
        break;
    }
  }

  const lagTimes = new dfd.Series(
    Array.from(messages.values())
      .map((x) => x.received - x.sent)
      .map((x) => Math.min(Math.max(x, -1000), 5000))
  );
  lagTimes.plot('plot_div').hist();
};
