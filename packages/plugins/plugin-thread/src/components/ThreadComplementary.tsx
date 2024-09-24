//
// Copyright 2024 DXOS.org
//
import React, { useEffect, useMemo } from 'react';

import { LayoutAction, type Plugin, useIntentDispatcher, useResolvePlugins } from '@dxos/app-framework';
import { type ThreadType } from '@dxos/plugin-space';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ScrollArea } from '@dxos/react-ui';
import { createAttendableAttributes, useAttentionContext } from '@dxos/react-ui-attention';
import { nonNullable } from '@dxos/util';

import { CommentsContainer, CommentsHeading } from './';
import { THREAD_PLUGIN } from '../meta';
import { ThreadAction, type ThreadProvides } from '../types';

const providesThreadsConfig = (plugin: any): Plugin<ThreadProvides<any>> | undefined =>
  'thread' in plugin.provides ? (plugin as Plugin<ThreadProvides<any>>) : undefined;

export const ThreadComplementary = ({
  role,
  subject,
  stagedThreads,
  current,
  focus,
  showResolvedThreads,
}: {
  role: string;
  subject: any;
  stagedThreads: ThreadType[] | undefined;
  current?: string;
  focus?: boolean;
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
    return subject.threads.concat(stagedThreads ?? []).filter(nonNullable) as ThreadType[];
  }, [subject.threads, stagedThreads]);

  const detachedIds = useMemo(() => {
    return threads.filter(({ anchor }) => !anchor).map((thread) => thread.id); // TODO(Zan): Fully qualified ids.
  }, [subject.threads]);

  useEffect(() => {
    if (!sort) {
      return;
    }
    threads.sort((a, b) => sort(a?.anchor, b?.anchor));
  }, [sort, threads]);

  // TODO(Zan): Maybe we should have a hook for this?
  const { attended } = useAttentionContext('Thread Complementary');
  const qualifiedSubjectId = fullyQualifiedId(subject);

  const attendableAttrs = createAttendableAttributes(qualifiedSubjectId);

  return (
    <div role='none' className='contents group/attention' {...attendableAttrs}>
      {role === 'complementary' && <CommentsHeading attendableId={qualifiedSubjectId} />}
      <ScrollArea.Root classNames='row-span-2'>
        <ScrollArea.Viewport>
          <CommentsContainer
            threads={threads}
            detached={detachedIds}
            currentId={attended.has(qualifiedSubjectId) ? current : undefined}
            autoFocusCurrentTextbox={focus}
            showResolvedThreads={showResolvedThreads}
            onThreadAttend={(thread) => {
              if (current !== thread.id) {
                current = thread.id;
                void dispatch?.({
                  action: LayoutAction.SCROLL_INTO_VIEW,
                  data: {
                    id: fullyQualifiedId(subject),
                    thread: fullyQualifiedId(thread),
                    cursor: thread.anchor,
                  },
                });
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
          <div role='none' className='bs-10' />
          <ScrollArea.Scrollbar>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};
