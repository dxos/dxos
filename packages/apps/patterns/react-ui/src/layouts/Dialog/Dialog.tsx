//
// Copyright 2023 DXOS.org
//

import * as Component from '@radix-ui/react-dialog';
import React, { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

import { mx, ThemeContext, useThemeContext } from '@dxos/react-components';

import { defaultDialogContent, defaultOverlay } from '../../styles';

export interface PanelDialogSlots {
  root: ComponentPropsWithoutRef<typeof Component.Root>;
  overlay: ComponentPropsWithoutRef<typeof Component.Overlay>;
  content: ComponentPropsWithoutRef<typeof Component.Content>;
  trigger: ComponentPropsWithoutRef<typeof Component.Trigger>;
}

export type DialogProps = PropsWithChildren<{
  titleId: string;
  slots?: Partial<PanelDialogSlots>;
}>;

export const Dialog = ({ titleId, slots = {}, children }: DialogProps) => {
  const themeContext = useThemeContext();
  return (
    <ThemeContext.Provider value={{ ...themeContext, themeVariant: 'os' }}>
      <Component.Root defaultOpen {...slots.root}>
        {slots.trigger && <Component.Trigger {...slots.trigger} />}
        <Component.Overlay {...slots.overlay} className={mx(defaultOverlay, 'z-40', slots.overlay?.className)}>
          <Component.Content
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            {...slots.content}
            aria-labelledby={titleId}
            className={mx(defaultDialogContent, slots.content?.className)}
          >
            {children}
          </Component.Content>
        </Component.Overlay>
      </Component.Root>
    </ThemeContext.Provider>
  );
};
