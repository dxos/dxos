//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

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
  const { t } = useTranslation(meta.profile.key);

  // Control the open state so closing flips Radix's `open` (playing the exit animation) rather than
  // unmounting abruptly. Both the close button and Radix's own timeout/swipe route through here.
  const [open, setOpen] = useState(true);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <NaturalToast.Root data-testid={id} open={open} duration={duration} onOpenChange={handleOpenChange}>
      <NaturalToast.Title icon={icon} onClose={() => handleOpenChange(false)}>
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

Toast.displayName = 'Toast';
