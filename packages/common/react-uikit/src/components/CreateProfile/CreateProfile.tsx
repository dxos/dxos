//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { TFunction, useTranslation } from 'react-i18next';

import { Button, Group, GroupProps, HeadingProps, Input } from '@dxos/react-ui';

export interface CreateProfileProps extends Omit<GroupProps, 'label'> {
  label?: HeadingProps
  onClickBack?: () => void
  onClickNext: () => void
  onChangeUsername: (value: string) => void
}

const CreateProfileDefaultLabel = (t: TFunction): HeadingProps => {
  return {
    level: 1,
    className: 'mb-4',
    children: t('create profile label')
  };
};

export const CreateProfile = ({
  onClickBack,
  onClickNext,
  onChangeUsername,
  ...groupProps
}: CreateProfileProps) => {
  const { t } = useTranslation();
  return (
    <Group
      elevation={5}
      label={groupProps.label || CreateProfileDefaultLabel(t)}
      {...groupProps}
      className={cx('p-6', groupProps.className)}
    >
      <Input autoComplete='username' size='lg' label={t('username label')} placeholder={t('username placeholder')} onChange={onChangeUsername} />
      <div role='none' className='flex gap-4 justify-end'>
        {onClickBack && <Button onClick={onClickBack}>{t('back label')}</Button>}
        <Button variant='primary' onClick={onClickNext}>{t('next label')}</Button>
      </div>
    </Group>
  );
};
