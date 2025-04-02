//
// Copyright 2024 DXOS.org
//

import { PaperPlaneTilt, X } from '@phosphor-icons/react';
import React, { useRef } from 'react';

import { UserFeedback } from '@dxos/plugin-observability/types';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';
import { FormProvider, useFormContext, useInputProps } from '@dxos/react-ui-form';
import { getSize } from '@dxos/react-ui-theme';

import { STATUS_BAR_PLUGIN } from '../meta';
import { mkTranslation } from '../translations';
import { getSnapshot } from '@dxos/echo-schema';

const defaultValues: UserFeedback = { name: '', email: '', message: '' };

const FormContent = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const translation = mkTranslation(t);
  const { handleSave, canSave } = useFormContext<UserFeedback>();

  const nameProps = useInputProps(['name']);
  const emailProps = useInputProps(['email']);
  const messageProps = useInputProps(['message']);

  return (
    <div role='form' className='p-3 flex flex-col gap-2'>
      <div role='none' className='space-b-1'>
        <Input.Root validationValence={nameProps.getStatus().status}>
          <Input.Label>{translation('name label')}</Input.Label>
          <Input.TextInput
            classNames={'text-sm'}
            placeholder={translation('name placeholder')}
            autoFocus
            value={nameProps.getValue() ?? ''}
            onChange={(e) => nameProps.onValueChange('string', e.target.value)}
            onBlur={nameProps.onBlur}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{nameProps.getStatus().error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-1'>
        <Input.Root validationValence={emailProps.getStatus().status}>
          <Input.Label>{translation('email input label')}</Input.Label>
          <Input.TextInput
            classNames={'text-sm'}
            placeholder={translation('email input placeholder')}
            value={emailProps.getValue() ?? ''}
            onChange={(e) => emailProps.onValueChange('string', e.target.value)}
            onBlur={emailProps.onBlur}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{emailProps.getStatus().error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-1'>
        <Input.Root validationValence={messageProps.getStatus().status}>
          <Input.Label>{translation('feedback text area label')}</Input.Label>
          <Input.TextArea
            classNames={'text-sm'}
            rows={5}
            cols={30}
            placeholder={translation('feedback text area placeholder')}
            value={messageProps.getValue() ?? ''}
            onChange={(e) => messageProps.onValueChange('string', e.target.value)}
            onBlur={messageProps.onBlur}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{messageProps.getStatus().error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-2'>
        <Button
          type='submit'
          variant='primary'
          classNames='is-full flex gap-2'
          disabled={!canSave}
          onClick={handleSave}
        >
          <span>{translation('send feedback label')}</span>
          <div className='grow' />
          <PaperPlaneTilt className={getSize(5)} />
        </Button>
        <Popover.Close asChild>
          <Button classNames='is-full flex gap-2'>
            <span>{t('cancel label', { ns: 'os' })}</span>
            <div className='grow' />
            <X className={getSize(5)} />
          </Button>
        </Popover.Close>
      </div>
    </div>
  );
};

export const FeedbackForm = ({ onSave }: { onSave: (values: UserFeedback) => void }) => {
  const formRef = useRef<HTMLDivElement>(null);

  const initialValues = getSnapshot(defaultValues);

  return (
    <FormProvider formRef={formRef} schema={UserFeedback} initialValues={initialValues} onSave={onSave}>
      <div ref={formRef}>
        <FormContent />
      </div>
    </FormProvider>
  );
};
