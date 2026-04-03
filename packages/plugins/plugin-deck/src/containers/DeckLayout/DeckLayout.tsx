//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { type LayoutChangeRequest, DeckMain } from '../DeckMain';
import { useDeckState } from '../../hooks';

import { ActiveNode } from './ActiveNode';
import { Dialog } from './Dialog';
import { PopoverContent, PopoverRoot } from './Popover';
import { Toaster, type ToasterProps } from './Toast';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const { state } = useDeckState();
  const { toasts } = state;
  const { invokePromise } = useOperationInvoker();

  const handleLayoutChange = useCallback(
    (request: LayoutChangeRequest) => {
      void invokePromise(LayoutOperation.SetLayoutMode, request);
    },
    [invokePromise],
  );

  return (
    <Mosaic.Root>
      <PopoverRoot>
        <ActiveNode />
        <DeckMain onLayoutChange={handleLayoutChange} />
        <PopoverContent />
        <Dialog />
        <Toaster toasts={toasts} onDismissToast={onDismissToast} />
      </PopoverRoot>
    </Mosaic.Root>
  );
};
