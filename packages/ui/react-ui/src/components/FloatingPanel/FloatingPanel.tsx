//
// Copyright 2026 DXOS.org
//

// `FloatingPanel` — a draggable, resizable window over the page, on Ark's floating-panel machine.
// The machine owns the open state, the position and size (published as `--x`/`--y`/`--width`/
// `--height` on the positioner), dragging and resizing from the trigger parts, the stack order of
// open panels, and the minimized/maximized stages. DXOS owns the surface: the parts render the
// theme's window, and the stage and close triggers are the system icon buttons.

import { FloatingPanel as FloatingPanelPrimitive } from '@ark-ui/react/floating-panel';
import { Portal } from '@ark-ui/react/portal';
import React, { type ComponentPropsWithRef, type FC, type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type SlottableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks';
import { ElevationProvider } from '../../providers';
import { type ThemedClassName, composableProps, slottable } from '../../util';
import { IconButton, type IconButtonProps } from '../Button';

export type FloatingPanelPoint = { x: number; y: number };

export type FloatingPanelSize = { width: number; height: number };

export type FloatingPanelStage = 'default' | 'minimized' | 'maximized';

export type FloatingPanelResizeAxis = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const RESIZE_AXES: readonly FloatingPanelResizeAxis[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

//
// Root
//

const ROOT_NAME = 'FloatingPanel.Root';

type FloatingPanelRootProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled or initial position, in pixels from the boundary's top-left; the machine moves it while dragging. */
  position?: FloatingPanelPoint;
  defaultPosition?: FloatingPanelPoint;
  onPositionChange?: (position: FloatingPanelPoint) => void;
  /** Where a drag left the panel: the moment to persist a position. */
  onPositionChangeEnd?: (position: FloatingPanelPoint) => void;
  /** Where the panel first opens, given the trigger's and boundary's rects; wins over `defaultPosition`. */
  getAnchorPosition?: (details: { triggerRect: DOMRect | null; boundaryRect: DOMRect | null }) => FloatingPanelPoint;
  size?: FloatingPanelSize;
  defaultSize?: FloatingPanelSize;
  minSize?: FloatingPanelSize;
  maxSize?: FloatingPanelSize;
  onSizeChange?: (size: FloatingPanelSize) => void;
  /** Where a resize left the panel: the moment to persist a size. */
  onSizeChangeEnd?: (size: FloatingPanelSize) => void;
  onStageChange?: (stage: FloatingPanelStage) => void;
  /** The element the panel is kept within while dragged and resized; the viewport by default. */
  getBoundaryEl?: () => HTMLElement | null;
  draggable?: boolean;
  resizable?: boolean;
  lockAspectRatio?: boolean;
  closeOnEscape?: boolean;
  /** Keep the size and position across a close, so the panel reopens where it was left. */
  persistRect?: boolean;
  /** Let a drag carry the panel past the boundary. */
  allowOverflow?: boolean;
  /** `fixed` floats over the viewport; `absolute` positions within the nearest positioned ancestor. */
  strategy?: 'fixed' | 'absolute';
  /** Snap position and size to a grid of this many pixels. */
  gridSize?: number;
  disabled?: boolean;
};

const FloatingPanelRoot: FC<FloatingPanelRootProps> = ({
  children,
  onOpenChange,
  onPositionChange,
  onPositionChangeEnd,
  onSizeChange,
  onSizeChangeEnd,
  onStageChange,
  ...props
}) => {
  const { t } = useTranslation(translationKey);
  // The machine labels its own stage triggers, so the names come from the app's translations.
  const translations = useMemo(
    () => ({
      minimize: t('floating-panel.minimize.label'),
      maximize: t('floating-panel.maximize.label'),
      restore: t('floating-panel.restore.label'),
    }),
    [t],
  );

  return (
    // The panel floats in the dialog band (see `POSITIONER_STYLE`), so what opens from inside it —
    // menus, tooltips — takes the dialog elevation and outranks it.
    <ElevationProvider elevation='dialog'>
      {/* Closed content is not in the DOM at all. */}
      <FloatingPanelPrimitive.Root
        {...props}
        translations={translations}
        // The machine reports each change in a detail object; callers want the value.
        onOpenChange={onOpenChange && (({ open }) => onOpenChange(open))}
        onPositionChange={onPositionChange && (({ position }) => onPositionChange(position))}
        onPositionChangeEnd={onPositionChangeEnd && (({ position }) => onPositionChangeEnd(position))}
        onSizeChange={onSizeChange && (({ size }) => onSizeChange(size))}
        onSizeChangeEnd={onSizeChangeEnd && (({ size }) => onSizeChangeEnd(size))}
        onStageChange={onStageChange && (({ stage }) => onStageChange(stage))}
        lazyMount
        unmountOnExit
      >
        {children}
      </FloatingPanelPrimitive.Root>
    </ElevationProvider>
  );
};

FloatingPanelRoot.displayName = ROOT_NAME;

//
// Trigger
//

type FloatingPanelTriggerProps = ComponentPropsWithRef<typeof FloatingPanelPrimitive.Trigger>;

const FloatingPanelTrigger = FloatingPanelPrimitive.Trigger;

//
// Portal
//

type FloatingPanelPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

const FloatingPanelPortal = ({ children, container }: FloatingPanelPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return <Portal container={containerRef}>{children}</Portal>;
};

FloatingPanelPortal.displayName = 'FloatingPanel.Portal';

//
// Content
//

const CONTENT_NAME = 'FloatingPanel.Content';

type FloatingPanelContentProps = ThemedClassName<ComponentPropsWithRef<typeof FloatingPanelPrimitive.Content>>;

/**
 * Above the whole page — the main layers run to single digits and popovers sit at 20 — at the foot
 * of the dialog band (`surfaceZIndex` in ui-theme: 51 for a dialog, 52 its menus, 53 its tooltips),
 * plus the machine's own stack order among open panels, which it publishes inline as `--z-index`
 * starting at 1. Inline because the machine writes `z-index: var(--z-index)` inline itself, which no
 * class can override.
 */
const POSITIONER_STYLE = { zIndex: 'calc(50 + var(--z-index, 1))' };

/**
 * The window. Renders the machine's positioner around itself, since the two are one surface to a
 * consumer: the positioner carries the place and size, the content the frame.
 */
const FloatingPanelContent = ({ classNames, children, ...props }: FloatingPanelContentProps) => {
  const { tx } = useThemeContext();
  return (
    <FloatingPanelPrimitive.Positioner className={tx('floatingPanel.positioner', {})} style={POSITIONER_STYLE}>
      <FloatingPanelPrimitive.Content {...props} className={tx('floatingPanel.content', {}, classNames)}>
        {children}
      </FloatingPanelPrimitive.Content>
    </FloatingPanelPrimitive.Positioner>
  );
};

FloatingPanelContent.displayName = CONTENT_NAME;

//
// Header, DragTrigger, Title, Control
//

type FloatingPanelHeaderProps = SlottableProps;

const FloatingPanelHeader = slottable<HTMLDivElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  return (
    <FloatingPanelPrimitive.Header
      {...rest}
      asChild={asChild}
      className={tx('floatingPanel.header', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </FloatingPanelPrimitive.Header>
  );
});

FloatingPanelHeader.displayName = 'FloatingPanel.Header';

type FloatingPanelDragTriggerProps = SlottableProps;

/** The area a pointer drags the panel by; the machine sets its cursor and disables it with `draggable`. */
const FloatingPanelDragTrigger = slottable<HTMLDivElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  return (
    <FloatingPanelPrimitive.DragTrigger
      {...rest}
      asChild={asChild}
      className={tx('floatingPanel.dragTrigger', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </FloatingPanelPrimitive.DragTrigger>
  );
});

FloatingPanelDragTrigger.displayName = 'FloatingPanel.DragTrigger';

type FloatingPanelTitleProps = SlottableProps;

/** Names the window: the content's `aria-labelledby` points here. */
const FloatingPanelTitle = slottable<HTMLHeadingElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  return (
    <FloatingPanelPrimitive.Title
      {...rest}
      asChild={asChild}
      className={tx('floatingPanel.title', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </FloatingPanelPrimitive.Title>
  );
});

FloatingPanelTitle.displayName = 'FloatingPanel.Title';

type FloatingPanelControlProps = SlottableProps;

/** The header's button group: stage triggers and the close. */
const FloatingPanelControl = slottable<HTMLDivElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  return (
    <FloatingPanelPrimitive.Control
      {...rest}
      asChild={asChild}
      className={tx('floatingPanel.control', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </FloatingPanelPrimitive.Control>
  );
});

FloatingPanelControl.displayName = 'FloatingPanel.Control';

//
// StageTrigger, CloseTrigger
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

type FloatingPanelStageTriggerProps = Omit<IconButtonProps, 'icon' | 'label' | 'iconOnly'> & {
  /** The stage the button moves the panel to; the machine hides the one that does not apply. */
  stage: FloatingPanelStage;
  icon?: string;
  label?: string;
};

/**
 * Minimize, maximize or restore, as an icon button the machine drives: it labels the button, hides
 * `default` until the panel is staged and the others while it is, and ignores the click when the
 * panel cannot resize.
 */
const FloatingPanelStageTrigger = ({ stage, icon, label, ...props }: FloatingPanelStageTriggerProps) => {
  const { t } = useTranslation(translationKey);
  // Annotated: `t` is generic on its return and only narrows to `string` under a contextual type.
  const name: string = label ?? t(`floating-panel.${STAGE_KEYS[stage]}.label`);
  return (
    <FloatingPanelPrimitive.StageTrigger stage={stage} asChild>
      {/* The child's `aria-label` wins over the machine's, so the tooltip and the name agree. */}
      <IconButton
        variant='ghost'
        density='sm'
        {...props}
        iconOnly
        icon={icon ?? STAGE_ICONS[stage]}
        label={name}
        aria-label={name}
      />
    </FloatingPanelPrimitive.StageTrigger>
  );
};

FloatingPanelStageTrigger.displayName = 'FloatingPanel.StageTrigger';

type FloatingPanelCloseTriggerProps = Omit<IconButtonProps, 'icon' | 'label' | 'iconOnly'> & {
  icon?: string;
  label?: string;
};

const FloatingPanelCloseTrigger = ({ icon, label, ...props }: FloatingPanelCloseTriggerProps) => {
  const { t } = useTranslation(translationKey);
  // Annotated: `t` is generic on its return and only narrows to `string` under a contextual type.
  const name: string = label ?? t('system-button.close.label');
  return (
    <FloatingPanelPrimitive.CloseTrigger asChild>
      <IconButton
        variant='ghost'
        density='sm'
        {...props}
        iconOnly
        icon={icon ?? 'ph--x--regular'}
        label={name}
        aria-label={name}
      />
    </FloatingPanelPrimitive.CloseTrigger>
  );
};

FloatingPanelCloseTrigger.displayName = 'FloatingPanel.CloseTrigger';

//
// Body
//

type FloatingPanelBodyProps = SlottableProps;

const FloatingPanelBody = slottable<HTMLDivElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  return (
    <FloatingPanelPrimitive.Body
      {...rest}
      asChild={asChild}
      className={tx('floatingPanel.body', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </FloatingPanelPrimitive.Body>
  );
});

FloatingPanelBody.displayName = 'FloatingPanel.Body';

//
// ResizeTrigger, Resizers
//

type FloatingPanelResizeTriggerProps = ThemedClassName<{ axis: FloatingPanelResizeAxis }>;

/** One resize handle; the machine positions it on its edge or corner of the content. */
const FloatingPanelResizeTrigger = ({ axis, classNames }: FloatingPanelResizeTriggerProps) => {
  const { tx } = useThemeContext();
  return (
    <FloatingPanelPrimitive.ResizeTrigger axis={axis} className={tx('floatingPanel.resizeTrigger', {}, classNames)} />
  );
};

FloatingPanelResizeTrigger.displayName = 'FloatingPanel.ResizeTrigger';

/** Every edge and corner, for a panel resizable from all sides. */
const FloatingPanelResizers = () => (
  <>
    {RESIZE_AXES.map((axis) => (
      <FloatingPanelResizeTrigger key={axis} axis={axis} />
    ))}
  </>
);

FloatingPanelResizers.displayName = 'FloatingPanel.Resizers';

//
// FloatingPanel
//

export const FloatingPanel = {
  Root: FloatingPanelRoot,
  Trigger: FloatingPanelTrigger,
  Portal: FloatingPanelPortal,
  Content: FloatingPanelContent,
  Header: FloatingPanelHeader,
  DragTrigger: FloatingPanelDragTrigger,
  Title: FloatingPanelTitle,
  Control: FloatingPanelControl,
  StageTrigger: FloatingPanelStageTrigger,
  CloseTrigger: FloatingPanelCloseTrigger,
  Body: FloatingPanelBody,
  ResizeTrigger: FloatingPanelResizeTrigger,
  Resizers: FloatingPanelResizers,
};

export type {
  FloatingPanelBodyProps,
  FloatingPanelCloseTriggerProps,
  FloatingPanelContentProps,
  FloatingPanelControlProps,
  FloatingPanelDragTriggerProps,
  FloatingPanelHeaderProps,
  FloatingPanelPortalProps,
  FloatingPanelResizeTriggerProps,
  FloatingPanelRootProps,
  FloatingPanelStageTriggerProps,
  FloatingPanelTitleProps,
  FloatingPanelTriggerProps,
};
