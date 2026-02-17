//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Form, type FormRootProps, type FormSubmitProps } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { UserFeedback } from '../types';

export type FeedbackFormProps = Pick<FormRootProps<UserFeedback>, 'onSave'> & Pick<FormSubmitProps, 'disabled'>;

export const FeedbackForm = ({ onSave, disabled }: FeedbackFormProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Form.Root schema={UserFeedback} onSave={onSave}>
      <Form.Content>
        <Form.FieldSet />
        <Form.Submit icon='ph--paper-plane-tilt--regular' label={t('send feedback label')} disabled={disabled} />
      </Form.Content>
    </Form.Root>
  );
};
