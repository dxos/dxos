//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, GroupProps, Input, InputProps, Loading } from '@dxos/react-ui';

export interface SingleInputStepProps extends Omit<GroupProps, 'label' | 'onChange'> {
  inputLabel: string;
  onChange: (value: string) => void;
  pending?: boolean;
  onBack?: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  loadingLabel?: string;
  inputPlaceholder?: string;
  inputProps?: Omit<InputProps, 'label' | 'placeholder'>;
}

export const SingleInputStep = ({
  inputLabel,
  onChange,
  pending,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  loadingLabel,
  inputPlaceholder,
  inputProps
}: SingleInputStepProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Input
        size='lg'
        label={t(inputLabel)}
        {...inputProps}
        {...(inputPlaceholder && { placeholder: t(inputPlaceholder) })}
        {...(pending && { disabled: true })}
        onChange={onChange}
      />
      <div role='none' aria-live='polite' className='flex gap-4 justify-end items-center'>
        <div role='none' className={cx(!pending && 'hidden')}>
          <Loading label={loadingLabel || t('generic loading label')} className='p-0 ml-0' />
        </div>
        {onBack && (
          <Button onClick={onBack} {...(pending && { disabled: true })}>
            {backLabel ?? t('back label')}
          </Button>
        )}
        <Button variant='primary' onClick={onNext} {...(pending && { disabled: true })}>
          {nextLabel ?? t('next label')}
        </Button>
      </div>
    </>
  );
};
