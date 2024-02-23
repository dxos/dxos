//
// Copyright 2023 DXOS.org
//

import { DotOutline } from '@phosphor-icons/react';
import React, { useMemo, useRef, useState } from 'react';

import { KEY_BINDING, type Graph, type ActionLike, isActionGroup, isAction } from '@dxos/app-graph';
import { Keyboard, keySymbols } from '@dxos/keyboard';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { NAVTREE_PLUGIN } from '../meta';
import { getTreeItemLabel } from '../util';

// TODO(wittjosiah): This probably deserves its own plugin but for now it lives here w/ other navigation UI.
export const CommandsDialogContent = ({ graph, selected: initial }: { graph?: Graph; selected?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const [selected, setSelected] = useState<string | undefined>(initial);

  // Traverse graph.
  // TODO(burdon): Factor out commonality with shortcut dialog.
  const allActions = useMemo(() => {
    // TODO(burdon): Get from navtree (not keyboard).
    const current = Keyboard.singleton.getCurrentContext();
    const actionMap = new Set<string>();
    const actions: ActionLike[] = [];
    graph?.traverse({
      visitor: (node, path) => {
        if (current.startsWith(path.join('/'))) {
          node.actions().forEach((action) => {
            if (!actionMap.has(action.id)) {
              actionMap.add(action.id);
              actions.push(action);
            }
          });
        }
      },
    });

    actions.sort(({ properties: a }, { properties: b }) => {
      return getTreeItemLabel(a.label, t)?.toLowerCase().localeCompare(getTreeItemLabel(b.label, t)?.toLowerCase());
    });

    // console.log(JSON.stringify(actions, undefined, 2));
    return actions;
  }, [graph]);

  const group = allActions.find(({ id }) => id === selected);
  const actions = isActionGroup(group) ? group.actions() : allActions;

  // TODO(burdon): Remove.
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Content classNames={['md:max-is-[30rem] overflow-hidden']}>
      <Dialog.Title>{t('commands dialog title', { ns: NAVTREE_PLUGIN })}</Dialog.Title>

      {/* TODO(burdon): BUG: Overscrolls container. */}
      <SearchList.Root label={t('commandlist input placeholder')} classNames='flex flex-col grow overflow-hidden my-2'>
        <SearchList.Input placeholder={t('commandlist input placeholder')} classNames={mx('px-1 my-2')} />
        <SearchList.Content classNames={['max-bs-[30rem] overflow-auto']}>
          {actions?.map((action) => {
            const label = getTreeItemLabel(action.properties.label, t);
            const shortcut =
              typeof action.properties.keyBinding === 'string'
                ? action.properties.keyBinding
                : action.properties.keyBinding?.[getHostPlatform()];
            const Icon = action.properties.icon ?? DotOutline;
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

                  // TODO(burdon): Remove hack to close dialog (via hook?)
                  buttonRef.current?.click();
                  setTimeout(() => {
                    isAction(action) && action.data({ caller: KEY_BINDING });
                  });
                }}
                classNames='flex items-center gap-2'
                disabled={action.properties.disabled}
                {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
              >
                <Icon className={mx(getSize(4), 'shrink-0', !action.properties.icon && 'invisible')} />
                <span className='grow truncate'>{label}</span>
                {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
              </SearchList.Item>
            );
          })}
        </SearchList.Content>
      </SearchList.Root>

      <Dialog.Close asChild>
        <Button ref={buttonRef} variant='primary' classNames='mbs-2'>
          {t('close label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
