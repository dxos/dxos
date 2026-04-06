//
// Copyright 2023 DXOS.org
//

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { createContext } from '@radix-ui/react-context';
import React, { type ForwardRefExoticComponent, type FunctionComponent, forwardRef } from 'react';

import { type DialogSize } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { Column } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

import {
  Dialog,
  type DialogHeaderProps,
  type DialogBodyProps,
  type DialogActionBarProps,
  type DialogCloseIconButtonProps,
} from './Dialog';

//
// Root
//

type AlertDialogRootProps = AlertDialogPrimitive.AlertDialogProps;

const AlertDialogRoot: FunctionComponent<AlertDialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <AlertDialogPrimitive.Root {...props} />
  </ElevationProvider>
);

//
// Trigger
//

type AlertDialogTriggerProps = AlertDialogPrimitive.AlertDialogTriggerProps;

const AlertDialogTrigger: FunctionComponent<AlertDialogTriggerProps> = AlertDialogPrimitive.Trigger;

//
// Portal
//

type AlertDialogPortalProps = AlertDialogPrimitive.AlertDialogPortalProps;

const AlertDialogPortal: FunctionComponent<AlertDialogPortalProps> = AlertDialogPrimitive.Portal;

//
// Cancel
//

type AlertDialogCancelProps = AlertDialogPrimitive.AlertDialogCancelProps;

const AlertDialogCancel: FunctionComponent<AlertDialogCancelProps> = AlertDialogPrimitive.Cancel;

//
// Action
//

type AlertDialogActionProps = AlertDialogPrimitive.AlertDialogActionProps;

const AlertDialogAction: FunctionComponent<AlertDialogActionProps> = AlertDialogPrimitive.Action;

//
// Context
//

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

const ALERT_DIALOG_OVERLAY_NAME = 'AlertDialogOverlay';
const ALERT_DIALOG_CONTENT_NAME = 'AlertDialogContent';

const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  ALERT_DIALOG_OVERLAY_NAME,
  { inOverlayLayout: false },
);

//
// Overlay
//

type AlertDialogOverlayProps = ThemedClassName<
  AlertDialogPrimitive.AlertDialogOverlayProps & { blockAlign?: 'center' | 'start' | 'end' }
>;

const AlertDialogOverlay: ForwardRefExoticComponent<AlertDialogOverlayProps> = forwardRef<
  HTMLDivElement,
  AlertDialogOverlayProps
>(({ classNames, children, blockAlign, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogPrimitive.Overlay
      {...props}
      data-block-align={blockAlign}
      className={tx('dialog.overlay', {}, classNames)}
      ref={forwardedRef}
    >
      <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
    </AlertDialogPrimitive.Overlay>
  );
});

AlertDialogOverlay.displayName = ALERT_DIALOG_OVERLAY_NAME;

//
// Content
//

type AlertDialogContentProps = ThemedClassName<AlertDialogPrimitive.AlertDialogContentProps> & { size?: DialogSize };

const AlertDialogContent: ForwardRefExoticComponent<AlertDialogContentProps> = forwardRef<
  HTMLDivElement,
  AlertDialogContentProps
>(({ classNames, children, size = 'md', ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { inOverlayLayout } = useOverlayLayoutContext(ALERT_DIALOG_CONTENT_NAME);
  return (
    <AlertDialogPrimitive.Content
      {...props}
      className={tx('dialog.content', { inOverlayLayout, size }, classNames)}
      // NOTE: Radix warning unless set to undefined.
      // https://www.radix-ui.com/primitives/docs/components/dialog#description
      aria-describedby={undefined}
      ref={forwardedRef}
    >
      <Column.Root classNames='dx-expander' gutter='sm'>
        {children}
      </Column.Root>
    </AlertDialogPrimitive.Content>
  );
});

AlertDialogContent.displayName = ALERT_DIALOG_CONTENT_NAME;

//
// Title
//

type AlertDialogTitleProps = ThemedClassName<AlertDialogPrimitive.AlertDialogTitleProps> & { srOnly?: boolean };

const AlertDialogTitle: ForwardRefExoticComponent<AlertDialogTitleProps> = forwardRef<
  HTMLHeadingElement,
  AlertDialogTitleProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogPrimitive.Title {...props} className={tx('dialog.title', { srOnly }, classNames)} ref={forwardedRef} />
  );
});

//
// Description
//

type AlertDialogDescriptionProps = ThemedClassName<AlertDialogPrimitive.AlertDialogDescriptionProps> & {
  srOnly?: boolean;
};

const AlertDialogDescription: ForwardRefExoticComponent<AlertDialogDescriptionProps> = forwardRef<
  HTMLParagraphElement,
  AlertDialogDescriptionProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogPrimitive.Description
      {...props}
      className={tx('dialog.description', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

//
// AlertDialog
//

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  // Shared with Dialog.
  Header: Dialog.Header,
  Body: Dialog.Body,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  ActionBar: Dialog.ActionBar,
  CloseIconButton: Dialog.CloseIconButton,
  // AlertDialog-specific dismissal.
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
};

export type {
  AlertDialogRootProps,
  AlertDialogTriggerProps,
  AlertDialogPortalProps,
  AlertDialogOverlayProps,
  AlertDialogContentProps,
  AlertDialogTitleProps,
  AlertDialogDescriptionProps,
  AlertDialogCancelProps,
  AlertDialogActionProps,
  // Re-export shared types.
  DialogHeaderProps as AlertDialogHeaderProps,
  DialogBodyProps as AlertDialogBodyProps,
  DialogActionBarProps as AlertDialogActionBarProps,
  DialogCloseIconButtonProps as AlertDialogCloseIconButtonProps,
};
