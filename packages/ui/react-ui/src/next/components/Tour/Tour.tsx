//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Portal } from '@ark-ui/react/portal';
import {
  Tour as TourPrimitive,
  type TourStepDetails,
  type UseTourProps,
  type UseTourReturn,
  useTourContext,
  useTour as useTourPrimitive,
} from '@ark-ui/react/tour';
import React, { type ComponentPropsWithoutRef, type ReactNode, type RefObject, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import * as Button from '../Button/Button.tsx';

/**
 * Creates the machine, which owns the steps, waits for each target, scrolls it into view, places the card beside it
 * (or centres it, for a `dialog` step), cuts it out of the backdrop and traps focus. The spotlight sits on the target's
 * own rect (zag pads it by 10px), so its inset ring paints over the target's border.
 */
const useTour = (props?: UseTourProps): UseTourReturn =>
  useTourPrimitive({ spotlightOffset: { x: 0, y: 0 }, ...props });

type TourStepPlacement = NonNullable<TourStepDetails['placement']>;

type TourStepAction = NonNullable<TourStepDetails['actions']>[number];

//
// Root
//

type TourRootProps = TourPrimitive.RootProps;

/** Provides the machine from `useTour` to the parts; renders no element. The card mounts only while the tour runs. */
const TourRoot = ({ lazyMount = true, unmountOnExit = true, ...props }: TourRootProps) => (
  <TourPrimitive.Root {...props} lazyMount={lazyMount} unmountOnExit={unmountOnExit} />
);

TourRoot.displayName = 'Tour.Root';

//
// Content
//

type TourContentProps = ThemedClassName<TourPrimitive.ContentProps> & {
  /** The card's size; it has no sized trigger to inherit one from. */
  size?: Size;
  /** Portals into this element instead of the body. */
  container?: RefObject<HTMLElement | null>;
};

/**
 * The card, an `alertdialog` at `level='popup'` named by its Title and described by its Description. It brings the
 * backdrop (shown for a step with `backdrop`), the spotlight over the target and the arrow (for a step with `arrow`),
 * all portalled, since the machine places them against the document.
 */
const TourContent = forwardRef<HTMLDivElement, TourContentProps>(
  ({ classNames, size = 'md', container, children, ...props }, forwardedRef) => (
    <Portal container={container}>
      <TourPrimitive.Backdrop className={recipes.tourBackdrop()} />
      <TourPrimitive.Spotlight className={recipes.tourSpotlight()} />
      <TourPrimitive.Positioner className={recipes.tourPositioner()}>
        <TourPrimitive.Content
          {...props}
          data-surface='popup'
          data-size={size}
          className={mx(recipes.popup(), recipes.tourContent(), classNames)}
          ref={forwardedRef}
        >
          {children}
          <TourPrimitive.Arrow className={recipes.arrow()}>
            <TourPrimitive.ArrowTip className={recipes.arrowTip()} />
          </TourPrimitive.Arrow>
        </TourPrimitive.Content>
      </TourPrimitive.Positioner>
    </Portal>
  ),
);

TourContent.displayName = 'Tour.Content';

//
// Header
//

type TourHeaderProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A block row holding the Title and an optional trailing CloseTrigger. */
const TourHeader = forwardRef<HTMLDivElement, TourHeaderProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='tour'
    data-part='header'
    className={mx(recipes.tourHeader(), classNames)}
    ref={forwardedRef}
  />
));

TourHeader.displayName = 'Tour.Header';

//
// Title
//

type TourTitleProps = ThemedClassName<TourPrimitive.TitleProps>;

/** The step's `title` by default. */
const TourTitle = forwardRef<HTMLHeadingElement, TourTitleProps>(({ classNames, ...props }, forwardedRef) => (
  <TourPrimitive.Title {...props} className={mx(recipes.tourTitle(), classNames)} ref={forwardedRef} />
));

TourTitle.displayName = 'Tour.Title';

//
// Description
//

type TourDescriptionProps = ThemedClassName<TourPrimitive.DescriptionProps>;

/** The step's `description` by default. */
const TourDescription = forwardRef<HTMLParagraphElement, TourDescriptionProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <TourPrimitive.Description {...props} className={mx(recipes.tourDescription(), classNames)} ref={forwardedRef} />
  ),
);

TourDescription.displayName = 'Tour.Description';

//
// ProgressText
//

type TourProgressTextProps = ThemedClassName<TourPrimitive.ProgressTextProps>;

/** "1 of 4" by default, from the machine's translations; children replace it. */
const TourProgressText = forwardRef<HTMLDivElement, TourProgressTextProps>(({ classNames, ...props }, forwardedRef) => (
  <TourPrimitive.ProgressText {...props} className={mx(recipes.tourProgressText(), classNames)} ref={forwardedRef} />
));

TourProgressText.displayName = 'Tour.ProgressText';

//
// Control
//

type TourControlProps = ThemedClassName<TourPrimitive.ControlProps>;

/** The block row the progress and actions sit in, pushed apart. */
const TourControl = forwardRef<HTMLDivElement, TourControlProps>(({ classNames, ...props }, forwardedRef) => (
  <TourPrimitive.Control {...props} className={mx(recipes.tourControl(), classNames)} ref={forwardedRef} />
));

TourControl.displayName = 'Tour.Control';

//
// Actions
//

type TourActionsProps = TourPrimitive.ActionsProps;

/** Render prop over the current step's `actions`. */
const TourActions = TourPrimitive.Actions;

//
// ActionTrigger
//

type TourActionTriggerProps = Omit<Button.ButtonProps, 'label'> & {
  action: TourStepAction;
  /** Defaults to the action's `label`. */
  label?: string;
};

/**
 * A Button wired to one step action (`next`, `prev`, `dismiss`, `skip` or a function), named by its visible label
 * rather than zag's role label ("next step"), so what is read matches what is shown.
 */
const TourActionTrigger = forwardRef<HTMLButtonElement, TourActionTriggerProps>(
  ({ action, label, ...props }, forwardedRef) => (
    // Button drops zag's `aria-label` unless it is icon-only, so its visible label names it.
    <TourPrimitive.ActionTrigger action={action} asChild>
      <Button.Button {...props} label={label ?? action.label} ref={forwardedRef} />
    </TourPrimitive.ActionTrigger>
  ),
);

TourActionTrigger.displayName = 'Tour.ActionTrigger';

//
// CloseTrigger
//

type TourCloseTriggerProps = Omit<TourPrimitive.CloseTriggerProps, 'children'> & {
  /** With `asChild`, the child (e.g. a "Done" `Button`) ends the tour instead of the default icon button. */
  children?: ReactNode;
  icon?: string;
  label?: string;
};

/** Ends the tour: a ghost icon-only Button by default. */
const TourCloseTrigger = forwardRef<HTMLButtonElement, TourCloseTriggerProps>(
  ({ asChild, children, icon = 'ph--x--regular', label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return asChild ? (
      <TourPrimitive.CloseTrigger {...props} asChild ref={forwardedRef}>
        {children}
      </TourPrimitive.CloseTrigger>
    ) : (
      <TourPrimitive.CloseTrigger {...props} asChild ref={forwardedRef}>
        <Button.Button variant='ghost' icon={icon} label={label ?? t('toolbar-close.label')} iconOnly />
      </TourPrimitive.CloseTrigger>
    );
  },
);

TourCloseTrigger.displayName = 'Tour.CloseTrigger';
export { useTour, useTourContext };

export type {
  TourActionsProps as ActionsProps,
  TourActionTriggerProps as ActionTriggerProps,
  TourCloseTriggerProps as CloseTriggerProps,
  TourContentProps as ContentProps,
  TourControlProps as ControlProps,
  TourDescriptionProps as DescriptionProps,
  TourHeaderProps as HeaderProps,
  TourProgressTextProps as ProgressTextProps,
  TourRootProps as RootProps,
  TourStepAction as StepAction,
  TourStepDetails as StepDetails,
  TourStepPlacement as StepPlacement,
  TourTitleProps as TitleProps,
  UseTourProps,
  UseTourReturn,
};

export {
  TourActions as Actions,
  TourActionTrigger as ActionTrigger,
  TourCloseTrigger as CloseTrigger,
  TourContent as Content,
  TourControl as Control,
  TourDescription as Description,
  TourHeader as Header,
  TourProgressText as ProgressText,
  TourRoot as Root,
  TourTitle as Title,
};
