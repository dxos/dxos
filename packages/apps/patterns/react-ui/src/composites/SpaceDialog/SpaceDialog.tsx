//
// Copyright 2023 DXOS.org
//

import { Close } from '@radix-ui/react-dialog';
import React from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { PanelDialog, PanelDialogProps } from '../../layouts';
import { SpacePanel, SpacePanelProps } from '../../panels';

export interface SpaceDialogProps
  extends Omit<PanelDialogProps, 'titleId' | 'children'>,
    Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = ({ slots, ...spacePanelProps }: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');

  return (
    <PanelDialog
      {...{
        slots: { ...slots, root: { onOpenChange: (open) => open || spacePanelProps.onDone?.(null), ...slots?.root } },
        titleId
      }}
    >
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <SpacePanel
          {...{
            ...spacePanelProps,
            titleId,
            doneActionParent: <Close asChild />
          }}
        />
      </ThemeContext.Provider>
    </PanelDialog>
  );
};
