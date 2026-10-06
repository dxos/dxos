//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Dialog as DialogPrimitive, useDialogContext } from '@ark-ui/react/dialog';
import { useEnvironmentContext } from '@ark-ui/react/environment';
import React, { forwardRef, useId } from 'react';

import { Button, type ButtonProps } from '../Button/Button.tsx';
import * as Dialog from '../Dialog/Dialog.tsx';

//
// Root
//

type AlertDialogRootProps = Omit<Dialog.RootProps, 'role' | 'closeOnInteractOutside' | 'closeOnEscape'>;

/**
 * A Dialog with `role=alertdialog` that only its own controls close. It opens with focus on a control marked
 * `DIALOG_AUTOFOCUS_ATTRIBUTE`, else on `Cancel`, the least destructive choice.
 */
const AlertDialogRoot = ({ ids, initialFocusEl, ...props }: AlertDialogRootProps) => {
  const id = useId();
  const { getRootNode } = useEnvironmentContext();
  // The same root zag resolves the dialog in, so a dialog portalled into a shadow root or another document still finds them.
  const byId = (elementId: string): HTMLElement | null => {
    const root = getRootNode();
    return 'getElementById' in root ? root.getElementById(elementId) : null;
  };
  const contentId = ids?.content ?? `dx-alert-dialog-${id}-content`;
  const cancelId = ids?.closeTrigger ?? `dx-alert-dialog-${id}-cancel`;
  return (
    <Dialog.Root
      {...props}
      closeOnInteractOutside={false}
      closeOnEscape={false}
      role='alertdialog'
      ids={{ ...ids, content: contentId, closeTrigger: cancelId }}
      initialFocusEl={
        initialFocusEl ??
        (() => byId(contentId)?.querySelector<HTMLElement>(`[${Dialog.DIALOG_AUTOFOCUS_ATTRIBUTE}]`) ?? byId(cancelId))
      }
    />
  );
};

AlertDialogRoot.displayName = 'AlertDialog.Root';

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

AlertDialogCancel.displayName = 'AlertDialog.Cancel';

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

AlertDialogAction.displayName = 'AlertDialog.Action';
const AlertDialogTrigger = Dialog.Trigger;
const AlertDialogContent = Dialog.Content;
const AlertDialogHeader = Dialog.Header;
const AlertDialogTitle = Dialog.Title;
const AlertDialogDescription = Dialog.Description;
const AlertDialogBody = Dialog.Body;
const AlertDialogFooter = Dialog.Footer;
export type {
  AlertDialogActionProps as ActionProps,
  AlertDialogCancelProps as CancelProps,
  AlertDialogRootProps as RootProps,
};

export {
  AlertDialogAction as Action,
  AlertDialogBody as Body,
  AlertDialogCancel as Cancel,
  AlertDialogContent as Content,
  AlertDialogDescription as Description,
  AlertDialogFooter as Footer,
  AlertDialogHeader as Header,
  AlertDialogRoot as Root,
  AlertDialogTitle as Title,
  AlertDialogTrigger as Trigger,
};
