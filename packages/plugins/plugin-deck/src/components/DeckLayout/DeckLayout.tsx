//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/react';

import { DeckCapabilities } from '../../capabilities';

import { ActiveNode } from './ActiveNode';
import { DeckMain } from './DeckMain';
import { Dialog } from './Dialog';
import { PopoverContent, PopoverRoot } from './Popover';
import { Toaster, type ToasterProps } from './Toast';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const context = useCapability(DeckCapabilities.MutableDeckState);
  const { toasts } = context;

  return (
    <PopoverRoot>
      <ActiveNode />
      <DeckMain />
      <PopoverContent />
      <Dialog />
      <Toaster toasts={toasts} onDismissToast={onDismissToast} />
    </PopoverRoot>
  );
};
