//
// Copyright 2023 DXOS.org
//

import { Action, Cancel } from '@radix-ui/react-alert-dialog';
import React from 'react';

import { useId } from '@dxos/react-components';

import { AlertDialog, AlertDialogProps } from '../../layouts';
import { JoinPanel, JoinPanelProps } from '../../panels';

export interface JoinDialogProps
  extends Omit<AlertDialogProps, 'titleId' | 'children'>,
    Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = ({ slots, ...joinPanelProps }: JoinDialogProps) => {
  const titleId = useId('joinDialog__title');
  return (
    <AlertDialog {...{ slots, titleId }}>
      <JoinPanel
        {...{
          ...joinPanelProps,
          titleId,
          exitActionParent: <Cancel asChild />,
          doneActionParent: <Action asChild />
        }}
      />
    </AlertDialog>
  );
};
