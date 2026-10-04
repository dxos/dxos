//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { getHotkeyScope, keySymbols } from '@dxos/react-focus';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import { osTranslations } from '@dxos/ui-theme';
import { resolveKeyBinding } from '@dxos/util';

import { KEY_BINDING, meta } from '#meta';

export type CommandsDialogContentProps = {
  selected?: string;
};

// TODO(wittjosiah): This probably deserves its own plugin but for now it lives here w/ other navigation UI.
export const CommandsDialogContent = forwardRef<HTMLDivElement, CommandsDialogContentProps>(
  ({ selected: initial }, forwardedRef) => {
    const { t } = UiHooks.useTranslation(meta.profile.key);
    const { invokePromise } = Hooks.useOperationInvoker();
    const runAction = GraphHooks.useActionRunner();
    const { graph } = ToolkitHooks.useAppGraph();
    const [selected, setSelected] = useState<string | undefined>(initial);

    // Traverse graph.
    // TODO(burdon): Factor out commonality with shortcut dialog.
    const allActions = useMemo(() => {
      // TODO(burdon): Get from navtree (not keyboard).
      const current = getHotkeyScope() ?? '';
      const actionMap = new Set<string>();
      const actions: AppGraphNode.ActionLike[] = [];
      AppGraph.traverse(graph, {
        relation: ['child', 'action'],
        visitor: (node, path) => {
          const isActionLike = AppGraphNode.isAction(node) || AppGraphNode.isActionGroup(node);
          const parentId = path.at(-2) ?? '';
          const matches = current === parentId || current.startsWith(parentId + '/');
          if (isActionLike && !actionMap.has(node.id) && matches) {
            actionMap.add(node.id);
            actions.push(node);
          }
        },
      });

      actions.sort((a, b) => {
        return Theme.toLocalizedString(a.properties.label, t)
          ?.toLowerCase()
          .localeCompare(Theme.toLocalizedString(b.properties.label, t)?.toLowerCase());
      });

      return actions;
    }, [graph]);

    const group = allActions.find(({ id }) => id === selected);
    const groupActions = GraphHooks.useActions(graph, group?.id);
    const actions = AppGraphNode.isActionGroup(group) ? groupActions : allActions;

    const { results, handleSearch } = useSearchListResults({
      items: actions,
      extract: (action) => Theme.toLocalizedString(action.properties.label, t),
    });

    return (
      <Dialog.Content ref={forwardedRef}>
        <Dialog.Title srOnly>{t('commands-dialog.title', { ns: meta.profile.key })}</Dialog.Title>
        <Dialog.Body>
          <SearchList.Root onSearch={handleSearch} resetSelectionOnChange>
            {/* Focused on mount, and marked so the dialog's own focus pass agrees: without either, the
                caret stays outside the palette and Enter reaches the action bar's close button
                instead of running the highlighted command. */}
            <SearchList.Input
              autoFocus
              placeholder={t('command-list-input.placeholder')}
              escapeBehavior='dismiss'
              {...{ [Dialog.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
            />
            <SearchList.Viewport>
              {results.map((action) => {
                const shortcut = resolveKeyBinding(action.properties.keyBinding);

                return (
                  <SearchList.Item
                    value={action.id}
                    key={action.id}
                    label={Theme.toLocalizedString(action.properties.label, t)}
                    icon={action.properties.icon}
                    suffix={shortcut ? keySymbols(shortcut).join('') : undefined}
                    onSelect={() => {
                      if (action.properties.disabled) {
                        return;
                      }

                      if (AppGraphNode.isActionGroup(action)) {
                        setSelected(action.id);
                        return;
                      }

                      void invokePromise(LayoutOperation.UpdateDialog, { state: false });
                      setTimeout(() => {
                        const lookupId = group?.id ?? action.id;
                        const node = AppGraph.getConnections(
                          graph,
                          lookupId,
                          AppGraph.inverseRelation(AppGraphNode.action),
                        )[0];
                        if (node && AppGraphNode.isAction(action)) {
                          void runAction(action, { parent: node, caller: KEY_BINDING });
                        }
                      });
                    }}
                    classNames='flex items-center gap-2'
                    disabled={action.properties.disabled}
                    {...(action.properties?.testId && {
                      'data-testid': action.properties.testId,
                    })}
                  />
                );
              })}
            </SearchList.Viewport>
          </SearchList.Root>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <Button.Button classNames='w-full'>{t('close.label', { ns: osTranslations })}</Button.Button>
          </Dialog.CloseTrigger>
        </Dialog.Footer>
      </Dialog.Content>
    );
  },
);

CommandsDialogContent.displayName = 'CommandsDialogContent';
