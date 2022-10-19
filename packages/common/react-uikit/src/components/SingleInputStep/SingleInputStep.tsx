//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { TFunction, useTranslation } from 'react-i18next';

import {
  Button,
  Group,
  GroupProps,
  Input,
  InputProps,
  InputSize,
  Loading,
  LoadingColor,
  useId
} from '@dxos/react-ui';

type TKey = Parameters<TFunction>[0];

export interface SingleInputStepProps
  extends Omit<GroupProps, 'label' | 'onChange'>,
    Pick<InputProps, 'autoComplete' | 'type' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern'> {
  rootLabelTKey: TKey
  inputLabelTKey: TKey
  onChange: (value: string) => void
  pending?: boolean
  onClickBack?: () => void
  backTKey?: TKey
  onClickNext: () => void
  nextTKey?: TKey
  loadingTKey?: TKey
  inputPlaceholderTKey?: string
}

export const SingleInputStep = ({
  rootLabelTKey,
  inputLabelTKey,
  onChange,
  pending,
  onClickBack,
  backTKey = 'back label',
  onClickNext,
  nextTKey = 'next label',
  loadingTKey = 'generic loading label',
  inputPlaceholderTKey,
  autoComplete,
  type,
  min,
  max,
  minLength,
  maxLength,
  pattern,
  ...groupProps
}: SingleInputStepProps) => {
  const { t } = useTranslation();
  const loadingId = useId('singleInputStep-loading');
  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-4',
        children: t(rootLabelTKey)
      }}
      {...groupProps}
      className={cx('p-6 rounded-3xl', groupProps.className)}
      aria-live='polite'
    >
      <Input
        size={InputSize.lg}
        label={t(inputLabelTKey)}
        {...{
          autoComplete,
          type,
          min,
          max,
          minLength,
          maxLength,
          pattern
        }}
        {...(inputPlaceholderTKey && { placeholder: t(inputPlaceholderTKey) })}
        {...(pending && { disabled: true })}
        onChange={onChange}
      />
      <div role='none' className='flex gap-4 justify-end items-center'>
        <div role='none' className={cx(!pending && 'hidden')}>
          <Loading
            labelId={loadingId}
            color={LoadingColor.neutral}
            className='p-0 ml-0'
          />
          <span id={loadingId} className='sr-only'>
            {t(loadingTKey)}
          </span>
        </div>
        {onClickBack && (
          <Button onClick={onClickBack} {...(pending && { disabled: true })}>
            {t(backTKey)}
          </Button>
        )}
        <Button
          variant='primary'
          onClick={onClickNext}
          {...(pending && { disabled: true })}
        >
          {t(nextTKey)}
        </Button>
      </div>
    </Group>
  );
};
