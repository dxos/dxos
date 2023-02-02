//
// Copyright 2023 DXOS.org
//

import { Action, Cancel } from '@radix-ui/react-alert-dialog';
import React from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { PanelAlertDialog, PanelAlertDialogProps } from '../../layouts';
import { JoinPanel, JoinPanelProps } from '../../panels';

export interface JoinDialogProps extends Omit<PanelAlertDialogProps, 'titleId' | 'children'>, JoinPanelProps {}

export const JoinDialog = ({ slots, ...joinPanelProps }: JoinDialogProps) => {
  const titleId = useId('joinDialog__title');
  return (
    <PanelAlertDialog {...{ slots, titleId }}>
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <JoinPanel
          {...{
            ...joinPanelProps,
            titleId,
            exitActionParent: <Cancel asChild />,
            doneActionParent: <Action asChild />
          }}
        />
      </ThemeContext.Provider>
    </PanelAlertDialog>
  );
};
