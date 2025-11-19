//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type DXN } from '@dxos/echo';
import { DxAnchorActivate, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type UserIconButtonProps = ThemedClassName<{ value?: DXN; onContactCreate?: () => void }>;

// TODO(burdon): Factor out.
// TODO(burdon): Reconcile with Avatar if user.
export const UserIconButton = ({ value, onContactCreate }: UserIconButtonProps) => {
  const { t } = useTranslation(meta.id);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleSenderClick = useCallback(() => {
    if (value) {
      buttonRef.current?.dispatchEvent(
        new DxAnchorActivate({
          trigger: buttonRef.current,
          refId: value.toString(),
          label: 'never',
        }),
      );
    } else {
      onContactCreate?.();
    }
  }, [value, onContactCreate]);

  return (
    <IconButton
      ref={buttonRef}
      variant='ghost'
      disabled={!value && !onContactCreate}
      icon={value ? 'ph--user--regular' : 'ph--user-plus--regular'}
      iconOnly
      size={4}
      label={value ? t('show contact label') : t('create contact label')}
      onClick={handleSenderClick}
    />
  );
};
