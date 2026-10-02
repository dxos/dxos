//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { Dialog as DialogPrimitive } from '@ark-ui/react/dialog';
import React, { type ComponentPropsWithRef, type FC } from 'react';

import * as Dialog from './Dialog.tsx';
//
// Root
//

type AlertDialogRootProps = Dialog.RootProps;

/** A dialog the machine gives `role="alertdialog"` and does not dismiss on a click outside. */
const AlertDialogRoot: FC<AlertDialogRootProps> = (props) => <Dialog.RootImpl {...props} role='alertdialog' />;

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
const AlertDialogTrigger = Dialog.Trigger;
const AlertDialogPortal = Dialog.Portal;
const AlertDialogOverlay = Dialog.Overlay;
const AlertDialogContent = Dialog.Content;
const AlertDialogHeader = Dialog.Header;
const AlertDialogBody = Dialog.Body;
const AlertDialogTitle = Dialog.Title;
const AlertDialogDescription = Dialog.Description;
const AlertDialogActionBar = Dialog.ActionBar;
const AlertDialogActionIconButton = Dialog.ActionIconButton;
export type {
  AlertDialogActionProps as ActionProps,
  AlertDialogCancelProps as CancelProps,
  AlertDialogRootProps as RootProps,
};

export {
  AlertDialogAction as Action,
  AlertDialogActionBar as ActionBar,
  AlertDialogActionIconButton as ActionIconButton,
  AlertDialogBody as Body,
  AlertDialogCancel as Cancel,
  AlertDialogContent as Content,
  AlertDialogDescription as Description,
  AlertDialogHeader as Header,
  AlertDialogOverlay as Overlay,
  AlertDialogPortal as Portal,
  AlertDialogRoot as Root,
  AlertDialogTitle as Title,
  AlertDialogTrigger as Trigger,
};
export type ActionBarProps = Dialog.ActionBarProps;
export type ActionIconButtonProps = Dialog.ActionIconButtonProps;
export type BodyProps = Dialog.BodyProps;
export type ContentProps = Dialog.ContentProps;
export type DescriptionProps = Dialog.DescriptionProps;
export type HeaderProps = Dialog.HeaderProps;
export type OverlayProps = Dialog.OverlayProps;
export type PortalProps = Dialog.PortalProps;
export type TitleProps = Dialog.TitleProps;
export type TriggerProps = Dialog.TriggerProps;
