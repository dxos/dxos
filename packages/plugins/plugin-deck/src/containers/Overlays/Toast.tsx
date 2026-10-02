//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as ToastModule from '@dxos/react-ui/Toast';

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
}: LayoutOperation.Toast & Pick<ToastModule.RootProps, 'onOpenChange'>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  // Control the open state so closing flips Radix's `open` (playing the exit animation) rather than
  // unmounting abruptly. Both the close button and Radix's own timeout/swipe route through here.
  const [open, setOpen] = useState(true);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <ToastModule.Root data-testid={id} open={open} duration={duration} onOpenChange={handleOpenChange}>
      <ToastModule.Title icon={icon} onClose={() => handleOpenChange(false)}>
        {title && <span>{ThemeProvider.toLocalizedString(title, t)}</span>}
      </ToastModule.Title>
      {description && (
        <ToastModule.Description>{ThemeProvider.toLocalizedString(description, t)}</ToastModule.Description>
      )}
      {onAction && actionAlt && actionLabel && (
        <ToastModule.Actions>
          <ToastModule.Action altText={ThemeProvider.toLocalizedString(actionAlt, t)} asChild>
            <Button.Root data-testid='toast.action' variant='primary' onClick={() => onAction?.()}>
              {ThemeProvider.toLocalizedString(actionLabel, t)}
            </Button.Root>
          </ToastModule.Action>
        </ToastModule.Actions>
      )}
    </ToastModule.Root>
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
