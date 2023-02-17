//
// Copyright 2023 DXOS.org
//

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import React, { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

import { mx } from '@dxos/react-components';

import { defaultDialogContent, defaultOverlay } from '../../styles';

export interface PanelAlertDialogSlots {
  root: ComponentPropsWithoutRef<typeof AlertDialog.Root>;
  overlay: ComponentPropsWithoutRef<typeof AlertDialog.Overlay>;
  content: ComponentPropsWithoutRef<typeof AlertDialog.Content>;
  trigger: ComponentPropsWithoutRef<typeof AlertDialog.Trigger>;
}

export type PanelAlertDialogProps = PropsWithChildren<{
  titleId: string;
  slots?: Partial<PanelAlertDialogSlots>;
}>;

export const PanelAlertDialog = ({ titleId, slots = {}, children }: PanelAlertDialogProps) => {
  return (
    <AlertDialog.Root defaultOpen {...slots.root}>
      {slots.trigger && <AlertDialog.Trigger {...slots.trigger} />}
      <AlertDialog.Overlay {...slots.overlay} className={mx(defaultOverlay, slots.overlay?.className)}>
        <AlertDialog.Content
          onEscapeKeyDown={(event) => event.preventDefault()}
          {...slots.content}
          aria-labelledby={titleId}
          className={mx(defaultDialogContent, slots.content?.className)}
        >
          {children}
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};
