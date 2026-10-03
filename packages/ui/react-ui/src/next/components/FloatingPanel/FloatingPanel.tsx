//
// Copyright 2026 DXOS.org
//

import {
  type FloatingPanelPoint,
  FloatingPanel as FloatingPanelPrimitive,
  type FloatingPanelSize,
  type FloatingPanelStage,
} from '@ark-ui/react/floating-panel';
import { Portal } from '@ark-ui/react/portal';
import React, { type RefObject, forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button, type ButtonProps } from '../Button/index.ts';

const RESIZE_AXES: readonly FloatingPanelPrimitive.ResizeTriggerAxis[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

//
// Root
//

type FloatingPanelRootProps = FloatingPanelPrimitive.RootProps;

/**
 * Ark floating panel: a draggable, resizable window over the page. The machine owns the open state, position and size
 * (as `--x`/`--y`/`--width`/`--height` on the positioner), the stack order of open panels and the minimized/maximized
 * stages. Content mounts on open and unmounts on close unless the caller opts out.
 */
const FloatingPanelRoot = ({
  lazyMount = true,
  unmountOnExit = true,
  translations: translationsProp,
  ...props
}: FloatingPanelRootProps) => {
  const { t } = useTranslation(translationKey);
  // zag names its own stage triggers, so the names come from the app's translations.
  const translations = useMemo(
    () => ({
      minimize: t('floating-panel.minimize.label'),
      maximize: t('floating-panel.maximize.label'),
      restore: t('floating-panel.restore.label'),
      ...translationsProp,
    }),
    [t, translationsProp],
  );
  return (
    <FloatingPanelPrimitive.Root
      {...props}
      translations={translations}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
    />
  );
};

FloatingPanelRoot.displayName = 'FloatingPanel.Root';

//
// Trigger
//

type FloatingPanelTriggerProps = FloatingPanelPrimitive.TriggerProps;

/** Use `asChild` to open the panel from a `Button`. */
const FloatingPanelTrigger = forwardRef<HTMLButtonElement, FloatingPanelTriggerProps>((props, forwardedRef) => (
  <FloatingPanelPrimitive.Trigger {...props} ref={forwardedRef} />
));

FloatingPanelTrigger.displayName = 'FloatingPanel.Trigger';

//
// Content
//

type FloatingPanelContentProps = ThemedClassName<FloatingPanelPrimitive.ContentProps> & {
  /** The panel's size; it has no sized trigger row to inherit one from. */
  size?: Size;
  /** Portals into this element instead of the body. */
  container?: RefObject<HTMLElement | null>;
};

/**
 * zag writes `z-index: var(--z-index)` (its stack order among open panels, from 1) inline on the positioner, so the
 * dialog band (50) is added inline too, where no class could reach.
 */
const POSITIONER_STYLE = { zIndex: 'calc(50 + var(--z-index, 1))' };

/**
 * The window, a `raised` surface: portalled inside the machine's positioner, which carries its place and size, and
 * edged with a resize handle on every side and corner (zag disables them unless `resizable`).
 */
const FloatingPanelContent = forwardRef<HTMLDivElement, FloatingPanelContentProps>(
  ({ classNames, size = 'md', container, children, ...props }, forwardedRef) => (
    <Portal container={container}>
      <FloatingPanelPrimitive.Positioner style={POSITIONER_STYLE}>
        <FloatingPanelPrimitive.Content
          {...props}
          data-surface='raised'
          data-size={size}
          className={mx(recipes.floatingPanelContent(), classNames)}
          ref={forwardedRef}
        >
          {children}
          {RESIZE_AXES.map((axis) => (
            <FloatingPanelPrimitive.ResizeTrigger
              key={axis}
              axis={axis}
              className={recipes.floatingPanelResizeTrigger()}
            />
          ))}
        </FloatingPanelPrimitive.Content>
      </FloatingPanelPrimitive.Positioner>
    </Portal>
  ),
);

FloatingPanelContent.displayName = 'FloatingPanel.Content';

//
// Header
//

type FloatingPanelHeaderProps = ThemedClassName<FloatingPanelPrimitive.HeaderProps>;

/** The block-tall title row: a DragTrigger holding the Title, then the Control. */
const FloatingPanelHeader = forwardRef<HTMLDivElement, FloatingPanelHeaderProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FloatingPanelPrimitive.Header
      {...props}
      className={mx(recipes.floatingPanelHeader(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FloatingPanelHeader.displayName = 'FloatingPanel.Header';

//
// DragTrigger
//

type FloatingPanelDragTriggerProps = ThemedClassName<FloatingPanelPrimitive.DragTriggerProps>;

/** The area a pointer drags the panel by, filling the header up to its Control. */
const FloatingPanelDragTrigger = forwardRef<HTMLDivElement, FloatingPanelDragTriggerProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FloatingPanelPrimitive.DragTrigger
      {...props}
      className={mx(recipes.floatingPanelDragTrigger(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FloatingPanelDragTrigger.displayName = 'FloatingPanel.DragTrigger';

//
// Title
//

type FloatingPanelTitleProps = ThemedClassName<FloatingPanelPrimitive.TitleProps>;

/** Names the window (the content's `aria-labelledby`), truncating. */
const FloatingPanelTitle = forwardRef<HTMLHeadingElement, FloatingPanelTitleProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FloatingPanelPrimitive.Title
      {...props}
      className={mx(recipes.floatingPanelTitle(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FloatingPanelTitle.displayName = 'FloatingPanel.Title';

//
// Control
//

type FloatingPanelControlProps = ThemedClassName<FloatingPanelPrimitive.ControlProps>;

/** The header's trailing run of buttons: stage triggers and the close. */
const FloatingPanelControl = forwardRef<HTMLDivElement, FloatingPanelControlProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FloatingPanelPrimitive.Control
      {...props}
      className={mx(recipes.floatingPanelControl(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FloatingPanelControl.displayName = 'FloatingPanel.Control';

//
// StageTrigger
//

const STAGE_KEYS: Record<FloatingPanelStage, string> = {
  minimized: 'minimize',
  maximized: 'maximize',
  default: 'restore',
};

const STAGE_ICONS: Record<FloatingPanelStage, string> = {
  minimized: 'ph--minus--regular',
  maximized: 'ph--arrows-out-simple--regular',
  default: 'ph--arrows-in-simple--regular',
};

type FloatingPanelStageTriggerProps = Omit<ButtonProps, 'icon' | 'label' | 'iconOnly'> & {
  /** The stage the button moves the panel to; zag hides `default` until the panel is staged and the others while it is. */
  stage: FloatingPanelStage;
  icon?: string;
  label?: string;
};

/** Minimize, maximize or restore, as a ghost icon-only Button named by the app's translations. */
const FloatingPanelStageTrigger = forwardRef<HTMLButtonElement, FloatingPanelStageTriggerProps>(
  ({ stage, icon, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <FloatingPanelPrimitive.StageTrigger stage={stage} asChild>
        <Button
          variant='ghost'
          {...props}
          iconOnly
          icon={icon ?? STAGE_ICONS[stage]}
          label={label ?? t(`floating-panel.${STAGE_KEYS[stage]}.label`)}
          ref={forwardedRef}
        />
      </FloatingPanelPrimitive.StageTrigger>
    );
  },
);

FloatingPanelStageTrigger.displayName = 'FloatingPanel.StageTrigger';

//
// CloseTrigger
//

type FloatingPanelCloseTriggerProps = Omit<ButtonProps, 'icon' | 'label' | 'iconOnly'> & {
  icon?: string;
  label?: string;
};

/** Closes the panel: a ghost icon-only Button. */
const FloatingPanelCloseTrigger = forwardRef<HTMLButtonElement, FloatingPanelCloseTriggerProps>(
  ({ icon, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <FloatingPanelPrimitive.CloseTrigger asChild>
        <Button
          variant='ghost'
          {...props}
          iconOnly
          icon={icon ?? 'ph--x--regular'}
          label={label ?? t('system-button.close.label')}
          ref={forwardedRef}
        />
      </FloatingPanelPrimitive.CloseTrigger>
    );
  },
);

FloatingPanelCloseTrigger.displayName = 'FloatingPanel.CloseTrigger';

//
// Body
//

type FloatingPanelBodyProps = ThemedClassName<FloatingPanelPrimitive.BodyProps>;

/** Takes the height the header leaves and clips; its content scrolls itself (e.g. in a `ScrollArea`). */
const FloatingPanelBody = forwardRef<HTMLDivElement, FloatingPanelBodyProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <FloatingPanelPrimitive.Body
      {...props}
      className={mx(recipes.floatingPanelBody(), classNames)}
      ref={forwardedRef}
    />
  ),
);

FloatingPanelBody.displayName = 'FloatingPanel.Body';

export const FloatingPanel = {
  Root: FloatingPanelRoot,
  Trigger: FloatingPanelTrigger,
  Content: FloatingPanelContent,
  Header: FloatingPanelHeader,
  DragTrigger: FloatingPanelDragTrigger,
  Title: FloatingPanelTitle,
  Control: FloatingPanelControl,
  StageTrigger: FloatingPanelStageTrigger,
  CloseTrigger: FloatingPanelCloseTrigger,
  Body: FloatingPanelBody,
};

export type {
  FloatingPanelBodyProps,
  FloatingPanelCloseTriggerProps,
  FloatingPanelContentProps,
  FloatingPanelControlProps,
  FloatingPanelDragTriggerProps,
  FloatingPanelHeaderProps,
  FloatingPanelPoint,
  FloatingPanelRootProps,
  FloatingPanelSize,
  FloatingPanelStage,
  FloatingPanelStageTriggerProps,
  FloatingPanelTitleProps,
  FloatingPanelTriggerProps,
};
