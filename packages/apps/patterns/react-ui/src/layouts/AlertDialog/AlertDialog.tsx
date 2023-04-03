//
// Copyright 2023 DXOS.org
//

import * as BaseAlertDialog from '@radix-ui/react-alert-dialog';
import React, { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

import { mx, ThemeContext, useThemeContext } from '@dxos/react-components';

import { defaultDialogContent, defaultOverlay } from '../../styles';

export interface PanelAlertDialogSlots {
  root: ComponentPropsWithoutRef<typeof BaseAlertDialog.Root>;
  overlay: ComponentPropsWithoutRef<typeof BaseAlertDialog.Overlay>;
  content: ComponentPropsWithoutRef<typeof BaseAlertDialog.Content>;
  trigger: ComponentPropsWithoutRef<typeof BaseAlertDialog.Trigger>;
}

export type AlertDialogProps = PropsWithChildren<{
  titleId: string;
  slots?: Partial<PanelAlertDialogSlots>;
}>;

export const AlertDialog = ({ titleId, slots = {}, children }: AlertDialogProps) => {
  const themeContext = useThemeContext();
  return (
    <ThemeContext.Provider value={{ ...themeContext, themeVariant: 'os' }}>
      <BaseAlertDialog.Root defaultOpen {...slots.root}>
        {slots.trigger && <BaseAlertDialog.Trigger {...slots.trigger} />}
        <BaseAlertDialog.Overlay {...slots.overlay} className={mx(defaultOverlay, 'z-40', slots.overlay?.className)}>
          <BaseAlertDialog.Content
            onEscapeKeyDown={(event) => event.preventDefault()}
            {...slots.content}
            aria-labelledby={titleId}
            className={mx(defaultDialogContent, slots.content?.className)}
          >
            {children}
          </BaseAlertDialog.Content>
        </BaseAlertDialog.Overlay>
      </BaseAlertDialog.Root>
    </ThemeContext.Provider>
  );
};
