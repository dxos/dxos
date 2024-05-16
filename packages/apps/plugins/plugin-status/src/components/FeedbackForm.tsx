//
// Copyright 2024 DXOS.org
//

import { X, PaperPlaneTilt } from '@phosphor-icons/react';
import React, { type FC, type PropsWithChildren } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { STATUS_BAR_PLUGIN } from '../meta';
import { mkTranslation } from '../translations';

// -- Types and validation.
const FeedbackFormSchema = S.struct({
  name: S.optional(S.string),
  email: S.optional(S.string),
  message: S.optional(S.string),
});

type FeedbackFormState = S.Schema.Type<typeof FeedbackFormSchema>;

const Section: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
  <div role='none' className={mx(className)}>
    {children}
  </div>
);

export const FeedbackForm = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const translation = mkTranslation(t);

  const [formState, setFormState] = React.useState<FeedbackFormState>({ name: '', email: '', message: '' });

  const dispatch = useIntentDispatcher();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = React.useCallback(() => {
    void dispatch({
      action: 'dxos.org/plugin/observability/capture-feedback',
      data: formState,
    });
  }, [dispatch, formState]);

  const textInputClasses = 'text-sm';

  // TODO(Zan): Fix spacing and grouping
  return (
    <div role='form' className='p-3 flex flex-col gap-2'>
      {/* <h2 className='text-lg font-medium'>{translation('feedback panel title')}</h2> */}

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('name label')}</Input.Label>
          <Input.TextInput
            classNames={textInputClasses}
            placeholder={translation('name placeholder')}
            autoFocus
            name='name'
            value={formState.name}
            onChange={handleInputChange}
          />
        </Input.Root>
      </Section>

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('email input label')}</Input.Label>
          <Input.TextInput
            classNames={textInputClasses}
            placeholder={translation('email input placeholder')}
            name='email'
            value={formState.email}
            onChange={handleInputChange}
          />
        </Input.Root>
      </Section>

      <Section className='space-b-1'>
        <Input.Root>
          <Input.Label>{translation('feedback text area label')}</Input.Label>
          <Input.TextArea
            classNames={textInputClasses}
            rows={5}
            cols={30}
            placeholder={translation('feedback text area placeholder')}
            name='message'
            value={formState.message}
            onChange={handleInputChange}
          />
        </Input.Root>
      </Section>

      <Section className='space-b-2'>
        <Button variant='primary' classNames='is-full flex gap-2' onClick={() => handleSubmit()}>
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
