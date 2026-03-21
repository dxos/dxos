//
// Copyright 2023 DXOS.org
//

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ForwardRefExoticComponent,
  type FunctionComponent,
  type PropsWithChildren,
  forwardRef,
} from 'react';

import { type DialogSize } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { Column, ColumnViewportProps } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

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

const AlertDialogDescription: ForwardRefExoticComponent<AlertDialogTitleProps> = forwardRef<
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

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

//
// Context
//

const ALERT_DIALOG_OVERLAY_NAME = 'AlertDialogOverlay';
const ALERT_DIALOG_CONTENT_NAME = 'AlertDialogContent';
const ALERT_DIALOG_BODY_NAME = 'AlertDialogBody';
const ALERT_DIALOG_ACTIONBAR_NAME = 'AlertDialogActionBar';

const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  ALERT_DIALOG_OVERLAY_NAME,
  {
    inOverlayLayout: false,
  },
);

//
// Overlay
//

type AlertDialogOverlayProps = ThemedClassName<AlertDialogPrimitive.AlertDialogOverlayProps> & {
  blockAlign?: 'center' | 'start' | 'end';
};

const AlertDialogOverlay: ForwardRefExoticComponent<AlertDialogOverlayProps> = forwardRef<
  HTMLDivElement,
  AlertDialogOverlayProps
>(({ classNames, children, blockAlign, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <AlertDialogPrimitive.Overlay
      {...props}
      data-block-align={blockAlign}
      className={tx(
        'dialog.overlay',
        {},
        classNames,
        // TODO(burdon): Move to dialog.ts.
        'data-[h-align=start]:justify-center',
        'data-[h-align=start]:items-start',
        'data-[h-align=center]:place-content-center',
      )}
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
      ref={forwardedRef}
    >
      <Column.Root>{children}</Column.Root>
    </AlertDialogPrimitive.Content>
  );
});

AlertDialogContent.displayName = ALERT_DIALOG_CONTENT_NAME;

//
// Body
//

type AlertDialogBodyProps = PropsWithChildren<Pick<ColumnViewportProps, 'thin'>>;

const AlertDialogBody: ForwardRefExoticComponent<AlertDialogBodyProps> = forwardRef<
  HTMLDivElement,
  AlertDialogBodyProps
>(({ children, thin = true }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <Column.Viewport classNames={tx('dialog.body')} thin={thin} ref={forwardedRef}>
      {children}
    </Column.Viewport>
  );
});

AlertDialogBody.displayName = ALERT_DIALOG_BODY_NAME;

//
// ActionBar
//

type AlertDialogActionBarProps = ThemedClassName<PropsWithChildren>;

const AlertDialogActionBar: ForwardRefExoticComponent<AlertDialogActionBarProps> = forwardRef<
  HTMLDivElement,
  AlertDialogActionBarProps
>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <Column.Row asChild center>
      <div {...props} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
        {children}
      </div>
    </Column.Row>
  );
});

AlertDialogActionBar.displayName = ALERT_DIALOG_ACTIONBAR_NAME;

//
// AlertDialog
//

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Body: AlertDialogBody,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  ActionBar: AlertDialogActionBar,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
};

export type {
  AlertDialogRootProps,
  AlertDialogTriggerProps,
  AlertDialogPortalProps,
  AlertDialogOverlayProps,
  AlertDialogContentProps,
  AlertDialogBodyProps,
  AlertDialogTitleProps,
  AlertDialogDescriptionProps,
  AlertDialogActionBarProps,
  AlertDialogCancelProps,
  AlertDialogActionProps,
};
