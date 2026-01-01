//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, useMemo, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Keyboard, keySymbols } from '@dxos/keyboard';
import { Graph, Node } from '@dxos/plugin-graph';
import { useActions } from '@dxos/plugin-graph';
import { Button, Dialog, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import {
  cardDialogContent,
  cardDialogHeader,
  cardDialogPaddedOverflow,
  cardDialogSearchListRoot,
} from '@dxos/react-ui-stack';
import { descriptionText, mx } from '@dxos/ui-theme';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING, meta } from '../../meta';

export type CommandsDialogContentProps = {
  selected?: string;
};

// TODO(wittjosiah): This probably deserves its own plugin but for now it lives here w/ other navigation UI.
export const CommandsDialogContent = forwardRef<HTMLDivElement, CommandsDialogContentProps>(
  ({ selected: initial }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const { invokeSync } = useOperationInvoker();
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
        visitor: (node, path) => {
          if (
            (Node.isAction(node) || Node.isActionGroup(node)) &&
            !actionMap.has(node.id) &&
            current.startsWith(path.slice(0, -1).join('/'))
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

    return (
      <Dialog.Content classNames={cardDialogContent} ref={forwardedRef}>
        <Dialog.Title classNames={cardDialogHeader}>{t('commands dialog title', { ns: meta.id })}</Dialog.Title>

        <SearchList.Root label={t('command list input placeholder')} classNames={cardDialogSearchListRoot}>
          <SearchList.Input placeholder={t('command list input placeholder')} />
          <SearchList.Content classNames={cardDialogPaddedOverflow}>
            {actions?.map((action) => {
              const label = toLocalizedString(action.properties.label, t);
              const shortcut =
                typeof action.properties.keyBinding === 'string'
                  ? action.properties.keyBinding
                  : action.properties.keyBinding?.[getHostPlatform()];
              return (
                <SearchList.Item
                  value={label}
                  key={action.id}
                  onSelect={() => {
                    if (action.properties.disabled) {
                      return;
                    }

                    if (Node.isActionGroup(action)) {
                      setSelected(action.id);
                      return;
                    }

                    invokeSync(Common.LayoutOperation.UpdateDialog, { state: false });
                    setTimeout(() => {
                      const node = Graph.getConnections(graph, group?.id ?? action.id, 'inbound')[0];
                      void (node && Node.isAction(action) && action.data({ parent: node, caller: KEY_BINDING }));
                    });
                  }}
                  classNames='flex items-center gap-2'
                  disabled={action.properties.disabled}
                  {...(action.properties?.testId && {
                    'data-testid': action.properties.testId,
                  })}
                >
                  <Icon icon={action.properties.icon} size={4} />
                  <span className='grow truncate'>{label}</span>
                  {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
                </SearchList.Item>
              );
            })}
          </SearchList.Content>
        </SearchList.Root>
        <div role='none' className='pli-cardSpacingInline pbe-cardSpacingBlock'>
          <Dialog.Close asChild>
            <Button classNames='is-full'>{t('close label', { ns: 'os' })}</Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    );
  },
);
