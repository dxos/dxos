//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { PaperPlaneTilt, X } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';
import { useForm } from '@dxos/react-ui-form';
import { getSize } from '@dxos/react-ui-theme';

import { STATUS_BAR_PLUGIN } from '../meta';
import { mkTranslation } from '../translations';

const Email = S.String.pipe(
  S.nonEmptyString({ message: () => 'Email is required.' }),
  S.pattern(/^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i, {
    message: () => 'Invalid email address.',
  }),
);

const nonEmpty = (field: string) => S.nonEmptyString({ message: () => `${field} is required.` });
const maxLength = (field: string, length: number) => S.maxLength(length, { message: () => `${field} is too long.` });

// Types and validation.
const FeedbackFormSchema = S.Struct({
  name: S.String.pipe(nonEmpty('Name'), maxLength('Name', 256)),
  email: Email.pipe(maxLength('Email', 256)),
  message: S.String.pipe(nonEmpty('Feedback'), maxLength('Feedback', 32_768)),
});

type FeedbackFormType = S.Schema.Type<typeof FeedbackFormSchema>;

const initialValues: FeedbackFormType = { name: '', email: '', message: '' };

export const FeedbackForm = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const translation = mkTranslation(t);
  const dispatch = useIntentDispatcher();

  const onSubmit = useCallback(
    (values: FeedbackFormType) => {
      void dispatch({ action: 'dxos.org/plugin/observability/capture-feedback', data: values });
      onClose();
    },
    [dispatch, onClose],
  );

  const { handleSubmit, canSubmit, getStatus, ...inputProps } = useForm<FeedbackFormType>({
    initialValues,
    schema: FeedbackFormSchema,
    onSubmit,
  });

  return (
    <div role='form' className='p-3 flex flex-col gap-2'>
      <div role='none' className='space-b-1'>
        <Input.Root validationValence={getStatus('name').status}>
          <Input.Label>{translation('name label')}</Input.Label>
          <Input.TextInput
            classNames={'text-sm'}
            placeholder={translation('name placeholder')}
            autoFocus
            {...inputProps}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{getStatus('name').error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-1'>
        <Input.Root validationValence={getStatus('email').status}>
          <Input.Label>{translation('email input label')}</Input.Label>
          <Input.TextInput
            classNames={'text-sm'}
            placeholder={translation('email input placeholder')}
            {...inputProps}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{getStatus('email').error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-1'>
        <Input.Root validationValence={getStatus('message').status}>
          <Input.Label>{translation('feedback text area label')}</Input.Label>
          <Input.TextArea
            classNames={'text-sm'}
            rows={5}
            cols={30}
            placeholder={translation('feedback text area placeholder')}
            {...inputProps}
          />
          <Input.DescriptionAndValidation>
            <Input.Validation>{getStatus('message').error}</Input.Validation>
          </Input.DescriptionAndValidation>
        </Input.Root>
      </div>

      <div role='none' className='space-b-2'>
        <Button
          type='submit'
          variant='primary'
          classNames='is-full flex gap-2'
          disabled={!canSubmit}
          onClick={handleSubmit}
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
