//
// Copyright 2023 DXOS.org
//

import * as Dialog from '@radix-ui/react-dialog';
import React, { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

import { mx } from '@dxos/react-components';

import { defaultDialogContent, defaultOverlay } from '../../styles';

export interface PanelDialogSlots {
  root: ComponentPropsWithoutRef<typeof Dialog.Root>;
  overlay: ComponentPropsWithoutRef<typeof Dialog.Overlay>;
  content: ComponentPropsWithoutRef<typeof Dialog.Content>;
  trigger: ComponentPropsWithoutRef<typeof Dialog.Trigger>;
}

export type PanelDialogProps = PropsWithChildren<{
  titleId: string;
  slots?: Partial<PanelDialogSlots>;
}>;

export const PanelDialog = ({ titleId, slots = {}, children }: PanelDialogProps) => {
  return (
    <Dialog.Root defaultOpen {...slots.root}>
      {slots.trigger && <Dialog.Trigger {...slots.trigger} />}
      <Dialog.Overlay {...slots.overlay} className={mx(defaultOverlay, slots.overlay?.className)}>
        <Dialog.Content
          {...slots.content}
          aria-labelledby={titleId}
          className={mx(defaultDialogContent, slots.content?.className)}
        >
          {children}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};
