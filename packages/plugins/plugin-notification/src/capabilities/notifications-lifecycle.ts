//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { meta } from '#meta';
import { reconcilePush, registerForPush } from '../push-manager';

const PUSH_CHANNEL = 'dxos:push';

type PushMessage =
  | { type: 'dxos:push'; payload: { title?: string; body?: string; tag?: string; url?: string }; focused?: boolean }
  | { type: 'dxos:pushsubscriptionchange' };

/**
 * Wires the service worker's push channel to in-app toasts and reconciles the device's push
 * registration on boot. Activated once the client is ready.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);

    let channel: BroadcastChannel | undefined;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(PUSH_CHANNEL);
      channel.onmessage = (event: MessageEvent<PushMessage>) => {
        const message = event.data;
        if (message?.type === 'dxos:push') {
          void invokePromise(LayoutOperation.AddToast, {
            id: `${meta.id}.${message.payload.tag ?? 'push'}`,
            title: message.payload.title ?? 'Composer',
            description: message.payload.body,
            duration: 8000,
            ...(message.payload.url
              ? { onAction: () => invokePromise(LayoutOperation.Open, { subject: [message.payload.url!] }) }
              : {}),
          }).catch((error) => log.catch(error));
        } else if (message?.type === 'dxos:pushsubscriptionchange') {
          void registerForPush(client);
        }
      };
    }

    // Refresh the registration on boot (no prompt unless already granted / native).
    void reconcilePush(client);

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        channel?.close();
      }),
    );
  }),
);
