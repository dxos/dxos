//
// Copyright 2023 DXOS.org
//

import { Action, Cancel } from '@radix-ui/react-alert-dialog';
import React from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { PanelAlertDialog, PanelAlertDialogProps } from '../../layouts';
import { SpacePanel, SpacePanelProps } from '../../panels';

export interface SpaceDialogProps
  extends Omit<PanelAlertDialogProps, 'titleId' | 'children'>,
    Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = ({ slots, ...spacePanelProps }: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');

  return (
    // TODO(wittjosiah): Use regular dialog.
    <PanelAlertDialog {...{ slots, titleId }}>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <SpacePanel
          {...{
            ...spacePanelProps,
            titleId,
            exitActionParent: <Cancel asChild />,
            doneActionParent: <Action asChild />
          }}
        />
      </ThemeContext.Provider>
    </PanelAlertDialog>
  );
};
