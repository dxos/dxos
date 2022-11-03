//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogProps } from '@dxos/react-ui';

import { JoinSpacePanel, JoinSpacePanelProps } from './JoinSpacePanel';

export interface JoinSpaceDialogProps extends JoinSpacePanelProps {
  dialogProps?: Partial<DialogProps>;
}

export const JoinSpaceDialog = ({ dialogProps, ...props }: JoinSpaceDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog title={t('join space label', { ns: 'uikit' })} {...dialogProps}>
      <JoinSpacePanel {...props} />
    </Dialog>
  );
};
