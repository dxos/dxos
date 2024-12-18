//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { LayoutAction, type Plugin, useIntentDispatcher, useResolvePlugins } from '@dxos/app-framework';
import { type ThreadType } from '@dxos/plugin-space';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttended } from '@dxos/react-ui-attention';
import { nonNullable } from '@dxos/util';

import { CommentsContainer } from '../components';
import { THREAD_PLUGIN } from '../meta';
import { ThreadAction, type ThreadProvides } from '../types';

const providesThreadsConfig = (plugin: any): Plugin<ThreadProvides<any>> | undefined =>
  'thread' in plugin.provides ? (plugin as Plugin<ThreadProvides<any>>) : undefined;

export const ThreadComplementary = ({
  subject,
  drafts,
  current,
  showResolvedThreads,
}: {
  subject: any;
  drafts: ThreadType[] | undefined;
  current?: string;
  showResolvedThreads?: boolean;
}) => {
  const dispatch = useIntentDispatcher();

  const threadsIntegrators = useResolvePlugins(providesThreadsConfig);
  const threadProvides = useMemo(() => threadsIntegrators.map((p) => p.provides.thread), [threadsIntegrators]);
  const createSort = useMemo(
    () => threadProvides.find((p) => p.predicate(subject))?.createSort,
    [threadProvides, subject],
  );
  const sort = useMemo(() => createSort?.(subject), [createSort, subject]);

  const threads = useMemo(() => {
    return subject.threads.concat(drafts ?? []).filter(nonNullable) as ThreadType[];
  }, [JSON.stringify(subject.threads), JSON.stringify(drafts)]);

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

  return (
    <CommentsContainer
      threads={threads}
      detached={detachedIds}
      currentId={attended.includes(qualifiedSubjectId) ? current : undefined}
      showResolvedThreads={showResolvedThreads}
      onThreadAttend={(thread) => {
        const threadId = fullyQualifiedId(thread);
        if (current !== threadId) {
          current = threadId;

          // TODO(wittjosiah): Should this be a thread-specific intent?
          //  The layout doesn't know about threads and this working depends on other plugins conditionally handling it.
          //  This may be overloading this intent or highjacking its intended purpose.
          void dispatch?.([
            {
              action: LayoutAction.SCROLL_INTO_VIEW,
              data: {
                id: fullyQualifiedId(subject),
                thread: threadId,
                cursor: thread.anchor,
              },
            },
          ]);
        }
      }}
      onThreadDelete={(thread) => {
        return dispatch({ plugin: THREAD_PLUGIN, action: ThreadAction.DELETE, data: { subject, thread } });
      }}
      onMessageDelete={(thread, messageId) =>
        dispatch({
          plugin: THREAD_PLUGIN,
          action: ThreadAction.DELETE_MESSAGE,
          data: { subject, thread, messageId },
        })
      }
      onThreadToggleResolved={(thread) =>
        dispatch({ plugin: THREAD_PLUGIN, action: ThreadAction.TOGGLE_RESOLVED, data: { thread } })
      }
      onComment={(thread) => {
        void dispatch({ action: ThreadAction.ON_MESSAGE_ADD, data: { thread, subject } });
      }}
    />
  );
};
