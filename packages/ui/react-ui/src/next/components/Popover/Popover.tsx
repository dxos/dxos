//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import { Popover as PopoverPrimitive, usePopoverContext } from '@ark-ui/react/popover';
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
import { Button } from '../Button/Button.tsx';
import { Container, DefaultGutterProvider } from '../Container/Container.tsx';
import { popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';
import * as ScrollArea from '../ScrollArea/ScrollArea.tsx';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

type LabelPart = 'title' | 'description';

/** Lets Title and Description announce themselves to the Content they are rendered in (DESIGN.md follow-up 45). */
const LabelsContext = createContext<((part: LabelPart, present: boolean) => void) | undefined>(undefined);

const useLabelPart = (part: LabelPart) => {
  const register = useContext(LabelsContext);
  useEffect(() => {
    register?.(part, true);
    return () => register?.(part, false);
  }, [register, part]);
};

//
// Root
//

type PopoverRootProps = PopoverPrimitive.RootProps;

/**
 * Ark popover; content mounts on open and unmounts on close unless the caller opts out. `modal` traps focus and hides
 * the rest of the page from assistive tech; a virtual trigger is `positioning.getAnchorRect` (or an `Anchor`).
 */
const PopoverRoot = ({ lazyMount = true, unmountOnExit = true, positioning, ...props }: PopoverRootProps) => (
  <PopoverPrimitive.Root
    {...props}
    lazyMount={lazyMount}
    unmountOnExit={unmountOnExit}
    // Ark's 8px default reads as detached from the trigger.
    positioning={popupPositioning(POPUP_GUTTER, positioning)}
  />
);

PopoverRoot.displayName = 'Popover.Root';

//
// Trigger
//

type PopoverTriggerProps = PopoverPrimitive.TriggerProps;

/** Use `asChild` to open the popover from a `Button`. */
const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>((props, forwardedRef) => (
  <PopoverPrimitive.Trigger {...props} ref={forwardedRef} />
));

PopoverTrigger.displayName = 'Popover.Trigger';

//
// Anchor
//

type PopoverAnchorProps = PopoverPrimitive.AnchorProps;

/** Positions the content against this element instead of the trigger. */
const PopoverAnchor = forwardRef<HTMLDivElement, PopoverAnchorProps>((props, forwardedRef) => (
  <PopoverPrimitive.Anchor {...props} ref={forwardedRef} />
));

PopoverAnchor.displayName = 'Popover.Anchor';

//
// Content
//

type PopoverContentProps = ThemedClassName<PopoverPrimitive.ContentProps> & {
  /** Overrides the size inherited from the anchor's or trigger's nearest sized ancestor (Phase 4 decision 2); `md` without one. */
  size?: Size;
  /** Point at the trigger with an arrow in the popup's surface colour. */
  arrow?: boolean;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
};

/** Portalled panel at `level='popup'`, padded by the size's gap, with an arrow unless `arrow={false}`. */
const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ classNames, size, arrow = true, container, children, ...props }, forwardedRef) => {
    const popover = usePopoverContext();
    const popupSize = usePopupSize(
      size,
      popover.open,
      [popover.getAnchorProps().id, popover.getTriggerProps().id],
      'md',
    );
    // zag checks for a title once, when the machine starts, which is before lazily mounted content exists.
    const [labels, setLabels] = useState<Record<LabelPart, boolean>>({ title: false, description: false });
    const [register] = useState(
      () => (part: LabelPart, present: boolean) => setLabels((labels) => ({ ...labels, [part]: present })),
    );
    return (
      <Portal container={container}>
        <PopoverPrimitive.Positioner>
          <PopoverPrimitive.Content
            {...props}
            {...(labels.title && { 'aria-labelledby': popover.getTitleProps().id })}
            {...(labels.description && { 'aria-describedby': popover.getDescriptionProps().id })}
            data-surface='popup'
            data-size={popupSize}
            className={mx(recipes.popup(), recipes.popoverContent(), classNames)}
            ref={forwardedRef}
          >
            <LabelsContext.Provider value={register}>{children}</LabelsContext.Provider>
            {arrow && (
              <PopoverPrimitive.Arrow className={recipes.arrow()}>
                <PopoverPrimitive.ArrowTip className={recipes.arrowTip()} />
              </PopoverPrimitive.Arrow>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Positioner>
      </Portal>
    );
  },
);

PopoverContent.displayName = 'Popover.Content';

//
// Header
//

type PopoverHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A block row holding the Title and an optional trailing CloseTrigger. */
const PopoverHeader = forwardRef<HTMLDivElement, PopoverHeaderProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='popover'
    data-part='header'
    className={mx(recipes.popoverHeader(), classNames)}
    ref={forwardedRef}
  />
));

PopoverHeader.displayName = 'Popover.Header';

//
// Title
//

type PopoverTitleProps = ThemedClassName<PopoverPrimitive.TitleProps>;

const PopoverTitle = forwardRef<HTMLHeadingElement, PopoverTitleProps>(({ classNames, ...props }, forwardedRef) => {
  useLabelPart('title');
  return <PopoverPrimitive.Title {...props} className={mx(recipes.popoverTitle(), classNames)} ref={forwardedRef} />;
});

PopoverTitle.displayName = 'Popover.Title';

//
// Description
//

type PopoverDescriptionProps = ThemedClassName<PopoverPrimitive.DescriptionProps>;

const PopoverDescription = forwardRef<HTMLParagraphElement, PopoverDescriptionProps>(
  ({ classNames, ...props }, forwardedRef) => {
    useLabelPart('description');
    return (
      <PopoverPrimitive.Description
        {...props}
        className={mx(recipes.popoverDescription(), classNames)}
        ref={forwardedRef}
      />
    );
  },
);

PopoverDescription.displayName = 'Popover.Description';

//
// Body
//

type PopoverBodyProps = ThemedClassName<Pick<ScrollArea.RootProps, 'mode' | 'width' | 'native'>> & {
  children?: ReactNode;
};

/**
 * Scrolling content, composed like `Dialog.Body` (decision 5): the popover is capped at the space the positioner
 * reports, and the body takes the rest after Header and Footer; its inset gutter holds the thumb.
 */
const PopoverBody = forwardRef<HTMLDivElement, PopoverBodyProps>(({ classNames, children, ...props }, forwardedRef) => (
  <ScrollArea.Root {...props} classNames={mx(recipes.popoverBody(), classNames)} ref={forwardedRef}>
    <ScrollArea.Viewport asChild>
      <Container gutter='inset'>
        {/* Its direct content (a form's Viewport) joins these rails rather than nesting a second inset. */}
        <DefaultGutterProvider gutter='inherit'>{children}</DefaultGutterProvider>
      </Container>
    </ScrollArea.Viewport>
  </ScrollArea.Root>
));

PopoverBody.displayName = 'Popover.Body';

//
// CloseTrigger
//

type PopoverCloseTriggerProps = Omit<PopoverPrimitive.CloseTriggerProps, 'children'> & {
  /** With `asChild`, the child (e.g. a `Button`) closes the popover instead of the default icon button. */
  children?: ReactNode;
  icon?: string;
  label?: string;
};

const PopoverCloseTrigger = forwardRef<HTMLButtonElement, PopoverCloseTriggerProps>(
  ({ asChild, children, icon = 'ph--x--regular', label = 'Close', onClick, ...props }, forwardedRef) => {
    const popover = usePopoverContext();
    // zag's close trigger sets `aria-label="close"`, which would rename a child with its own text (e.g. "Done").
    return asChild ? (
      <ark.button
        {...props}
        asChild
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            popover.setOpen(false);
          }
        }}
        ref={forwardedRef}
      >
        {children}
      </ark.button>
    ) : (
      <PopoverPrimitive.CloseTrigger {...props} onClick={onClick} asChild ref={forwardedRef}>
        <Button icon={icon} label={label} iconOnly />
      </PopoverPrimitive.CloseTrigger>
    );
  },
);

PopoverCloseTrigger.displayName = 'Popover.CloseTrigger';
export type {
  PopoverAnchorProps as AnchorProps,
  PopoverBodyProps as BodyProps,
  PopoverCloseTriggerProps as CloseTriggerProps,
  PopoverContentProps as ContentProps,
  PopoverDescriptionProps as DescriptionProps,
  PopoverHeaderProps as HeaderProps,
  PopoverRootProps as RootProps,
  PopoverTitleProps as TitleProps,
  PopoverTriggerProps as TriggerProps,
};

export {
  PopoverAnchor as Anchor,
  PopoverBody as Body,
  PopoverCloseTrigger as CloseTrigger,
  PopoverContent as Content,
  PopoverDescription as Description,
  PopoverHeader as Header,
  PopoverRoot as Root,
  PopoverTitle as Title,
  PopoverTrigger as Trigger,
};
