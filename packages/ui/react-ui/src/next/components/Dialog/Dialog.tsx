//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Dialog as DialogPrimitive, useDialogContext } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
} from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import * as Button from '../Button/Button.tsx';
import * as Container from '../Container/Container.tsx';
import * as Group from '../Group/Group.tsx';
import { usePopupSize } from '../ScrollArea/PopupScroll.tsx';
import * as ScrollArea from '../ScrollArea/ScrollArea.tsx';

/**
 * Marks the control a dialog focuses when it opens (the current constant's role); zag's own initial-focus lookup reads
 * it, ahead of the first tabbable control.
 */
export const DIALOG_AUTOFOCUS_ATTRIBUTE = 'data-autofocus';

//
// Root
//

type DialogPlacement = 'start' | 'center' | 'end';

type DialogRootProps = DialogPrimitive.RootProps & {
  /**
   * Where the Content sits unless it says otherwise: a host that opens dialogs it does not render (a layout showing
   * a surface's Content) places them here.
   */
  placement?: DialogPlacement;
};

/** Lets the Content keep the dialog open on an outside click, since a surface often renders the Content alone. */
const OutsideDismissContext = createContext<((dismissable: boolean) => void) | undefined>(undefined);

const PlacementContext = createContext<DialogPlacement | undefined>(undefined);

/** Ark dialog; content mounts on first open and unmounts on close unless the caller opts out. */
const DialogRoot = ({
  lazyMount = true,
  unmountOnExit = true,
  closeOnInteractOutside = true,
  placement,
  ...props
}: DialogRootProps) => {
  const [contentDismissable, setContentDismissable] = useState(true);
  return (
    <PlacementContext.Provider value={placement}>
      <OutsideDismissContext.Provider value={setContentDismissable}>
        <DialogPrimitive.Root
          {...props}
          closeOnInteractOutside={closeOnInteractOutside && contentDismissable}
          lazyMount={lazyMount}
          unmountOnExit={unmountOnExit}
        />
      </OutsideDismissContext.Provider>
    </PlacementContext.Provider>
  );
};

DialogRoot.displayName = 'Dialog.Root';

//
// Trigger
//

type DialogTriggerProps = DialogPrimitive.TriggerProps;

/** Use `asChild` to open the dialog from a `Button`. */
const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>((props, forwardedRef) => (
  <DialogPrimitive.Trigger {...props} ref={forwardedRef} />
));

DialogTrigger.displayName = 'Dialog.Trigger';

//
// Content
//

type DialogContentProps = ThemedClassName<DialogPrimitive.ContentProps> & {
  /** Overrides the size inherited from the trigger's nearest sized ancestor (Phase 4 decision 2); `md` without one. */
  size?: Size;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
  /**
   * `end` docks the dialog at the viewport's block end (e.g. a chat panel) and `start` hangs it from the top (e.g. a
   * picker whose list grows downward) instead of centring it; the Root's `placement` otherwise.
   */
  placement?: DialogPlacement;
  /**
   * `false` drops the scrim and lets pointer events through around the dialog, for a non-modal (`modal={false}`)
   * dialog that leaves the page usable.
   */
  scrim?: boolean;
  /** `false` keeps the dialog open on a click outside, e.g. while it holds unsaved input; Escape still closes it. */
  closeOnInteractOutside?: boolean;
};

/** Portalled surface at `level='raised'` over a scrim, centred in the viewport: a column of Header, Body and Footer. */
const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    { classNames, size, container, placement: placementProp, scrim = true, closeOnInteractOutside, children, ...props },
    forwardedRef,
  ) => {
    const dialog = useDialogContext();
    const rootPlacement = useContext(PlacementContext);
    const placement = placementProp ?? rootPlacement ?? 'center';
    const setDismissable = useContext(OutsideDismissContext);
    useEffect(() => {
      if (closeOnInteractOutside !== false || !setDismissable) {
        return;
      }
      setDismissable(false);
      return () => setDismissable(true);
    }, [closeOnInteractOutside, setDismissable]);
    const dialogSize = usePopupSize(size, dialog.open, [dialog.getTriggerProps().id], 'md');
    return (
      <Portal container={container}>
        {scrim && <DialogPrimitive.Backdrop className={recipes.dialogBackdrop()} />}
        <DialogPrimitive.Positioner
          className={recipes.dialogPositioner()}
          data-placement={placement}
          data-scrim={scrim ? undefined : 'none'}
        >
          <DialogPrimitive.Content
            {...props}
            data-surface='raised'
            data-size={dialogSize}
            className={mx(recipes.dialogContent(), classNames)}
            ref={forwardedRef}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Positioner>
      </Portal>
    );
  },
);

DialogContent.displayName = 'Dialog.Content';

//
// Header
//

type DialogHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A block row holding the Title and an optional trailing CloseTrigger. */
const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='dialog'
    data-part='header'
    className={mx(recipes.dialogHeader(), classNames)}
    ref={forwardedRef}
  />
));

DialogHeader.displayName = 'Dialog.Header';

//
// Title
//

type DialogTitleProps = ThemedClassName<DialogPrimitive.TitleProps> & {
  /** Names the dialog for assistive tech without showing a heading. */
  srOnly?: boolean;
};

const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => (
    <DialogPrimitive.Title
      {...props}
      data-sr-only={srOnly ? '' : undefined}
      className={mx(recipes.dialogTitle(), classNames)}
      ref={forwardedRef}
    />
  ),
);

DialogTitle.displayName = 'Dialog.Title';

//
// Description
//

type DialogDescriptionProps = ThemedClassName<DialogPrimitive.DescriptionProps> & {
  /** Describes the dialog for assistive tech without showing the text. */
  srOnly?: boolean;
};

const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => (
    <DialogPrimitive.Description
      {...props}
      data-sr-only={srOnly ? '' : undefined}
      className={mx(recipes.dialogDescription(), classNames)}
      ref={forwardedRef}
    />
  ),
);

DialogDescription.displayName = 'Dialog.Description';

//
// CloseTrigger
//

type DialogCloseTriggerProps = Omit<DialogPrimitive.CloseTriggerProps, 'children'> & {
  /** With `asChild`, the child (e.g. a Cancel `Button`) closes the dialog instead of the default icon button. */
  children?: ReactNode;
  icon?: string;
  label?: string;
};

const DialogCloseTrigger = forwardRef<HTMLButtonElement, DialogCloseTriggerProps>(
  ({ asChild, children, icon = 'ph--x--regular', label = 'Close', ...props }, forwardedRef) =>
    asChild ? (
      <DialogPrimitive.CloseTrigger {...props} asChild ref={forwardedRef}>
        {children}
      </DialogPrimitive.CloseTrigger>
    ) : (
      <DialogPrimitive.CloseTrigger {...props} asChild ref={forwardedRef}>
        <Button.Button icon={icon} label={label} iconOnly />
      </DialogPrimitive.CloseTrigger>
    ),
);

DialogCloseTrigger.displayName = 'Dialog.CloseTrigger';

//
// Body
//

type DialogBodyProps = ThemedClassName<Pick<ScrollArea.RootProps, 'mode' | 'width' | 'native'>> & {
  children?: ReactNode;
};

/**
 * Composed scroll (decision 5): a `gutter='md'` Container as the viewport, so the thumb sits in the end gutter.
 * The element carries ScrollArea's `data-scope`, since parts cannot rescope a composed child (finding 10).
 */
const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(({ classNames, children, ...props }, forwardedRef) => (
  <ScrollArea.Root {...props} classNames={mx(recipes.dialogBody(), classNames)} ref={forwardedRef}>
    <ScrollArea.Viewport asChild>
      <Container.Container gutter='md'>{children}</Container.Container>
    </ScrollArea.Viewport>
  </ScrollArea.Root>
));

DialogBody.displayName = 'Dialog.Body';

//
// Footer
//

type DialogFooterProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/**
 * An end-justified `Group` of actions; the child div wins the merge, so the part keeps the dialog scope. The
 * actions stay regular-sized in a small dialog, since they are the dialog's primary targets.
 */
const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(({ classNames, ...props }, forwardedRef) => (
  <Group.Group asChild justify='end'>
    <div
      data-size='md'
      {...props}
      data-scope='dialog'
      data-part='footer'
      className={mx(recipes.dialogFooter(), classNames)}
      ref={forwardedRef}
    />
  </Group.Group>
));

DialogFooter.displayName = 'Dialog.Footer';
export type {
  DialogBodyProps as BodyProps,
  DialogCloseTriggerProps as CloseTriggerProps,
  DialogContentProps as ContentProps,
  DialogDescriptionProps as DescriptionProps,
  DialogFooterProps as FooterProps,
  DialogHeaderProps as HeaderProps,
  DialogPlacement as Placement,
  DialogRootProps as RootProps,
  DialogTitleProps as TitleProps,
  DialogTriggerProps as TriggerProps,
};

export {
  DialogBody as Body,
  DialogCloseTrigger as CloseTrigger,
  DialogContent as Content,
  DialogDescription as Description,
  DialogFooter as Footer,
  DialogHeader as Header,
  DialogRoot as Root,
  DialogTitle as Title,
  DialogTrigger as Trigger,
};
