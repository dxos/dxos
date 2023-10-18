//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';

import { JoinPanel, type JoinPanelProps } from './JoinPanel';
import { Dialog, type DialogProps } from '../Dialog';

export interface JoinSpaceDialogProps extends JoinPanelProps {
  dialogProps?: Partial<DialogProps>;
}

export const JoinDialog = ({ dialogProps, ...props }: JoinSpaceDialogProps) => {
  const { t } = useTranslation('appkit');
  return (
    <Dialog title={t('join space label')} {...dialogProps}>
      <JoinPanel {...props} />
    </Dialog>
  );
};
