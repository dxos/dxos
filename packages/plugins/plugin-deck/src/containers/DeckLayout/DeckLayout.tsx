//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { Dnd } from '@dxos/react-ui-dnd';

import { useDeckState } from '#hooks';
import { DeckCapabilities } from '#types';

import { Deck } from '../Deck/index.ts';
import { Dialog, PopoverContent, PopoverRoot, Toaster, type ToasterProps } from '../Overlays/index.ts';
import { ActiveNode } from './ActiveNode.tsx';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { deck, state, updateState } = useDeckState();
  const { toasts } = state;

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
            <Deck.Viewport>{deck.active.length === 0 ? <Deck.ContentEmpty /> : <Deck.Planks />}</Deck.Viewport>
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
