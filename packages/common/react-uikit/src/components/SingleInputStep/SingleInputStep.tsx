//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Group,
  GroupProps,
  Input,
  InputProps,
  Loading
} from '@dxos/react-ui';

export interface SingleInputStepProps
  extends Omit<GroupProps, 'label' | 'onChange'> {
  rootLabel: string
  inputLabel: string
  onChange: (value: string) => void
  pending?: boolean
  onBack?: () => void
  backLabel?: string
  onNext: () => void
  nextLabel?: string
  loadingLabel?: string
  inputPlaceholder?: string
  inputProps?: Omit<InputProps, 'label' | 'placeholder'>
}

export const SingleInputStep = ({
  rootLabel,
  inputLabel,
  onChange,
  pending,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  loadingLabel,
  inputPlaceholder,
  inputProps,
  ...groupProps
}: SingleInputStepProps) => {
  const { t } = useTranslation();
  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-2 text-3xl',
        children: t(rootLabel)
      }}
      {...groupProps}
      className={cx('p-5 rounded-xl', groupProps.className)}
      aria-live='polite'
    >
      <Input
        size='lg'
        label={t(inputLabel)}
        {...inputProps}
        {...(inputPlaceholder && { placeholder: t(inputPlaceholder) })}
        {...(pending && { disabled: true })}
        onChange={onChange}
      />
      <div role='none' className='flex gap-4 justify-end items-center'>
        <div role='none' className={cx(!pending && 'hidden')}>
          <Loading
            label={loadingLabel || t('generic loading label')}
            className='p-0 ml-0'
          />
        </div>
        {onBack && (
          <Button onClick={onBack} {...(pending && { disabled: true })}>
            {backLabel ?? t('back label')}
          </Button>
        )}
        <Button
          variant='primary'
          onClick={onNext}
          {...(pending && { disabled: true })}
        >
          {nextLabel ?? t('next label')}
        </Button>
      </div>
    </Group>
  );
};
