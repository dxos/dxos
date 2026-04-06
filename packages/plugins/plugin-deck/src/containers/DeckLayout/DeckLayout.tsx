//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useAtomCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useDeckState } from '../../hooks';
import { DeckCapabilities, getMode } from '../../types';
import { Deck, type DeckLayoutChangeRequest } from '../Deck';

import { ActiveNode } from './ActiveNode';
import { Dialog } from './Dialog';
import { PopoverContent, PopoverRoot } from './Popover';
import { Toaster, type ToasterProps } from './Toast';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();
  const layoutMode = getMode(deck);
  const { toasts } = state;
  const { invokePromise } = useOperationInvoker();

  const handleLayoutChange = useCallback(
    (request: DeckLayoutChangeRequest) => {
      void invokePromise(LayoutOperation.SetLayoutMode, request);
    },
    [invokePromise],
  );

  return (
    <Mosaic.Root>
      <PopoverRoot>
        <ActiveNode />
        <Deck.Root
          settings={settings}
          pluginManager={pluginManager}
          layoutMode={layoutMode}
          state={state}
          deck={deck}
          updateState={updateState}
          onLayoutChange={handleLayoutChange}
        >
          <Deck.Content />
        </Deck.Root>
        <PopoverContent />
        <Dialog />
        <Toaster toasts={toasts} onDismissToast={onDismissToast} />
      </PopoverRoot>
    </Mosaic.Root>
  );
};
