//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';

import { Dialog, DialogProps } from '../Dialog';
import { JoinPanel, JoinPanelProps } from './JoinPanel';

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
