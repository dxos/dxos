//
// Copyright 2024 DXOS.org
//

import React from 'react';

import type { Toast as ToastProps } from '@dxos/app-framework';
import {
  Button,
  Icon,
  Toast as NaturalToast,
  toLocalizedString,
  useTranslation,
  type ToastRootProps,
} from '@dxos/react-ui';

import { DECK_PLUGIN } from '../../meta';

// TODO(wittjosiah): Render remaining duration as a progress bar within the toast.
export const Toast = ({
  id,
  title,
  description,
  icon,
  duration,
  actionLabel,
  actionAlt,
  closeLabel,
  onAction,
  onOpenChange,
}: ToastProps & Pick<ToastRootProps, 'onOpenChange'>) => {
  const { t } = useTranslation(DECK_PLUGIN);

  return (
    <NaturalToast.Root data-testid={id} defaultOpen duration={duration} onOpenChange={onOpenChange}>
      <NaturalToast.Body>
        <NaturalToast.Title classNames='items-center'>
          {icon && <Icon icon={icon} size={5} classNames='inline mr-1' />}
          {title && <span>toLocalizedString(title, t)</span>}
        </NaturalToast.Title>
        {description && (
          <NaturalToast.Description>{description && toLocalizedString(description, t)}</NaturalToast.Description>
        )}
      </NaturalToast.Body>
      <NaturalToast.Actions>
        {onAction && actionAlt && actionLabel && (
          <NaturalToast.Action altText={toLocalizedString(actionAlt, t)} asChild>
            <Button data-testid='toast.action' variant='primary' onClick={() => onAction?.()}>
              {toLocalizedString(actionLabel, t)}
            </Button>
          </NaturalToast.Action>
        )}
        {closeLabel && (
          <NaturalToast.Close asChild>
            <Button data-testid='toast.close'>{toLocalizedString(closeLabel, t)}</Button>
          </NaturalToast.Close>
        )}
      </NaturalToast.Actions>
    </NaturalToast.Root>
  );
};
