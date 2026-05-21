//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useState } from 'react';

import { createFeedServiceLayer, getSpace } from '@dxos/client/echo';
import { Feed, Filter } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import { Subscription } from '../types';

/**
 * Reactively resolves a Post's fetched body from its source Subscription's
 * {@link Subscription.contentFeed} queue.
 *
 * Returns `undefined` until the queue has been loaded; returns the body text
 * (or `undefined` if no entry exists for this Post id) thereafter.
 *
 * Subscribes to the contentFeed's QueryResult so the body appears
 * immediately after {@link LoadPostContent} appends a new entry without
 * waiting for a remount.
 */
export const usePostContent = (
  subscription: Subscription.Subscription | undefined,
  postId: string,
): string | undefined => {
  const [text, setText] = useState<string | undefined>(undefined);

  useEffect(() => {
    setText(undefined);
    if (!subscription) {
      return;
    }
    const echoFeed = subscription.contentFeed?.target;
    const space = getSpace(subscription);
    if (!echoFeed || !space) {
      return;
    }

    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    void runAndForwardErrors(
      Feed.query(echoFeed, Filter.type(Subscription.PostContent)).pipe(
        Effect.provide(createFeedServiceLayer(space.queues)),
      ),
    )
      .then((queryResult) => {
        if (disposed) {
          return;
        }
        const apply = () => {
          const match = queryResult.results.find((entry) => entry.postId === postId);
          setText(match?.text);
        };
        // `fire: true` makes the subscription fire immediately with the
        // current snapshot, covering the case where the queue is already
        // populated by the time we subscribe.
        unsubscribe = queryResult.subscribe(apply, { fire: true });
      })
      .catch((err) => log.catch(err));

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [subscription, subscription?.contentFeed?.target, postId]);

  return text;
};
