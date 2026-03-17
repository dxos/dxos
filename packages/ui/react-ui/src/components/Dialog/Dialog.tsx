//
// Copyright 2023 DXOS.org
//

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentPropsWithRef,
  type ForwardRefExoticComponent,
  type FunctionComponent,
  type PropsWithChildren,
  forwardRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import { type DialogSize, osTranslations } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { Column } from '../../primitives';
import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { ElevationProvider } from '../ElevationProvider';

//
// Root
//

type DialogRootProps = DialogPrimitive.DialogProps;

const DialogRoot: FunctionComponent<DialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <DialogPrimitive.Root {...props} />
  </ElevationProvider>
);

//
// Trigger
//

type DialogTriggerProps = DialogPrimitive.DialogTriggerProps;

const DialogTrigger: FunctionComponent<DialogTriggerProps> = DialogPrimitive.Trigger;

//
// Portal
//

type DialogPortalProps = DialogPrimitive.DialogPortalProps;

const DialogPortal: FunctionComponent<DialogPortalProps> = DialogPrimitive.Portal;

//
// Overlay
//

const DIALOG_OVERLAY_NAME = 'DialogOverlay';

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  DIALOG_OVERLAY_NAME,
  {},
);

type DialogOverlayProps = ThemedClassName<DialogPrimitive.DialogOverlayProps & { blockAlign?: 'center' | 'start' | 'end' }>;

const DialogOverlay: ForwardRefExoticComponent<DialogOverlayProps> = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ classNames, children, blockAlign, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();

    return (
      <DialogPrimitive.Overlay
        {...props}
        data-block-align={blockAlign}
        className={tx('dialog.overlay', {}, classNames)}
        ref={forwardedRef}
      >
        <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
      </DialogPrimitive.Overlay>
    );
  },
);

DialogOverlay.displayName = DIALOG_OVERLAY_NAME;

//
// Content
//

const DIALOG_CONTENT_NAME = 'DialogContent';

type DialogContentProps = ThemedClassName<ComponentPropsWithRef<typeof DialogPrimitive.Content>> & {
  size?: DialogSize;
  inOverlayLayout?: boolean;
};

const DialogContent: ForwardRefExoticComponent<DialogContentProps> = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, children, size = 'md', inOverlayLayout: propsInOverlayLayout, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { inOverlayLayout } = useOverlayLayoutContext(DIALOG_CONTENT_NAME);

    return (
      <DialogPrimitive.Content
        {...props}
        // NOTE: Radix warning unless set to undefined.
        // https://www.radix-ui.com/primitives/docs/components/dialog#description
        aria-describedby={undefined}
        className={tx('dialog.content', { inOverlayLayout: propsInOverlayLayout || inOverlayLayout, size }, classNames)}
        ref={forwardedRef}
      >
        <Column.Root>{children}</Column.Root>
      </DialogPrimitive.Content>
    );
  },
);

DialogContent.displayName = DIALOG_CONTENT_NAME;

//
// Header
//

type DialogHeaderProps = ThemedClassName<PropsWithChildren> & { srOnly?: boolean };

const DialogHeader: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Column.Segment asChild>
        <div role='heading' {...props} className={tx('dialog.header', { srOnly }, [classNames])} ref={forwardedRef} />
      </Column.Segment>
    );
  },
);

//
// CloseIconButton
//

type DialogCloseIconButtonProps = { label?: string };

const DialogCloseIconButton = forwardRef<HTMLButtonElement, DialogCloseIconButtonProps>(
  ({ label, ...props }, forwardedRef) => {
    const { t } = useTranslation(osTranslations);
    return (
      <IconButton
        {...props}
        label={label ?? t('close dialog label')}
        icon='ph--x--regular'
        iconOnly
        size={4}
        density='fine'
        variant='ghost'
        ref={forwardedRef}
      />
    );
  },
);

//
// Body
//

type DialogBodyProps = PropsWithChildren;

const DialogBody: ForwardRefExoticComponent<DialogBodyProps> = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Column.Segment asChild>
        <div role='none' {...props} className={tx('dialog.body')} ref={forwardedRef}>
          {children}
        </div>
      </Column.Segment>
    );
  },
);

//
// Title
//

type DialogTitleProps = ThemedClassName<DialogPrimitive.DialogTitleProps> & { srOnly?: boolean };

const DialogTitle: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogPrimitive.Title {...props} className={tx('dialog.title', { srOnly }, classNames)} ref={forwardedRef} />
    );
  },
);

//
// Description
//

type DialogDescriptionProps = ThemedClassName<DialogPrimitive.DialogDescriptionProps> & { srOnly?: boolean };

const DialogDescription: ForwardRefExoticComponent<DialogTitleProps> = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ classNames, srOnly, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <DialogPrimitive.Description
      {...props}
      className={tx('dialog.description', { srOnly }, classNames)}
      ref={forwardedRef}
    />
  );
});

//
// ActionBar
//

type DialogActionBarProps = ThemedClassName<PropsWithChildren>;

const DialogActionBar: ForwardRefExoticComponent<DialogActionBarProps> = forwardRef<
  HTMLDivElement,
  DialogActionBarProps
>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <Column.Segment asChild>
      <div {...props} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
        {children}
      </div>
    </Column.Segment>
  );
});

//
// Close
//

type DialogCloseProps = DialogPrimitive.DialogCloseProps;

const DialogClose: FunctionComponent<DialogCloseProps> = DialogPrimitive.Close;

//
// Dialog
//

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Title: DialogTitle,
  Description: DialogDescription,
  ActionBar: DialogActionBar,
  Close: DialogClose,
  CloseIconButton: DialogCloseIconButton,
};

export type {
  DialogRootProps,
  DialogTriggerProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogActionBarProps,
  DialogCloseProps,
};
