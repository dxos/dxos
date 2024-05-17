//
// Copyright 2024 DXOS.org
//

import { X, PaperPlaneTilt } from '@phosphor-icons/react';
import React, { type FC, type PropsWithChildren, useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { useForm } from '../hooks';
import { STATUS_BAR_PLUGIN } from '../meta';
import { mkTranslation } from '../translations';
import { validate } from '../util';

const Email = S.string.pipe(
  S.nonEmpty({ message: () => 'Email is required.' }),
  S.pattern(/^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i, {
    message: () => 'Invalid email address.',
  }),
);

const nonEmpty = (field: string) => S.nonEmpty({ message: () => `${field} is required.` });
const maxLength = (field: string, length: number) => S.maxLength(length, { message: () => `${field} is too long.` });

// -- Types and validation.
const FeedbackFormSchema = S.struct({
  name: S.string.pipe(nonEmpty('Name'), maxLength('Name', 256)),
  email: Email.pipe(maxLength('Email', 256)),
  message: S.string.pipe(nonEmpty('Feedback'), maxLength('Feedback', 32_768)),
});

type FeedbackFormState = S.Schema.Type<typeof FeedbackFormSchema>;

const initialValues: FeedbackFormState = {
  name: '',
  email: '',
  message: '',
};

const Section: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
  <div role='none' className={mx(className)}>
    {children}
  </div>
);

export const FeedbackForm = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const translation = mkTranslation(t);

  const dispatch = useIntentDispatcher();

  const onSubmit = useCallback(
    (values: FeedbackFormState) => {
      void dispatch({ action: 'dxos.org/plugin/observability/capture-feedback', data: values });
    },
    [dispatch],
  );

  const { values, errors, handleChange, handleSubmit, canSubmit, touched, touchOnBlur } = useForm<FeedbackFormState>({
    initialValues,
    validate: (values) => validate(FeedbackFormSchema, values),
    onSubmit: (values) => onSubmit(values),
  });

  const textInputClasses = 'text-sm';

  return (
    <div role='form' className='p-3 flex flex-col gap-2'>
      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('name label')}</Input.Label>
          <Input.TextInput
            classNames={textInputClasses}
            placeholder={translation('name placeholder')}
            autoFocus
            name='name'
            value={values.name}
            onChange={handleChange}
            onBlur={touchOnBlur}
            aria-invalid={errors.name !== undefined}
          />
          <Input.DescriptionAndValidation>
            {touched.name && errors.name && <Input.Validation>{errors.name}</Input.Validation>}
          </Input.DescriptionAndValidation>
        </Input.Root>
      </Section>

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('email input label')}</Input.Label>
          <Input.TextInput
            classNames={textInputClasses}
            placeholder={translation('email input placeholder')}
            name='email'
            value={values.email}
            onChange={handleChange}
            onBlur={touchOnBlur}
            aria-invalid={errors.email !== undefined}
          />
          <Input.DescriptionAndValidation>
            {touched.email && errors.email && <Input.Validation>{errors.email}</Input.Validation>}
          </Input.DescriptionAndValidation>
        </Input.Root>
      </Section>

      <Section className='space-b-1'>
        <Input.Root validationValence='error'>
          <Input.Label>{translation('feedback text area label')}</Input.Label>
          <Input.TextArea
            classNames={textInputClasses}
            rows={5}
            cols={30}
            placeholder={translation('feedback text area placeholder')}
            name='message'
            value={values.message}
            onChange={handleChange}
            onBlur={touchOnBlur}
            aria-invalid={errors.message !== undefined}
          />
          <Input.DescriptionAndValidation>
            {touched.message && errors.message && <Input.Validation>{errors.message}</Input.Validation>}
          </Input.DescriptionAndValidation>
        </Input.Root>
      </Section>

      <Section className='space-b-2'>
        <Button variant='primary' classNames='is-full flex gap-2' disabled={!canSubmit} onClick={() => handleSubmit()}>
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
      </Section>
    </div>
  );
};
