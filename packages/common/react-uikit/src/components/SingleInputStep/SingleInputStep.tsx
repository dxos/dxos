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
  HeadingProps,
  Input,
  InputProps,
  InputSize
} from '@dxos/react-ui';

type TKey = Parameters<TFunction>[0]

export interface SingleInputStepProps extends Omit<GroupProps, 'label' | 'onChange'>, Pick<InputProps, 'autoComplete' | 'type'> {
  rootLabelTKey: TKey
  inputLabelTKey: TKey
  onChange: (value: string) => void
  label?: HeadingProps
  onClickBack?: () => void
  backTKey?: TKey
  onClickNext: () => void
  nextTKey?: TKey
  inputPlaceholderTKey?: string
}

export const SingleInputStep = ({
  rootLabelTKey,
  inputLabelTKey,
  onChange,
  inputPlaceholderTKey,
  onClickBack,
  backTKey = 'back label',
  onClickNext,
  nextTKey = 'next label',
  autoComplete,
  type,
  ...groupProps
}: SingleInputStepProps) => {
  const { t } = useTranslation();
  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-4',
        children: t(rootLabelTKey)
      }}
      {...groupProps}
      className={cx('p-4 pt-5 rounded-2xl', groupProps.className)}
    >
      <Input size={InputSize.lg} label={t(inputLabelTKey)} {...{ autoComplete, type }} {...(inputPlaceholderTKey && { placeholder: t(inputPlaceholderTKey) })} onChange={onChange} />
      <div role='none' className='flex gap-4 justify-end'>
        {onClickBack && <Button onClick={onClickBack}>{t(backTKey)}</Button>}
        <Button variant='primary' onClick={onClickNext}>{t(nextTKey)}</Button>
      </div>
    </Group>
  );
};
