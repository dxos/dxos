//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useDeckState } from '../../hooks';

import { ActiveNode } from './ActiveNode';
import { DeckMain } from './DeckMain';
import { Dialog } from './Dialog';
import { PopoverContent, PopoverRoot } from './Popover';
import { Toaster, type ToasterProps } from './Toast';

export type DeckLayoutProps = Pick<ToasterProps, 'onDismissToast'>;

export const DeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const { state } = useDeckState();
  const { toasts } = state;

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
