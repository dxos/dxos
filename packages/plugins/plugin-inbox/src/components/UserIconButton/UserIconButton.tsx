//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type URI } from '@dxos/keys';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { AnchorIconButton } from '../AnchorIconButton';

export type UserIconButtonProps = ThemedClassName<{
  value?: URI.URI;
  title?: string;
  onContactCreate?: () => void;
}>;

// TODO(burdon): Reconcile with Avatar if space member.
export const UserIconButton = ({ classNames, value, title, onContactCreate }: UserIconButtonProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <AnchorIconButton
      classNames={classNames}
      value={value}
      title={title}
      onClick={onContactCreate}
      icon='ph--user--regular'
      fallbackIcon='ph--user-plus--regular'
      label={t('show-contact.label')}
      fallbackLabel={t('create-contact.label')}
    />
  );
};
