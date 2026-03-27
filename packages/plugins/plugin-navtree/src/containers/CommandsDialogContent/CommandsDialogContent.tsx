//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Keyboard, keySymbols } from '@dxos/keyboard';
import { Graph, Node, useActionRunner } from '@dxos/plugin-graph';
import { useActions } from '@dxos/plugin-graph';
import { Button, Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-searchlist';
import { osTranslations } from '@dxos/ui-theme';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING, meta } from '../../meta';

export type CommandsDialogContentProps = {
  selected?: string;
};

// TODO(wittjosiah): This probably deserves its own plugin but for now it lives here w/ other navigation UI.
export const CommandsDialogContent = forwardRef<HTMLDivElement, CommandsDialogContentProps>(
  ({ selected: initial }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { invokePromise } = useOperationInvoker();
    const runAction = useActionRunner();
    const { graph } = useAppGraph();
    const [selected, setSelected] = useState<string | undefined>(initial);

    // Traverse graph.
    // TODO(burdon): Factor out commonality with shortcut dialog.
    const allActions = useMemo(() => {
      // TODO(burdon): Get from navtree (not keyboard).
      const current = Keyboard.singleton.getCurrentContext();
      const actionMap = new Set<string>();
      const actions: Node.ActionLike[] = [];
      Graph.traverse(graph, {
        relation: ['child', 'action'],
        visitor: (node, path) => {
          const isActionLike = Node.isAction(node) || Node.isActionGroup(node);
          const parentId = path.at(-2) ?? '';
          const matches = current === parentId || current.startsWith(parentId + '/');
          if (
            isActionLike &&
            !actionMap.has(node.id) &&
            matches
          ) {
            actionMap.add(node.id);
            actions.push(node);
          }
        },
      });

      actions.sort((a, b) => {
        return toLocalizedString(a.properties.label, t)
          ?.toLowerCase()
          .localeCompare(toLocalizedString(b.properties.label, t)?.toLowerCase());
      });

      return actions;
    }, [graph]);

    const group = allActions.find(({ id }) => id === selected);
    const groupActions = useActions(graph, group?.id);
    const actions = Node.isActionGroup(group) ? groupActions : allActions;

    const { results, handleSearch } = useSearchListResults({
      items: actions,
      extract: (action) => toLocalizedString(action.properties.label, t),
    });

    return (
      <Dialog.Content ref={forwardedRef}>
        <Dialog.Title srOnly>{t('commands dialog title', { ns: meta.id })}</Dialog.Title>
        <Dialog.Body>
          <SearchList.Root onSearch={handleSearch}>
            <SearchList.Content>
              <SearchList.Input placeholder={t('command list input placeholder')} />
              <SearchList.Viewport>
                {results.map((action) => {
                  const shortcut =
                    typeof action.properties.keyBinding === 'string'
                      ? action.properties.keyBinding
                      : action.properties.keyBinding?.[getHostPlatform()];

                  return (
                    <SearchList.Item
                      value={action.id}
                      key={action.id}
                      label={toLocalizedString(action.properties.label, t)}
                      icon={action.properties.icon}
                      suffix={shortcut ? keySymbols(shortcut).join('') : undefined}
                      onSelect={() => {
                        if (action.properties.disabled) {
                          return;
                        }

                        if (Node.isActionGroup(action)) {
                          setSelected(action.id);
                          return;
                        }

                        void invokePromise(LayoutOperation.UpdateDialog, { state: false });
                        setTimeout(() => {
                          const lookupId = group?.id ?? action.id;
                          const node = Graph.getConnections(graph, lookupId, Node.actionRelation('inbound'))[0];
                          if (node && Node.isAction(action)) {
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
            </SearchList.Content>
          </SearchList.Root>
        </Dialog.Body>
        <Dialog.ActionBar>
          <Dialog.Close asChild>
            <Button classNames='w-full'>{t('close label', { ns: osTranslations })}</Button>
          </Dialog.Close>
        </Dialog.ActionBar>
      </Dialog.Content>
    );
  },
);
