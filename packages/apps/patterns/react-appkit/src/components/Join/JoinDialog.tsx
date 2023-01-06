//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Dialog, DialogProps, useTranslation } from '@dxos/react-components';

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
