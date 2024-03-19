//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { Dialog, useTranslation } from '@dxos/react-ui';
import { type AddSectionPosition } from '@dxos/react-ui-stack';

import { STACK_PLUGIN } from '../meta';

type AddSectionDialogProps = { path?: string; position: AddSectionPosition };

export const dataHasAddSectionDialogProps = (data: any): data is { subject: AddSectionDialogProps } => {
  return (
    'subject' in data &&
    typeof data.subject === 'object' &&
    !!data.subject &&
    'position' in data.subject &&
    typeof data.subject.position === 'string'
  );
};

export const AddSectionDialog = ({ path, position }: AddSectionDialogProps) => {
  const { t } = useTranslation(STACK_PLUGIN);
  return (
    <Dialog.Content>
      <Dialog.Title>{t('add section dialog title')}</Dialog.Title>
      <span>{path}</span>
      <span>{position}</span>
    </Dialog.Content>
  );
};
