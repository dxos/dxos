import type { Message } from '@dxos/automerge/automerge-repo';
import { trace } from '@dxos/tracing';

export class EchoNetworkMetrics {
  recordMessageReceived(message: Message) {
    trace.metrics.increment('echo.network.message-received', 1, {
      tags: createMessageTags(message),
    });
  }

  recordMessageSent(message: Message) {
    trace.metrics.increment('echo.network.message-sent', 1, {
      tags: createMessageTags(message),
    });
  }
}

const createMessageTags = (message: Message) => {
  return {
    type: message.type,
  };
};
