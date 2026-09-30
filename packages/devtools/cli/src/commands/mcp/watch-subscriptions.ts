//
// Copyright 2026 DXOS.org
//

import type { Frame, ReloadReplay } from './watch-replay.ts';

const SUBSCRIPTION_ID_META = 'io.modelcontextprotocol/subscriptionId';

/** The list-change filters of a `subscriptions/listen` request, paired with what each delivers. */
const LIST_CHANGED_NOTIFICATIONS = [
  ['toolsListChanged', 'notifications/tools/list_changed'],
  ['promptsListChanged', 'notifications/prompts/list_changed'],
  ['resourcesListChanged', 'notifications/resources/list_changed'],
] as const;

type SubscriptionFilter = NonNullable<NonNullable<Frame['params']>['notifications']>;

/** An open `subscriptions/listen` request and the filter its acknowledgment told the client. */
type Subscription = {
  readonly request: Frame;
  honored?: SubscriptionFilter;
};

/**
 * Keeps the client's `subscriptions/listen` streams open across a reload. The spec has the server
 * hold no subscription state across a restart, so the streams are re-sent rather than failed like
 * other requests.
 */
export const makeSubscriptionReplay = (): ReloadReplay => {
  /** Open subscriptions by request id. */
  const subscriptions = new Map<string | number, Subscription>();
  /** Re-sent subscriptions whose acknowledgment the client already received once. */
  const resubscribing = new Set<string | number>();

  const end = (id: string | number) => {
    subscriptions.delete(id);
    resubscribing.delete(id);
  };

  return {
    observeClient: (frame) => {
      if (frame.method === 'subscriptions/listen' && frame.id !== undefined) {
        subscriptions.set(frame.id, { request: frame });
      } else if (frame.method === 'notifications/cancelled' && frame.params?.requestId !== undefined) {
        end(frame.params.requestId);
      }
    },

    retains: (id) => subscriptions.has(id),

    onReload: (io) => {
      for (const [id, { request }] of subscriptions) {
        resubscribing.add(id);
        io.toChild(request);
      }
    },

    onChild: (frames, io) => {
      const single = frames.length === 1 ? frames[0] : undefined;
      if (single?.method === 'notifications/subscriptions/acknowledged') {
        const id = single.params?._meta?.[SUBSCRIPTION_ID_META];
        const subscription = id === undefined ? undefined : subscriptions.get(id);
        if (id !== undefined && subscription !== undefined) {
          if (resubscribing.delete(id)) {
            // Only the kinds the original acknowledgment honored, since a stream may carry nothing else.
            for (const [filter, method] of LIST_CHANGED_NOTIFICATIONS) {
              if (subscription.honored?.[filter] === true) {
                io.notifyClient(method, { _meta: { [SUBSCRIPTION_ID_META]: id } });
              }
            }
            return 'consumed';
          }
          subscription.honored = single.params?.notifications;
        }
      }
      for (const frame of frames) {
        if (frame.id !== undefined && frame.method === undefined) {
          end(frame.id);
        } else if (frame.method === 'notifications/cancelled' && frame.params?.requestId !== undefined) {
          end(frame.params.requestId);
        }
      }
      return 'forward';
    },
  };
};
