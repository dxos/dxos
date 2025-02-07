//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useIntentDispatcher, LayoutAction, createIntent } from '@dxos/app-framework';
import { type ActionLike, isActionGroup, isAction } from '@dxos/app-graph';
import { Keyboard, keySymbols } from '@dxos/keyboard';
import { useGraph } from '@dxos/plugin-graph';
import { Button, Dialog, Icon, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { KEY_BINDING, NAVTREE_PLUGIN } from '../meta';

// TODO(wittjosiah): This probably deserves its own plugin but for now it lives here w/ other navigation UI.
export const CommandsDialogContent = ({ selected: initial }: { selected?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const [selected, setSelected] = useState<string | undefined>(initial);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { graph } = useGraph();

  // Traverse graph.
  // TODO(burdon): Factor out commonality with shortcut dialog.
  const allActions = useMemo(() => {
    // TODO(burdon): Get from navtree (not keyboard).
    const current = Keyboard.singleton.getCurrentContext();
    const actionMap = new Set<string>();
    const actions: ActionLike[] = [];
    graph?.traverse({
      visitor: (node, path) => {
        if (
          (isAction(node) || isActionGroup(node)) &&
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

    // console.log(JSON.stringify(actions, undefined, 2));
    return actions;
  }, [graph]);

  const group = allActions.find(({ id }) => id === selected);
  const actions = isActionGroup(group) ? graph.actions(group) : allActions;

  return (
    <Dialog.Content classNames={['md:max-is-[30rem] overflow-hidden mbs-12']}>
      <Dialog.Title>{t('commands dialog title', { ns: NAVTREE_PLUGIN })}</Dialog.Title>

      {/* TODO(burdon): BUG: Overscrolls container. */}
      <SearchList.Root label={t('command list input placeholder')} classNames='flex flex-col grow overflow-hidden my-2'>
        <SearchList.Input placeholder={t('command list input placeholder')} classNames='px-1 my-2' />
        <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
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

                  if (isActionGroup(action)) {
                    setSelected(action.id);
                    return;
                  }

                  void dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } }));
                  setTimeout(() => {
                    const node = graph.nodes(group ?? action, { relation: 'inbound' })[0];
                    void (node && isAction(action) && action.data({ node, caller: KEY_BINDING }));
                  });
                }}
                classNames='flex items-center gap-2'
                disabled={action.properties.disabled}
                {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
              >
                <Icon icon={action.properties.icon} size={4} />
                <span className='grow truncate'>{label}</span>
                {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
              </SearchList.Item>
            );
          })}
        </SearchList.Content>
      </SearchList.Root>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2'>
          {t('close label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
