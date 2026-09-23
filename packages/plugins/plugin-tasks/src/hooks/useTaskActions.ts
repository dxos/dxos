//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MenuItem, createMenuAction } from '@dxos/react-ui-menu';
import { type Task } from '@dxos/types';

import { TasksCapabilities } from '#types';

/**
 * Builds a task row's menu items from every plugin that contributed a {@link TasksCapabilities.TaskAction}.
 *
 * Resolved here in a hook a container calls, never in the list itself: `react-ui-task` renders rows
 * and must not reach for capabilities or an invoker (a component that does throws outside a
 * `PluginManager`, so the list would stop working in a story).
 */
export const useTaskActions = (): ((task: Task.Task) => MenuItem[]) => {
  const invoker = useOperationInvoker();
  const actions = useCapabilities(TasksCapabilities.TaskAction);

  return useCallback(
    (task: Task.Task) => {
      const spaceId = Obj.getDatabase(task)?.spaceId;
      if (!spaceId) {
        return [];
      }

      return actions.flatMap((action) => {
        const invocations = action.createInvocations(task);
        // An empty list means the action does not apply to this task, so it earns no menu item.
        if (invocations.length === 0) {
          return [];
        }

        return [
          createMenuAction(
            action.id,
            () => {
              // Sequential: a composite's later steps depend on what the earlier ones wrote, so they
              // must not race.
              const run = (async () => {
                let text: string | undefined;
                for (const { operation, input, clipboard } of invocations) {
                  const { data, error } = await invoker.invokePromise(operation, input, { spaceId });
                  if (error) {
                    throw error;
                  }
                  text = clipboard?.(data) ?? text;
                }
                return text;
              })();

              // Opened before the first await: WebKit rejects a clipboard write begun after the gesture.
              if (invocations.some(({ clipboard }) => clipboard)) {
                writeClipboard(
                  run.then((text) => text ?? Promise.reject(new Error('The action produced no clipboard text.'))),
                );
              }

              void run.catch((err) => log.warn('task action failed', { id: action.id, err }));
            },
            { label: action.label, icon: action.icon, testId: `tasks.task.${action.id}` },
          ),
        ];
      });
    },
    [actions, invoker],
  );
};

/**
 * Starts a clipboard write whose text is still being computed.
 *
 * A `ClipboardItem` holding a promise is what lets the write begin inside the user gesture — the
 * condition WebKit enforces — and complete once the text exists; `writeText` after the await is the
 * fallback for a browser without `ClipboardItem`.
 */
const writeClipboard = (text: Promise<string>): void => {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard) {
    return;
  }

  const write =
    typeof ClipboardItem === 'undefined'
      ? text.then((value) => clipboard.writeText(value))
      : clipboard.write([
          new ClipboardItem({ 'text/plain': text.then((value) => new Blob([value], { type: 'text/plain' })) }),
        ]);
  void write.catch((err) => log.warn('clipboard write failed', { err }));
};
