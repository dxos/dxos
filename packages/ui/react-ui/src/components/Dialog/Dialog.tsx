//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type ComponentPropsWithRef,
  type ForwardRefExoticComponent,
  type FunctionComponent,
  forwardRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import { osTranslations } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { ElevationProvider } from '../../primitives';
import { type DialogSize } from '../../theme';
import { type ThemedClassName, composableProps, slottable } from '../../util';
import { IconButton } from '../Button';
import { Column } from '../Column';

//
// Root
//

type DialogRootProps = DialogPrimitive.DialogProps;

const DialogRoot: FunctionComponent<DialogRootProps> = (props) => (
  <ElevationProvider elevation='dialog'>
    <DialogPrimitive.Root
      // NOTE: Radix warning unless set to undefined.
      // https://www.radix-ui.com/primitives/docs/components/dialog#description
      aria-describedby={undefined}
      {...props}
    />
  </ElevationProvider>
);

DialogRoot.displayName = 'Dialog.Root';

//
// Trigger
//

type DialogTriggerProps = DialogPrimitive.DialogTriggerProps;

const DialogTrigger = DialogPrimitive.Trigger;

//
// Portal
//

type DialogPortalProps = DialogPrimitive.DialogPortalProps;

const DialogPortal = DialogPrimitive.Portal;

//
// Overlay
//

const DIALOG_OVERLAY_NAME = 'Dialog.Overlay';

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  DIALOG_OVERLAY_NAME,
  {},
);

type DialogOverlayProps = ThemedClassName<
  DialogPrimitive.DialogOverlayProps & { blockAlign?: 'center' | 'start' | 'end' }
>;

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

const DIALOG_CONTENT_NAME = 'Dialog.Content';

type DialogContentProps = ThemedClassName<ComponentPropsWithRef<typeof DialogPrimitive.Content>> & {
  size?: DialogSize;
  inOverlayLayout?: boolean;
};

const DialogContent: ForwardRefExoticComponent<DialogContentProps> = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ classNames, children, size = 'sm', inOverlayLayout: propsInOverlayLayout, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { inOverlayLayout } = useOverlayLayoutContext(DIALOG_CONTENT_NAME);

    return (
      <DialogPrimitive.Content
        {...props}
        // NOTE: Radix warning unless set to undefined.
        // https://www.radix-ui.com/primitives/docs/components/dialog#description
        aria-describedby={undefined}
        className={tx(
          'dialog.content',
          {
            size,
            inOverlayLayout: propsInOverlayLayout || inOverlayLayout,
          },
          classNames,
        )}
        ref={forwardedRef}
      >
        <Column.Root classNames='dx-expander' gutter='lg'>
          {children}
        </Column.Root>
      </DialogPrimitive.Content>
    );
  },
);

DialogContent.displayName = DIALOG_CONTENT_NAME;

//
// Header
//

type DialogHeaderProps = SlottableProps;

const DialogHeader = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('dialog.header', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

DialogHeader.displayName = 'Dialog.Header';

//
// ActionIconButton
//

type DialogActionIconButtonAction = 'close' | 'delete';

type DialogActionIconButtonProps = { action: DialogActionIconButtonAction; label?: string };

const DIALOG_ACTION_ICONS: Record<DialogActionIconButtonAction, string> = {
  close: 'ph--x--regular',
  delete: 'ph--trash--regular',
};

const DIALOG_ACTION_LABEL_KEYS: Record<DialogActionIconButtonAction, string> = {
  // Preserves the legacy `close-dialog.label` translation key for backward compat.
  close: 'close-dialog.label',
  delete: 'toolbar-delete.label',
};

const DialogActionIconButton = forwardRef<HTMLButtonElement, DialogActionIconButtonProps>(
  ({ action, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(osTranslations);
    return (
      <IconButton
        {...props}
        label={label ?? t(DIALOG_ACTION_LABEL_KEYS[action])}
        icon={DIALOG_ACTION_ICONS[action]}
        iconOnly
        size={4}
        variant='ghost'
        ref={forwardedRef}
      />
    );
  },
);

DialogActionIconButton.displayName = 'Dialog.ActionIconButton';

//
// Body
//

type DialogBodyProps = SlottableProps;

const DialogBody = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('dialog.body', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

DialogBody.displayName = 'Dialog.Body';

//
// Title
//

type DialogTitleProps = ThemedClassName<DialogPrimitive.DialogTitleProps> & { srOnly?: boolean };

const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogPrimitive.Title {...props} className={tx('dialog.title', { srOnly }, classNames)} ref={forwardedRef} />
    );
  },
);

DialogTitle.displayName = 'Dialog.Title';

//
// Description
//

type DialogDescriptionProps = ThemedClassName<DialogPrimitive.DialogDescriptionProps> & { srOnly?: boolean };

const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogPrimitive.Description
        {...props}
        className={tx('dialog.description', { srOnly }, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DialogDescription.displayName = 'Dialog.Description';

//
// ActionBar
//

type DialogActionBarProps = SlottableProps;

const DialogActionBar = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className: classNames, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

DialogActionBar.displayName = 'Dialog.ActionBar';

//
// Close
//

type DialogCloseProps = DialogPrimitive.DialogCloseProps;

const DialogClose = DialogPrimitive.Close;

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
  ActionIconButton: DialogActionIconButton,
};

export type {
  DialogActionBarProps,
  DialogActionIconButtonAction,
  DialogActionIconButtonProps,
  DialogBodyProps,
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogHeaderProps,
  DialogOverlayProps,
  DialogPortalProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
};
