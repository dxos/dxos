//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type LayoutOperation } from '@dxos/app-toolkit';
import { Button, Toast as NaturalToast, type ToastRootProps, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

// TODO(wittjosiah): Render remaining duration as a progress bar within the toast.
export const Toast = ({
  id,
  title,
  description,
  icon,
  duration,
  actionLabel,
  actionAlt,
  onAction,
  onOpenChange,
}: LayoutOperation.Toast & Pick<ToastRootProps, 'onOpenChange'>) => {
  const { t } = useTranslation(meta.id);

  return (
    <NaturalToast.Root data-testid={id} defaultOpen duration={duration} onOpenChange={onOpenChange}>
      <NaturalToast.Title icon={icon} onClose={() => onOpenChange?.(false)}>
        {title && <span>{toLocalizedString(title, t)}</span>}
      </NaturalToast.Title>
      {description && <NaturalToast.Description>{toLocalizedString(description, t)}</NaturalToast.Description>}
      {onAction && actionAlt && actionLabel && (
        <NaturalToast.Actions>
          <NaturalToast.Action altText={toLocalizedString(actionAlt, t)} asChild>
            <Button data-testid='toast.action' variant='primary' onClick={() => onAction?.()}>
              {toLocalizedString(actionLabel, t)}
            </Button>
          </NaturalToast.Action>
        </NaturalToast.Actions>
      )}
    </NaturalToast.Root>
  );
};

export type ToasterProps = {
  toasts?: LayoutOperation.Toast[];
  onDismissToast?: (id: string) => void;
};

export const Toaster = ({ toasts, onDismissToast }: ToasterProps) => {
  return (
    <>
      {toasts?.map((toast) => (
        <Toast
          {...toast}
          key={toast.id}
          onOpenChange={(open: boolean) => {
            if (!open) {
              onDismissToast?.(toast.id);
            }

            return open;
          }}
        />
      ))}
    </>
  );
};
