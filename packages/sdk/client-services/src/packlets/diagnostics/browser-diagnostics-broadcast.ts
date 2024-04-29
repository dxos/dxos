//
// Copyright 2024 DXOS.org
//

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { type SystemService } from '@dxos/protocols/proto/dxos/client/services';

import {
  type CollectDiagnosticsBroadcastSender,
  type CollectDiagnosticsBroadcastHandler,
} from './diagnostics-collector';

const CHANNEL_NAME = 'dxos.diagnostics.broadcast';

enum MessageType {
  PROBE = 'probe',
  PROBE_ACK = 'probe-ack',
  REQUEST_DIAGNOSTICS = 'request-diagnostics',
  RECEIVE_DIAGNOSTICS = 'receive-diagnostics',
}

interface Message {
  type: MessageType;
  payload?: any;
}

export const createCollectDiagnosticsBroadcastSender = (): CollectDiagnosticsBroadcastSender => {
  return {
    broadcastDiagnosticsRequest: async () => {
      let expectedResponse = MessageType.PROBE_ACK;
      let channel: BroadcastChannel | undefined;
      try {
        const trigger = new Trigger<Message>();
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (msg) => {
          if (expectedResponse === msg.data.type) {
            trigger.wake(msg.data);
          }
        };
        channel.postMessage({ type: MessageType.PROBE });
        await trigger.wait({ timeout: 200 });
        expectedResponse = MessageType.RECEIVE_DIAGNOSTICS;
        trigger.reset();
        channel.postMessage({ type: MessageType.REQUEST_DIAGNOSTICS });
        const diagnostics = await trigger.wait({ timeout: 5000 });
        return diagnostics.payload;
      } catch (e) {
        const errorDescription = e instanceof Error ? e.message : JSON.stringify(e);
        return { expectedResponse, errorDescription };
      } finally {
        safeClose(channel);
      }
    },
  };
};

export const createCollectDiagnosticsBroadcastHandler = (
  systemService: SystemService,
): CollectDiagnosticsBroadcastHandler => {
  let channel: BroadcastChannel | undefined;
  return {
    start: () => {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = async (message) => {
        try {
          if (message.data.type === MessageType.PROBE) {
            channel?.postMessage({ type: MessageType.PROBE_ACK });
          } else if (message.data.type === MessageType.REQUEST_DIAGNOSTICS) {
            const diagnostics = await systemService.getDiagnostics({});
            channel?.postMessage({
              type: MessageType.RECEIVE_DIAGNOSTICS,
              payload: diagnostics,
            });
          }
        } catch (error) {
          log.catch(error);
        }
      };
    },
    stop: () => {
      safeClose(channel);
      channel = undefined;
    },
  };
};

const safeClose = (channel?: BroadcastChannel) => {
  try {
    channel?.close();
  } catch (e) {
    // ignored
  }
};
