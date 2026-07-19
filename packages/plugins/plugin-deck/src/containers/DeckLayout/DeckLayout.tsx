//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { Dnd } from '@dxos/react-ui-dnd';

import { useDeckState } from '#hooks';
import { DeckCapabilities } from '#types';

import { Deck } from '../Deck';
import { ActiveNode } from './ActiveNode';
import { Dialog } from './Dialog';
import { PopoverContent, PopoverRoot } from './Popover';
import { Toaster, type ToasterProps } from './Toast';

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
            <Deck.Viewport>
              {deck.active.length === 0 ? (
                <Deck.ContentEmpty />
              ) : deck.active.length === 1 ? (
                <Deck.SoloMode />
              ) : (
                <Deck.MultiMode />
              )}
            </Deck.Viewport>
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
