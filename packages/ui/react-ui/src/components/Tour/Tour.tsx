//
// Copyright 2026 DXOS.org
//

// `Tour` — a guided walkthrough on Ark's tour machine, which owns the steps, waits for each step's
// target to appear, scrolls it into view, positions the card beside it (or centres it, for a
// `dialog` step), cuts the target out of the backdrop, and traps focus between card and target.
// The machine is created with `useTour` and handed to `Root`, so the consumer keeps the api
// (`start`, `next`, `setSteps`) for its own controls.

import { Portal } from '@ark-ui/react/portal';
import {
  Tour as TourPrimitive,
  type TourStepDetails,
  type UseTourProps,
  type UseTourReturn,
  useTour,
  useTourContext,
} from '@ark-ui/react/tour';
import React, { type ComponentPropsWithRef, type ReactNode, forwardRef, useMemo } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type TourStepAction = NonNullable<TourStepDetails['actions']>[number];

type TourStepPlacement = NonNullable<TourStepDetails['placement']>;

//
// Root
//

type TourRootProps = ComponentPropsWithRef<typeof TourPrimitive.Root>;

/** Provides the machine to the parts; renders no element. The card is in the DOM only while the tour runs. */
const TourRoot = ({ lazyMount = true, unmountOnExit = true, ...props }: TourRootProps) => (
  <TourPrimitive.Root lazyMount={lazyMount} unmountOnExit={unmountOnExit} {...props} />
);

TourRoot.displayName = 'Tour.Root';

//
// Portal
//

type TourPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

/**
 * The backdrop, spotlight and positioner are placed absolutely against the document, so they are
 * portalled out of any positioned ancestor.
 */
const TourPortal = ({ children, container }: TourPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return <Portal container={containerRef}>{children}</Portal>;
};

TourPortal.displayName = 'Tour.Portal';

//
// Backdrop
//

type TourBackdropProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Backdrop>>;

/** The scrim, with the target cut out; rendered only for a step that asks for one (`backdrop`). */
const TourBackdrop = forwardRef<HTMLDivElement, TourBackdropProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Backdrop {...props} className={tx('tour.backdrop', {}, classNames)} ref={forwardedRef} />;
});

TourBackdrop.displayName = 'Tour.Backdrop';

//
// Spotlight
//

type TourSpotlightProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Spotlight>>;

/** A frame over the target; the machine sizes and places it. */
const TourSpotlight = forwardRef<HTMLDivElement, TourSpotlightProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Spotlight {...props} className={tx('tour.spotlight', {}, classNames)} ref={forwardedRef} />;
});

TourSpotlight.displayName = 'Tour.Spotlight';

//
// Positioner
//

type TourPositionerProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Positioner>>;

/** Placed beside the target for a `tooltip` step, centred for a `dialog` step. */
const TourPositioner = forwardRef<HTMLDivElement, TourPositionerProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Positioner {...props} className={tx('tour.positioner', {}, classNames)} ref={forwardedRef} />;
});

TourPositioner.displayName = 'Tour.Positioner';

//
// Content
//

type TourContentProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Content>>;

/** The card: an alert dialog labelled by `Title` and described by `Description`. */
const TourContent = forwardRef<HTMLDivElement, TourContentProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Content {...props} className={tx('tour.content', {}, classNames)} ref={forwardedRef} />;
});

TourContent.displayName = 'Tour.Content';

//
// Arrow
//

type TourArrowProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Arrow>>;

/** Rendered only for a step that asks for one (`arrow`); the tip is inside. */
const TourArrow = forwardRef<HTMLDivElement, TourArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <TourPrimitive.Arrow {...props} className={tx('tour.arrow', {}, classNames)} ref={forwardedRef}>
      <TourPrimitive.ArrowTip />
    </TourPrimitive.Arrow>
  );
});

TourArrow.displayName = 'Tour.Arrow';

//
// Title
//

type TourTitleProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Title>>;

const TourTitle = forwardRef<HTMLDivElement, TourTitleProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Title {...props} className={tx('tour.title', {}, classNames)} ref={forwardedRef} />;
});

TourTitle.displayName = 'Tour.Title';

//
// Description
//

type TourDescriptionProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Description>>;

const TourDescription = forwardRef<HTMLDivElement, TourDescriptionProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Description {...props} className={tx('tour.description', {}, classNames)} ref={forwardedRef} />;
});

TourDescription.displayName = 'Tour.Description';

//
// ProgressText
//

type TourProgressTextProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.ProgressText>>;

/** "1 of 4" by default, from the machine's translations; children replace it. */
const TourProgressText = forwardRef<HTMLDivElement, TourProgressTextProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <TourPrimitive.ProgressText {...props} className={tx('tour.progressText', {}, classNames)} ref={forwardedRef} />
  );
});

TourProgressText.displayName = 'Tour.ProgressText';

//
// Close
//

type TourCloseProps = ComponentPropsWithRef<typeof TourPrimitive.CloseTrigger>;

const TourClose = TourPrimitive.CloseTrigger;

//
// Actions
//

type TourActionsProps = ComponentPropsWithRef<typeof TourPrimitive.Actions>;

/** Render prop over the current step's `actions`. */
const TourActions = TourPrimitive.Actions;

//
// ActionTrigger
//

type TourActionTriggerProps = ComponentPropsWithRef<typeof TourPrimitive.ActionTrigger>;

/** A button wired to one step action (`next`, `prev`, `dismiss`, `skip` or a function). */
const TourActionTrigger = TourPrimitive.ActionTrigger;

//
// Control
//

type TourControlProps = ThemedClassName<ComponentPropsWithRef<typeof TourPrimitive.Control>>;

/** The row the actions sit in. */
const TourControl = forwardRef<HTMLDivElement, TourControlProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <TourPrimitive.Control {...props} className={tx('tour.control', {}, classNames)} ref={forwardedRef} />;
});

TourControl.displayName = 'Tour.Control';

//
// Tour
//

export const Tour = {
  Root: TourRoot,
  Portal: TourPortal,
  Backdrop: TourBackdrop,
  Spotlight: TourSpotlight,
  Positioner: TourPositioner,
  Content: TourContent,
  Arrow: TourArrow,
  Title: TourTitle,
  Description: TourDescription,
  ProgressText: TourProgressText,
  Close: TourClose,
  Actions: TourActions,
  ActionTrigger: TourActionTrigger,
  Control: TourControl,
};

export { useTour, useTourContext };

export type {
  TourActionsProps,
  TourActionTriggerProps,
  TourArrowProps,
  TourBackdropProps,
  TourCloseProps,
  TourContentProps,
  TourControlProps,
  TourDescriptionProps,
  TourPortalProps,
  TourPositionerProps,
  TourProgressTextProps,
  TourRootProps,
  TourSpotlightProps,
  TourStepAction,
  TourStepDetails,
  TourStepPlacement,
  TourTitleProps,
  UseTourProps,
  UseTourReturn,
};
