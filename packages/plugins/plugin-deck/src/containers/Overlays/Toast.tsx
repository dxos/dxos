//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import * as UiToast from '@dxos/react-ui/Toast';

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
}: LayoutOperation.Toast & Pick<UiToast.RootProps, 'onOpenChange'>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  // Control the open state so closing flips Radix's `open` (playing the exit animation) rather than
  // unmounting abruptly. Both the close button and Radix's own timeout/swipe route through here.
  const [open, setOpen] = useState(true);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <UiToast.Root data-testid={id} open={open} duration={duration} onOpenChange={handleOpenChange}>
      <UiToast.Header icon={icon}>{title && Theme.toLocalizedString(title, t)}</UiToast.Header>
      {description && <UiToast.Description>{Theme.toLocalizedString(description, t)}</UiToast.Description>}
      {onAction && actionAlt && actionLabel && (
        <UiToast.Footer>
          <UiToast.ActionTrigger data-testid='toast.action' variant='primary' onClick={() => onAction?.()}>
            {Theme.toLocalizedString(actionLabel, t)}
          </UiToast.ActionTrigger>
        </UiToast.Footer>
      )}
    </UiToast.Root>
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
