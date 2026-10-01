//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';

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
}: LayoutOperation.Toast & Pick<Next.ToastRootProps, 'onOpenChange'>) => {
  const { t } = useTranslation(meta.profile.key);

  // Control the open state so closing flips Radix's `open` (playing the exit animation) rather than
  // unmounting abruptly. Both the close button and Radix's own timeout/swipe route through here.
  const [open, setOpen] = useState(true);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Next.Toast.Root data-testid={id} open={open} duration={duration} onOpenChange={handleOpenChange}>
      <Next.Toast.Header icon={icon}>{title && toLocalizedString(title, t)}</Next.Toast.Header>
      {description && <Next.Toast.Description>{toLocalizedString(description, t)}</Next.Toast.Description>}
      {onAction && actionAlt && actionLabel && (
        <Next.Toast.Footer>
          <Next.Toast.ActionTrigger data-testid='toast.action' variant='primary' onClick={() => onAction?.()}>
            {toLocalizedString(actionLabel, t)}
          </Next.Toast.ActionTrigger>
        </Next.Toast.Footer>
      )}
    </Next.Toast.Root>
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
