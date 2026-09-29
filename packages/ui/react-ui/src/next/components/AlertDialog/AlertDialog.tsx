//
// Copyright 2026 DXOS.org
//

import { Dialog as DialogPrimitive, useDialogContext } from '@ark-ui/react/dialog';
import React, { forwardRef, useId } from 'react';

import { Button, type ButtonProps } from '../Button/index.ts';
import { Dialog, DIALOG_AUTOFOCUS_ATTRIBUTE, type DialogRootProps } from '../Dialog/index.ts';

//
// Root
//

type AlertDialogRootProps = Omit<DialogRootProps, 'role'>;

/**
 * A Dialog with `role=alertdialog`, which zag keeps open on an outside click. It opens with focus on a control marked
 * `DIALOG_AUTOFOCUS_ATTRIBUTE`, else on `Cancel`, the least destructive choice.
 */
const AlertDialogRoot = ({ ids, initialFocusEl, ...props }: AlertDialogRootProps) => {
  const id = useId();
  const contentId = ids?.content ?? `nx-alert-dialog-${id}-content`;
  const cancelId = ids?.closeTrigger ?? `nx-alert-dialog-${id}-cancel`;
  return (
    <Dialog.Root
      {...props}
      role='alertdialog'
      ids={{ ...ids, content: contentId, closeTrigger: cancelId }}
      initialFocusEl={
        initialFocusEl ??
        (() =>
          document.getElementById(contentId)?.querySelector<HTMLElement>(`[${DIALOG_AUTOFOCUS_ATTRIBUTE}]`) ??
          document.getElementById(cancelId))
      }
    />
  );
};

AlertDialogRoot.displayName = 'Next.AlertDialog.Root';

//
// Cancel
//

type AlertDialogCancelProps = ButtonProps;

/** A Button that closes the dialog without acting; the caller names it (Next ships no translated labels). */
const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogCancelProps>((props, forwardedRef) => (
  <DialogPrimitive.CloseTrigger asChild>
    <Button {...props} ref={forwardedRef} />
  </DialogPrimitive.CloseTrigger>
));

AlertDialogCancel.displayName = 'Next.AlertDialog.Cancel';

//
// Action
//

type AlertDialogActionProps = ButtonProps;

/** The confirming Button (`primary` by default): runs `onClick`, then closes unless the handler prevents default. */
const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ variant = 'primary', onClick, ...props }, forwardedRef) => {
    const dialog = useDialogContext();
    return (
      <Button
        {...props}
        variant={variant}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            dialog.setOpen(false);
          }
        }}
        ref={forwardedRef}
      />
    );
  },
);

AlertDialogAction.displayName = 'Next.AlertDialog.Action';

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: Dialog.Trigger,
  Content: Dialog.Content,
  Header: Dialog.Header,
  Title: Dialog.Title,
  Description: Dialog.Description,
  Body: Dialog.Body,
  Footer: Dialog.Footer,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
};

export type { AlertDialogActionProps, AlertDialogCancelProps, AlertDialogRootProps };
