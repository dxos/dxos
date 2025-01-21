//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo } from 'react';

import { createIntent, LayoutAction, useCapabilities, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { ThreadCapabilities } from '@dxos/plugin-space';
import { MessageType, type ThreadType } from '@dxos/plugin-space/types';
import { create, fullyQualifiedId, makeRef, RefArray } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useAttended } from '@dxos/react-ui-attention';
import { nonNullable } from '@dxos/util';

import { ThreadCapabilities as LocalThreadCapabilities } from '../capabilities';
import { CommentsContainer } from '../components';
import { ThreadAction } from '../types';

export const ThreadComplementary = ({ subject }: { subject: any }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const identity = useIdentity();

  const { state, getViewState } = useCapability(LocalThreadCapabilities.MutableState);
  const { showResolvedThreads } = getViewState(fullyQualifiedId(subject));
  const drafts = state.drafts[fullyQualifiedId(subject)];

  const threadsIntegrators = useCapabilities(ThreadCapabilities.Thread);
  const createSort = useMemo(
    () => threadsIntegrators.find((p) => p.predicate(subject))?.createSort,
    [threadsIntegrators, subject],
  );
  const sort = useMemo(() => createSort?.(subject), [createSort, subject]);

  const threadObjects = RefArray.allResolvedTargets(subject.threads ?? []);

  const threads = useMemo(() => {
    return threadObjects.concat(drafts ?? []).filter(nonNullable) as ThreadType[];
  }, [JSON.stringify(threadObjects), JSON.stringify(drafts)]);

  const detachedIds = useMemo(() => {
    return threads.filter(({ anchor }) => !anchor).map((thread) => fullyQualifiedId(thread));
  }, [threads]);

  useEffect(() => {
    if (!sort) {
      return;
    }
    threads.sort((a, b) => sort(a?.anchor, b?.anchor));
  }, [sort, threads]);

  const attended = useAttended();
  const qualifiedSubjectId = fullyQualifiedId(subject);

  const handleAttend = useCallback(
    (thread: ThreadType) => {
      const threadId = fullyQualifiedId(thread);
      if (state.current !== threadId) {
        state.current = threadId;

        // TODO(wittjosiah): Should this be a thread-specific intent?
        //  The layout doesn't know about threads and this working depends on other plugins conditionally handling it.
        //  This may be overloading this intent or highjacking its intended purpose.
        void dispatch(
          createIntent(LayoutAction.ScrollIntoView, {
            id: fullyQualifiedId(subject),
            cursor: thread.anchor,
            ref: threadId,
          }),
        );
      }
    },
    [state.current, dispatch, subject],
  );

  const handleComment = useCallback(
    async (thread: ThreadType, message: string) => {
      thread.messages.push(
        makeRef(
          create(MessageType, {
            sender: { identityKey: identity?.identityKey.toHex() },
            timestamp: new Date().toISOString(),
            text: message,
            // TODO(wittjosiah): Context based on attention.
            // context: context ? makeRef(context) : undefined,
          }),
        ),
      );

      await dispatch(createIntent(ThreadAction.OnMessageAdd, { thread, subject }));

      state.current = fullyQualifiedId(thread);
    },
    [dispatch, identity, subject],
  );

  const handleResolve = useCallback(
    (thread: ThreadType) => dispatch(createIntent(ThreadAction.ToggleResolved, { thread })),
    [dispatch],
  );

  const handleThreadDelete = useCallback(
    (thread: ThreadType) => dispatch(createIntent(ThreadAction.Delete, { thread, subject })),
    [dispatch, subject],
  );

  const handleMessageDelete = useCallback(
    (thread: ThreadType, messageId: string) =>
      dispatch(createIntent(ThreadAction.DeleteMessage, { thread, subject, messageId })),
    [dispatch, subject],
  );

  return (
    <CommentsContainer
      threads={threads}
      detached={detachedIds}
      currentId={attended.includes(qualifiedSubjectId) ? state.current : undefined}
      showResolvedThreads={showResolvedThreads}
      onAttend={handleAttend}
      onComment={handleComment}
      onResolve={handleResolve}
      onMessageDelete={handleMessageDelete}
      onThreadDelete={handleThreadDelete}
    />
  );
};
