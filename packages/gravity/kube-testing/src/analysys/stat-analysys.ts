//
// Copyright 2023 DXOS.org
//

import { Series, toJSON as serializeToJSON } from 'danfojs-node';

import { PlanResults } from '../plan/spec-base';
import { LogReader, TraceEvent } from './reducer';

export const analyzeMessages = async (results: PlanResults) => {
  const messages = new Map<string, { sent?: number; received?: number }>();
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
          messages.set(data.message, { sent: undefined, received: undefined });
        }
        messages.get(data.message)!.sent = entry.timestamp;
        break;
      case 'RECEIVE_MESSAGE':
        if (!messages.has(data.message)) {
          messages.set(data.message, { sent: undefined, received: undefined });
        }
        messages.get(data.message)!.received = entry.timestamp;
        break;
    }
  }

  const sentNotReceived = Array.from(messages.values()).filter((x) => x.received === undefined).length;
  const receivedNotSent = Array.from(messages.values()).filter((x) => x.sent === undefined).length;
  console.log(
    'Succesfull messages',
    Array.from(messages.values())
      .filter((x) => !!x.sent && !!x.received)
      .map((x) => x.received! - x.sent!).length
  );
  const lagTimes = new Series(
    Array.from(messages.values())
      .filter((x) => !!x.sent && !!x.received)
      .map((x) => x.received! - x.sent!)
  );
  const stats = lagTimes.describe();
  stats.append(
    [sentNotReceived + receivedNotSent, sentNotReceived, receivedNotSent],
    ['failures', 'sentNotReceived', 'receivedNotSent'],
    { inplace: true }
  );
  console.log(stats.toString());
  return serializeToJSON(stats, { format: 'column' });
};
