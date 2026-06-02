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
  /** Render content-height for dense, repeated rows (e.g. event attendees). */
  compact?: boolean;
}>;

// TODO(burdon): Reconcile with Avatar if space member.
export const UserIconButton = ({ classNames, value, title, onContactCreate, compact }: UserIconButtonProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <AnchorIconButton
      classNames={classNames}
      compact={compact}
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
