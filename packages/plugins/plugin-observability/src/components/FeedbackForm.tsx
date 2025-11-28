//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { getSnapshot } from '@dxos/echo/internal';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { FormProvider, NewForm, useFormContext, useFormFieldState } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { UserFeedback } from '../types';

const defaultValues: UserFeedback = { message: '' };

export type FeedbackFormProps = {
  onSave?: (values: UserFeedback) => void;
};

export const FeedbackForm = ({ onSave }: FeedbackFormProps) => {
  const { t } = useTranslation(meta.id);
  const formRef = useRef<HTMLDivElement>(null);

  const [_, update] = useState({});
  const forceRender = useCallback(() => update({}), [update]);

  const initialValues = getSnapshot(defaultValues);

  const handleSave = useCallback(
    (values: UserFeedback) => {
      onSave?.(values);
      // TODO(wittjosiah): Force re-render to clear the form.
      forceRender();
    },
    [forceRender, onSave],
  );

  return (
    <NewForm.Root onSave={handleSave}>
      <NewForm.Content>
        <FeedbackContent />
        <NewForm.Submit icon='ph--paper-plane-tilt--regular' label={t('send feedback label')} />
      </NewForm.Content>
    </NewForm.Root>
  );

  return (
    <FormProvider formRef={formRef} schema={UserFeedback} initialValues={initialValues} onSave={handleSave}>
      <div ref={formRef}>
        <FeedbackContent />
      </div>
    </FormProvider>
  );
};

const FeedbackContent = () => {
  const { t } = useTranslation(meta.id);
  const { onSave, canSave } = useFormContext<UserFeedback>(FeedbackContent.displayName);
  const messageProps = useFormFieldState(FeedbackContent.displayName, ['message']);

  return (
    <div role='form' className='p-3 flex flex-col gap-2'>
      <div role='none' className='space-b-1'>
        <Input.Root validationValence={messageProps.getStatus().status}>
          <Input.Label>{t('feedback text area label')}</Input.Label>
          <Input.TextArea
            classNames={'text-sm'}
            rows={5}
            cols={30}
            placeholder={t('feedback text area placeholder')}
            value={messageProps.getValue() ?? ''}
            onChange={(e) => messageProps.onValueChange('string', e.target.value)}
            // TODO(wittjosiah): This aggressively shows validation errors.
            onBlur={messageProps.onBlur}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{messageProps.getStatus().error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-2'>
        <IconButton
          icon='ph--paper-plane-tilt--regular'
          label={t('send feedback label')}
          variant='primary'
          type='submit'
          classNames='is-full'
          disabled={!canSave}
          onClick={onSave}
        />
      </div>
    </div>
  );
};

FeedbackContent.displayName = 'Form.FeedbackContent';
