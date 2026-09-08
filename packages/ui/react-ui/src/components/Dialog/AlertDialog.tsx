//
// Copyright 2023 DXOS.org
//

import { Dialog as DialogPrimitive } from '@ark-ui/react/dialog';
import React, { type ComponentPropsWithRef, type FC } from 'react';

import {
  Dialog,
  type DialogActionBarProps,
  type DialogActionIconButtonProps,
  type DialogBodyProps,
  type DialogContentProps,
  type DialogDescriptionProps,
  type DialogHeaderProps,
  type DialogOverlayProps,
  type DialogPortalProps,
  DialogRootImpl,
  type DialogRootProps,
  type DialogTitleProps,
  type DialogTriggerProps,
} from './Dialog';

//
// Root
//

type AlertDialogRootProps = DialogRootProps;

/** A dialog the machine gives `role="alertdialog"` and does not dismiss on a click outside. */
const AlertDialogRoot: FC<AlertDialogRootProps> = (props) => <DialogRootImpl {...props} role='alertdialog' />;

AlertDialogRoot.displayName = 'AlertDialog.Root';

//
// Cancel / Action
//

type AlertDialogCancelProps = ComponentPropsWithRef<typeof DialogPrimitive.CloseTrigger>;

const AlertDialogCancel = DialogPrimitive.CloseTrigger;

type AlertDialogActionProps = ComponentPropsWithRef<typeof DialogPrimitive.CloseTrigger>;

const AlertDialogAction = DialogPrimitive.CloseTrigger;

//
// AlertDialog
//

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: Dialog.Trigger,
  Portal: Dialog.Portal,
  Overlay: Dialog.Overlay,
  Content: Dialog.Content,
  Header: Dialog.Header,
  Body: Dialog.Body,
  Title: Dialog.Title,
  Description: Dialog.Description,
  ActionBar: Dialog.ActionBar,
  ActionIconButton: Dialog.ActionIconButton,
  // AlertDialog-specific dismissal.
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
};

export type {
  DialogActionBarProps as AlertDialogActionBarProps,
  DialogActionIconButtonProps as AlertDialogActionIconButtonProps,
  AlertDialogActionProps,
  DialogBodyProps as AlertDialogBodyProps,
  AlertDialogCancelProps,
  DialogContentProps as AlertDialogContentProps,
  DialogDescriptionProps as AlertDialogDescriptionProps,
  DialogHeaderProps as AlertDialogHeaderProps,
  DialogOverlayProps as AlertDialogOverlayProps,
  DialogPortalProps as AlertDialogPortalProps,
  AlertDialogRootProps,
  DialogTitleProps as AlertDialogTitleProps,
  DialogTriggerProps as AlertDialogTriggerProps,
};
