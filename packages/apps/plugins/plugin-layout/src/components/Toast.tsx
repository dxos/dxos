//
// Copyright 2024 DXOS.org
//

import React from 'react';

import type { Toast as ToastProps } from '@dxos/app-framework';
import { Button, Toast as NaturalToast, type ToastRootProps } from '@dxos/react-ui';

export const Toast = ({
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
  return (
    <NaturalToast.Root defaultOpen duration={duration} onOpenChange={onOpenChange}>
      <NaturalToast.Body>
        <NaturalToast.Title>
          {icon?.({ className: 'inline mr-1' })}
          <span>{title}</span>
        </NaturalToast.Title>
        {description && <NaturalToast.Description>{description}</NaturalToast.Description>}
      </NaturalToast.Body>
      <NaturalToast.Actions>
        {onAction && actionAlt && actionLabel && (
          <NaturalToast.Action altText={actionAlt} asChild>
            <Button data-testid='toast.action' variant='primary' onClick={() => onAction?.()}>
              {actionLabel}
            </Button>
          </NaturalToast.Action>
        )}
        {closeLabel && (
          <NaturalToast.Close asChild>
            <Button data-testid='toast.close'>{closeLabel}</Button>
          </NaturalToast.Close>
        )}
      </NaturalToast.Actions>
    </NaturalToast.Root>
  );
};
