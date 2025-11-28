//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { NewForm, type NewFormRootProps } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { UserFeedback } from '../types';

export type FeedbackFormProps = Pick<NewFormRootProps<UserFeedback>, 'onSave'>;

export const FeedbackForm = ({ onSave }: FeedbackFormProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <NewForm.Root schema={UserFeedback} onSave={onSave}>
      <NewForm.Content>
        <NewForm.FieldSet />
        <NewForm.Submit icon='ph--paper-plane-tilt--regular' label={t('send feedback label')} />
      </NewForm.Content>
    </NewForm.Root>
  );
};
