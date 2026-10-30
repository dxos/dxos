//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { Dnd } from '@dxos/react-ui-dnd';

import { useDeckState } from '#hooks';
import { DeckCapabilities } from '#types';

import { Deck } from '../Deck/index.ts';
import { Dialog, PopoverContent, PopoverRoot, Toaster, type ToasterProps } from '../Overlays/index.ts';
import { ActiveNode } from './ActiveNode.tsx';
import { useWorkspaceTransition } from './useWorkspaceTransition.ts';
import { WorkspaceLayer } from './WorkspaceLayer.tsx';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const settings = Hooks.useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = PluginManagerProvider.usePluginManager();
  const live = useDeckState();
  const { deck, state, updateState } = live;
  const { toasts } = state;
  const layers = useWorkspaceTransition(live);

  return (
    <Dnd.Root>
      <PopoverRoot>
        <ActiveNode />
        <Deck.Root
          settings={settings}
          pluginManager={pluginManager}
          deck={deck}
          state={state}
          updateState={updateState}
        >
          <Deck.Content>
            {layers.map(({ id, shown, live, ref }) => (
              <WorkspaceLayer
                key={id}
                ref={ref}
                shown={shown}
                live={live}
                settings={settings}
                pluginManager={pluginManager}
              />
            ))}
          </Deck.Content>
        </Deck.Root>
        <PopoverContent />
        <Dialog />
        <Toaster toasts={toasts} onDismissToast={onDismissToast} />
      </PopoverRoot>
    </Dnd.Root>
  );
};

DeckLayout.displayName = 'DeckLayout';
