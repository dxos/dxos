//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogProps } from '@dxos/react-ui';

import { JoinPanel, JoinPanelProps } from './JoinPanel';

export interface JoinSpaceDialogProps extends JoinPanelProps {
  dialogProps?: Partial<DialogProps>;
}

export const JoinDialog = ({ dialogProps, ...props }: JoinSpaceDialogProps) => {
  const { t } = useTranslation();
  return (
    <Dialog title={t('join space label')} {...dialogProps} closeLabel={t('close label', { ns: 'uikit' })}>
      <JoinPanel {...props} />
    </Dialog>
  );
};
