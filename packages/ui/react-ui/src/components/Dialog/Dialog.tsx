//
// Copyright 2023 DXOS.org
//

// `Dialog` and `AlertDialog` are one implementation over Ark's dialog machine, which owns focus
// trapping, scroll locking, dismissal and the `aria-labelledby`/`aria-describedby` wiring (present
// only when a `Title`/`Description` is rendered). DXOS owns the layout parts — `Overlay` as the
// centring host the content nests in, `Header`/`Body`/`ActionBar` on the Column grid — and the
// `data-dx-autofocus` contract.

import { Dialog as DialogPrimitive, useDialog } from '@ark-ui/react/dialog';
import { ark } from '@ark-ui/react/factory';
import { Portal } from '@ark-ui/react/portal';
import { ariaHidden } from '@zag-js/aria-hidden';
import { trackDismissableElement } from '@zag-js/dismissable';
import { trapFocus } from '@zag-js/focus-trap';
import React, {
  type ComponentPropsWithRef,
  type FC,
  type ReactNode,
  type RefObject,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useComposedRefs, useControllableState } from '@dxos/react-hooks';
import { elevationAttrs, elevationSurface, osTranslations } from '@dxos/ui-theme';
import { type ElevationLevel, type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks/index.ts';
import { ElevationProvider } from '../../providers/index.ts';
import { type DialogSize } from '../../theme/index.ts';
import { type ThemedClassName, composableProps, slottable } from '../../util/index.ts';
import { IconButton } from '../Button/index.ts';
import { Column } from '../Column/index.ts';
import {
  type DialogContentHandlers,
  DialogProvider,
  OverlayLayoutProvider,
  useDialogContext,
  useOverlayLayoutContext,
} from './DialogContext.ts';

/**
 * Marks the control a dialog wants focused when it opens, overriding the default of the action
 * bar's first control.
 */
export const DIALOG_AUTOFOCUS_ATTRIBUTE = 'data-dx-autofocus';

/** The class `Dialog.ActionBar` renders with, which is how the root finds it at open. */
const ACTION_BAR_CLASS = 'dx-dialog__actionbar';

const TABBABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * What takes focus when a dialog opens: the marked control, else the action bar's first control
 * — the header's close button comes first in the DOM, and a reflexive Enter should reach the
 * dialog's own action, not dismiss it — else the content itself when auto focus was vetoed, else
 * the machine's first-tabbable pass.
 */
const getInitialFocusEl = (content: HTMLElement | null, vetoed: boolean): HTMLElement | null => {
  if (!content) {
    return null;
  }
  const marked = content.querySelector<HTMLElement>(`[${DIALOG_AUTOFOCUS_ATTRIBUTE}]`);
  if (marked) {
    return marked;
  }
  if (vetoed) {
    return content;
  }
  return content.querySelector<HTMLElement>(`.${ACTION_BAR_CLASS} :is(${TABBABLE})`);
};

/** The answer a `preventDefault()`-style handler gives, asked ahead of the moment it would fire. */
const prevents = (handler: ((event: Event) => void) | undefined) => {
  if (!handler) {
    return false;
  }
  const event = new Event('autofocus', { cancelable: true });
  handler(event);
  return event.defaultPrevented;
};

//
// Root
//

type DialogRootProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A modal dialog traps focus, locks scroll and hides the page from assistive technology. */
  modal?: boolean;
};

type DialogRootImplProps = DialogRootProps & {
  role: 'dialog' | 'alertdialog';
};

const DialogRootImpl = ({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  modal = true,
  role,
}: DialogRootImplProps) => {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const handlersRef = useRef<DialogContentHandlers>({});
  const settledRef = useRef(false);

  // The content vetoes its own auto focus with `preventDefault()`, asked at render so the machine
  // reads the answer when it opens.
  const openAutoFocusVetoed = prevents(handlersRef.current.onOpenAutoFocus);
  const closeAutoFocusVetoed = prevents(handlersRef.current.onCloseAutoFocus);

  const dialog = useDialog({
    open,
    onOpenChange: ({ open: next }) => setOpen(next),
    role,
    modal,
    trapFocus: modal,
    preventScroll: modal,
    restoreFocus: !closeAutoFocusVetoed,
    // An alert demands an answer; a click beside it is not one.
    closeOnInteractOutside: role === 'dialog',
    initialFocusEl: () => getInitialFocusEl(contentRef.current, openAutoFocusVetoed),
    onInteractOutside: (event) => handlersRef.current.onInteractOutside?.(event),
    onPointerDownOutside: (event) => handlersRef.current.onPointerDownOutside?.(event),
    onFocusOutside: (event) => handlersRef.current.onFocusOutside?.(event),
    onEscapeKeyDown: (event) => handlersRef.current.onEscapeKeyDown?.(event),
  });

  // The machine looks for the content once, a microtask and a frame after opening, to attach
  // dismissal, the focus trap and the initial focus, and never looks again. Content behind a lazy
  // boundary (every plugin dialog surface) mounts later, and a surface may remount it while open;
  // this marks when that lookup is over, so content mounting after it attaches them itself.
  useEffect(() => {
    settledRef.current = false;
    if (!open) {
      return;
    }
    let frame: number | undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        frame = requestAnimationFrame(() => {
          settledRef.current = true;
        });
      }
    });
    return () => {
      cancelled = true;
      frame !== undefined && cancelAnimationFrame(frame);
    };
  }, [open]);

  const context = useMemo(
    () => ({ open, modal, role, onOpenChange: setOpen, contentRef, handlersRef, settledRef }),
    [open, modal, role, setOpen],
  );

  return (
    <ElevationProvider elevation='dialog'>
      {/* Closed content is not in the DOM at all. */}
      <DialogPrimitive.RootProvider value={dialog} lazyMount unmountOnExit>
        <DialogProvider {...context}>{children}</DialogProvider>
      </DialogPrimitive.RootProvider>
    </ElevationProvider>
  );
};

const DialogRoot: FC<DialogRootProps> = (props) => <DialogRootImpl {...props} role='dialog' />;

DialogRoot.displayName = 'Dialog.Root';

//
// Trigger
//

type DialogTriggerProps = ComponentPropsWithRef<typeof DialogPrimitive.Trigger>;

const DialogTrigger = DialogPrimitive.Trigger;

//
// Portal
//

type DialogPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

const DialogPortal = ({ children, container }: DialogPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return <Portal container={containerRef}>{children}</Portal>;
};

DialogPortal.displayName = 'Dialog.Portal';

//
// Overlay
//

const DIALOG_OVERLAY_NAME = 'Dialog.Overlay';

type DialogOverlayProps = ThemedClassName<ComponentPropsWithRef<typeof DialogPrimitive.Backdrop>> & {
  blockAlign?: 'center' | 'start' | 'end';
};

/**
 * The scrim, which is also where the content sits: consumers nest `Content` inside `Overlay`, so
 * the backdrop doubles as the centring host rather than Ark's separate `Positioner`.
 */
const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ classNames, children, blockAlign, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DialogPrimitive.Backdrop
        {...props}
        data-block-align={blockAlign}
        className={tx('dialog.overlay', {}, classNames)}
        ref={forwardedRef}
      >
        <OverlayLayoutProvider inOverlayLayout>{children}</OverlayLayoutProvider>
      </DialogPrimitive.Backdrop>
    );
  },
);

DialogOverlay.displayName = DIALOG_OVERLAY_NAME;

//
// Content
//

const DIALOG_CONTENT_NAME = 'Dialog.Content';

type DialogContentProps = ThemedClassName<ComponentPropsWithRef<typeof DialogPrimitive.Content>> &
  DialogContentHandlers & {
    size?: DialogSize;
    inOverlayLayout?: boolean;
    /** Material-style elevation, 0–5, onto the surface ladder; a dialog is `overlay` (4) by default. */
    elevation?: ElevationLevel;
  };

/**
 * Attaches what the machine would have — Escape and outside-interaction dismissal, the focus trap,
 * the initial focus, the hidden background and the title/description wiring — to content that
 * mounted after the machine looked for it (see `settledRef`). The same zag primitives the machine
 * uses, so the content joins the shared layer stack: Escape in a nested popover still closes only
 * the popover.
 */
const useLateContent = (contentRef: RefObject<HTMLDivElement | null>) => {
  const { modal, role, onOpenChange, handlersRef, settledRef } = useDialogContext(DIALOG_CONTENT_NAME);
  const [late, setLate] = useState(false);
  useLayoutEffect(() => {
    if (settledRef.current) {
      setLate(true);
    }
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!late || !content) {
      return;
    }
    const initialFocus = () =>
      getInitialFocusEl(content, prevents(handlersRef.current.onOpenAutoFocus)) ??
      content.querySelector<HTMLElement>(TABBABLE) ??
      content;
    // The machine checks once, in its first frame, which parts rendered; a late title and description
    // are wired here instead.
    const label = (part: 'title' | 'description', attribute: 'aria-labelledby' | 'aria-describedby') => {
      const id = content.querySelector(`[data-scope="dialog"][data-part="${part}"]`)?.id;
      if (id && !content.hasAttribute(attribute) && !content.hasAttribute('aria-label')) {
        content.setAttribute(attribute, id);
      }
    };
    label('title', 'aria-labelledby');
    label('description', 'aria-describedby');
    const untrack = trackDismissableElement(content, {
      type: 'dialog',
      pointerBlocking: modal,
      // As the machine's own layer: a press on a trigger toggles the dialog rather than dismissing it.
      exclude: () => Array.from(document.querySelectorAll<HTMLElement>(`[aria-controls="${CSS.escape(content.id)}"]`)),
      onEscapeKeyDown: (event) => handlersRef.current.onEscapeKeyDown?.(event),
      onPointerDownOutside: (event) => handlersRef.current.onPointerDownOutside?.(event),
      onFocusOutside: (event) => {
        handlersRef.current.onFocusOutside?.(event);
        // The trap pulls focus back, so a modal dialog is not dismissed by focus moving out — a menu
        // closing behind it restores focus to its trigger just after the dialog opens.
        if (modal) {
          event.preventDefault();
        }
      },
      onInteractOutside: (event) => {
        handlersRef.current.onInteractOutside?.(event);
        if (role !== 'dialog') {
          event.preventDefault();
        }
      },
      onDismiss: () => onOpenChange(false),
    });
    if (!modal) {
      initialFocus().focus({ preventScroll: true });
      return untrack;
    }
    const unhide = ariaHidden([content]);
    const untrap = trapFocus(content, {
      initialFocus,
      preventScroll: true,
      returnFocusOnDeactivate: !prevents(handlersRef.current.onCloseAutoFocus),
      getShadowRoot: true,
    });
    return () => {
      untrap();
      unhide();
      untrack();
    };
  }, [late, modal, role, onOpenChange, contentRef, handlersRef]);
};

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      classNames,
      children,
      size = 'sm',
      inOverlayLayout: propsInOverlayLayout,
      elevation,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const { inOverlayLayout } = useOverlayLayoutContext(DIALOG_CONTENT_NAME);
    const { contentRef, handlersRef } = useDialogContext(DIALOG_CONTENT_NAME);
    useLateContent(contentRef);
    // The handlers are read at event time; nothing re-renders on their account.
    handlersRef.current = {
      onOpenAutoFocus,
      onCloseAutoFocus,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
    };

    return (
      <DialogPrimitive.Content
        {...props}
        {...elevationAttrs(elevation)}
        className={tx(
          'dialog.content',
          { size, inOverlayLayout: propsInOverlayLayout || inOverlayLayout, surface: elevationSurface(elevation) },
          classNames,
        )}
        ref={useComposedRefs(forwardedRef, contentRef)}
      >
        <Column.Root classNames='dx-expand' gutter='md'>
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
  const { tx } = useThemeContext();
  return (
    <ark.div asChild={asChild} {...rest} className={tx('dialog.header', {}, className)} ref={forwardedRef}>
      {children}
    </ark.div>
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
  const { tx } = useThemeContext();
  return (
    <ark.div asChild={asChild} {...rest} className={tx('dialog.body', {}, className)} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

DialogBody.displayName = 'Dialog.Body';

//
// Title
//

type DialogTitleProps = ThemedClassName<ComponentPropsWithRef<typeof DialogPrimitive.Title>> & { srOnly?: boolean };

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

type DialogDescriptionProps = ThemedClassName<ComponentPropsWithRef<typeof DialogPrimitive.Description>> & {
  srOnly?: boolean;
};

const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ classNames, srOnly, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      // A paragraph; Ark's default is a div.
      <DialogPrimitive.Description asChild {...props}>
        <p className={tx('dialog.description', { srOnly }, classNames)} ref={forwardedRef}>
          {children}
        </p>
      </DialogPrimitive.Description>
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
  const { tx } = useThemeContext();
  return (
    <ark.div asChild={asChild} {...rest} className={tx('dialog.actionbar', {}, classNames)} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

DialogActionBar.displayName = 'Dialog.ActionBar';

//
// Close
//

type DialogCloseProps = ComponentPropsWithRef<typeof DialogPrimitive.CloseTrigger>;

const DialogClose = DialogPrimitive.CloseTrigger;

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

export { DialogRootImpl };

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
