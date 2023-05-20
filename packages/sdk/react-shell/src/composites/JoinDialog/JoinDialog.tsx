//
// Copyright 2023 DXOS.org
//

import { Action, Cancel } from '@radix-ui/react-alert-dialog';
import React from 'react';

import { ThemeContext, useId, useThemeContext } from '@dxos/aurora';
import { osTx } from '@dxos/aurora-theme';

import { PanelAlertDialog, PanelAlertDialogProps } from '../../layouts';
import { JoinPanel, JoinPanelProps } from '../../panels';

export interface JoinDialogProps
  extends Omit<PanelAlertDialogProps, 'titleId' | 'children'>,
    Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = ({ slots, ...joinPanelProps }: JoinDialogProps) => {
  const titleId = useId('joinDialog__title');
  const themeContextValue = useThemeContext();

  return (
    <PanelAlertDialog {...{ slots, titleId }}>
      <ThemeContext.Provider value={{ ...themeContextValue, tx: osTx }}>
        <JoinPanel
          {...{
            ...joinPanelProps,
            titleId,
            exitActionParent: <Cancel asChild />,
            doneActionParent: <Action asChild />,
          }}
        />
      </ThemeContext.Provider>
    </PanelAlertDialog>
  );
};
