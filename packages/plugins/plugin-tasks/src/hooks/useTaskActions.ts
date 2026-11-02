//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MenuItem, createLineSeparator, createMenuAction } from '@dxos/react-ui-menu';
import { type Task } from '@dxos/types';

import { TasksCapabilities } from '#types';

const isDelegate = (action: TasksCapabilities.TaskAction) => action.group === TasksCapabilities.DELEGATE_GROUP;
const isRowAction = (action: TasksCapabilities.TaskAction) => !isDelegate(action);

/**
 * Builds a task row's menu items from every plugin that contributed a {@link TasksCapabilities.TaskAction}, less the
 * delegations, which the assignee picker lists instead (see {@link useDelegateActions}).
 *
 * Resolved here in a hook a container calls, never in the list itself: `react-ui-task` renders rows
 * and must not reach for capabilities or an invoker (a component that does throws outside a
 * `PluginManager`, so the list would stop working in a story).
 */
export const useTaskActions = (): ((task: Task.Task) => MenuItem[]) => useActionItems(isRowAction);

/** The agents a task can be handed to, as the assignee picker's items after the people. */
export const useDelegateActions = (): ((task: Task.Task) => MenuItem[]) => useActionItems(isDelegate);

const useActionItems = (
  include: (action: TasksCapabilities.TaskAction) => boolean,
): ((task: Task.Task) => MenuItem[]) => {
  const invoker = Hooks.useOperationInvoker();
  const contributed = Hooks.useCapabilities(TasksCapabilities.TaskAction);
  const actions = useMemo(() => contributed.filter(include), [contributed, include]);
  const unavailable = useAtomValue(
    useMemo(
      () => Atom.make((get) => actions.map((action) => action.unavailable && get(action.unavailable))),
      [actions],
    ),
  );

  return useCallback(
    (task: Task.Task) => {
      const spaceId = Obj.getDatabase(task)?.spaceId;
      if (!spaceId) {
        return [];
      }

      const items: MenuItem[] = [];
      let group: string | undefined;
      actions.forEach((action, index) => {
        const invocations = action.createInvocations(task);
        // An empty list means the action does not apply to this task, so it earns no menu item.
        if (invocations.length === 0) {
          return;
        }

        if (items.length > 0 && action.group !== group) {
          items.push(createLineSeparator(`${action.id}-separator`).nodes[0]);
        }
        group = action.group;

        const reason = unavailable[index];
        items.push(
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
            {
              label: reason ? `${action.label} (${reason})` : action.label,
              icon: action.icon,
              disabled: reason !== undefined,
              testId: `tasks.task.${action.id}`,
            },
          ),
        );
      });

      return items;
    },
    [actions, invoker, unavailable],
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
