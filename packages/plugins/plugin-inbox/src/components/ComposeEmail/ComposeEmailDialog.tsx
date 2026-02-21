//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Dialog, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

import { ComposeEmailPanel, type ComposeEmailPanelProps } from './ComposeEmailPanel';

export type ComposeEmailDialogProps = ComposeEmailPanelProps & {
  onCancel?: () => void;
};

export const ComposeEmailDialog = ({ onCancel, ...panelProps }: ComposeEmailDialogProps) => {
  const { t } = useTranslation(meta.id);

  const title = useMemo(() => {
    const mode = panelProps.mode ?? 'compose';
    switch (mode) {
      case 'reply':
      case 'reply-all':
        return t('compose email dialog title reply');
      case 'forward':
        return t('compose email dialog title forward');
      default:
        return t('compose email dialog title');
    }
  }, [t, panelProps.mode]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton onClick={onCancel} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <ComposeEmailPanel {...panelProps} />
      </Dialog.Body>
    </Dialog.Content>
  );
};
