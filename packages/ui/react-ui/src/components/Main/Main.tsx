//
// Copyright 2023 DXOS.org
//

import { Drawer as DrawerPrimitive, useDrawer } from '@ark-ui/react/drawer';
import { ark } from '@ark-ui/react/factory';
import React, {
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { addEventListener } from '@dxos/async';
import { FOCUS_GROUP_ATTR, KEYBOARD_MODALITY_ATTR } from '@dxos/react-focus';
import { useComposedRefs, useControllableState, useMediaQuery } from '@dxos/react-hooks';
import { osTranslations } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks/index.ts';
import { type Label, toLocalizedString, useTranslation } from '../../providers/index.ts';
import { type MainStyleProps } from '../../theme/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import {
  DRAWER_DEFAULT_HEIGHT,
  DRAWER_MAX_HEIGHT,
  DRAWER_MIN_HEIGHT,
  type DrawerState,
  MAIN_NAME,
  MainProvider,
  type SidebarState,
  useLandmarkMover,
  useMainContext,
} from './MainContext.ts';

const MAIN_ROOT_NAME = 'Main.Root';
const MAIN_DRAWER_NAME = 'Main.Drawer';
const MAIN_OVERLAY_NAME = 'Main.Overlay';
const MAIN_CONTENT_NAME = 'Main.Content';
const NAVIGATION_SIDEBAR_NAME = 'Main.NavigationSidebar';
const COMPLEMENTARY_SIDEBAR_NAME = 'Main.ComplementarySidebar';

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

type MainRootProps = PropsWithChildren<{
  navigationSidebarState?: SidebarState;
  defaultNavigationSidebarState?: SidebarState;
  onNavigationSidebarStateChange?: (nextState: SidebarState) => void;

  complementarySidebarState?: SidebarState;
  defaultComplementarySidebarState?: SidebarState;
  onComplementarySidebarStateChange?: (nextState: SidebarState) => void;

  drawerState?: DrawerState;
  defaultDrawerState?: DrawerState;
  onDrawerStateChange?: (nextState: DrawerState) => void;

  /** Height in rem. */
  drawerHeight?: number;
  defaultDrawerHeight?: number;
  onDrawerHeightChange?: (nextHeight: number) => void;
  /** Fired when a resize drag ends: the moment to persist. */
  onDrawerHeightChangeEnd?: (nextHeight: number) => void;
}>;

const MainRoot = ({
  navigationSidebarState: propsNavigationSidebarState,
  defaultNavigationSidebarState = 'closed',
  onNavigationSidebarStateChange,

  complementarySidebarState: propsComplementarySidebarState,
  defaultComplementarySidebarState = 'closed',
  onComplementarySidebarStateChange,

  drawerState: propsDrawerState,
  defaultDrawerState = 'closed',
  onDrawerStateChange,

  drawerHeight: propsDrawerHeight,
  defaultDrawerHeight = DRAWER_DEFAULT_HEIGHT,
  onDrawerHeightChange,
  onDrawerHeightChangeEnd,

  children,
  ...props
}: MainRootProps) => {
  const [isLg] = useMediaQuery('lg');
  const [navigationSidebarState = isLg ? 'expanded' : 'collapsed', setNavigationSidebarState] =
    useControllableState<SidebarState>({
      prop: propsNavigationSidebarState,
      defaultProp: defaultNavigationSidebarState,
      onChange: onNavigationSidebarStateChange,
    });
  const [complementarySidebarState = isLg ? 'expanded' : 'collapsed', setComplementarySidebarState] =
    useControllableState<SidebarState>({
      prop: propsComplementarySidebarState,
      defaultProp: defaultComplementarySidebarState,
      onChange: onComplementarySidebarStateChange,
    });
  const [drawerState = 'closed', setDrawerState] = useControllableState<DrawerState>({
    prop: propsDrawerState,
    defaultProp: defaultDrawerState,
    onChange: onDrawerStateChange,
  });
  const [drawerHeight = DRAWER_DEFAULT_HEIGHT, setDrawerHeight] = useControllableState<number>({
    prop: propsDrawerHeight,
    defaultProp: defaultDrawerHeight,
    onChange: onDrawerHeightChange,
  });

  const [resizing, setResizing] = useState(false);
  const resizeInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () =>
      addEventListener(window, 'resize', () => {
        setResizing(true);
        if (resizeInterval.current) {
          clearTimeout(resizeInterval.current);
        }

        resizeInterval.current = setTimeout(() => {
          setResizing(false);
          resizeInterval.current = null;
        }, 3_000);
      }),
    [],
  );

  return (
    <MainProvider
      {...props}
      {...{
        navigationSidebarState,
        setNavigationSidebarState,
        complementarySidebarState,
        setComplementarySidebarState,
        drawerState,
        setDrawerState,
        drawerHeight,
        setDrawerHeight,
        onDrawerHeightChangeEnd,
      }}
      resizing={resizing}
    >
      {children}
    </MainProvider>
  );
};

MainRoot.displayName = MAIN_ROOT_NAME;

//
// Overlay
//

type MainOverlayProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.div>, 'children' | 'onClick'>>;

const MainOverlay = forwardRef<HTMLDivElement, MainOverlayProps>(({ classNames, ...props }, forwardedRef) => {
  const [isLg] = useMediaQuery('lg');
  const { navigationSidebarState, setNavigationSidebarState, complementarySidebarState, setComplementarySidebarState } =
    useMainContext(MAIN_OVERLAY_NAME);
  const { tx } = useThemeContext();
  return (
    <div
      {...props}
      onClick={() => {
        setNavigationSidebarState('collapsed');
        setComplementarySidebarState('collapsed');
      }}
      className={tx(
        'main.overlay',
        {
          isLg,
          inlineStartSidebarOpen: navigationSidebarState,
          inlineEndSidebarOpen: complementarySidebarState,
        },
        classNames,
      )}
      data-state={navigationSidebarState === 'expanded' || complementarySidebarState === 'expanded' ? 'open' : 'closed'}
      aria-hidden='true'
      ref={forwardedRef}
    />
  );
});

MainOverlay.displayName = MAIN_OVERLAY_NAME;

//
// Sidebar
//

type MainSidebarProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  /** Below `lg`, a swipe toward the edge closes the sidebar; on by default. */
  swipeToDismiss?: boolean;
  /** Below `lg`, a touch swipe inward from the edge opens the sidebar; on by default. */
  swipeToOpen?: boolean;
  state?: SidebarState;
  resizing?: boolean;
  onStateChange?: (nextState: SidebarState) => void;
  /** Vetoes the focus the sidebar takes on opening; by default it takes focus only from the keyboard. */
  onOpenAutoFocus?: (event: Event) => void;
  side: 'w-start' | 'w-end';
  label: Label;
};

/**
 * Below `lg` an open sidebar is a non-modal drawer — the machine owns its dismissal (Escape, a tap
 * outside, a swipe toward the edge), the edge swipe that opens it and its ARIA — and the content
 * stays mounted so the CSS can slide it; at `lg` it is a plain landmark and the machine stays
 * closed. The machine moves the panel on `transform` during a drag; `main.css` slides it on
 * `inset-inline-start`, so the two never meet.
 */
const MainSidebar = forwardRef<HTMLDivElement, MainSidebarProps>(
  (
    {
      classNames,
      children,
      swipeToDismiss = true,
      swipeToOpen = true,
      onOpenAutoFocus,
      state,
      resizing,
      onStateChange,
      side,
      label,
      ...props
    },
    forwardedRef,
  ) => {
    const [isLg] = useMediaQuery('lg');
    const { tx } = useThemeContext();
    const { t } = useTranslation(osTranslations);

    // Pointer-opened, the sidebar leaves focus where it was; the machine always focuses something,
    // so it is handed the element that already has it.
    const autoFocusVetoed = onOpenAutoFocus
      ? prevents(onOpenAutoFocus)
      : !document.body.hasAttribute(KEYBOARD_MODALITY_ATTR);
    // Only `expanded` is on screen below `lg`; `collapsed` is the resting state there (the deck's
    // default, and where the overlay sends a sidebar), so a dismissal returns to it and the swipe
    // area can open from it.
    const drawer = useDrawer({
      open: !isLg && state === 'expanded',
      onOpenChange: ({ open }) => onStateChange?.(open ? 'expanded' : 'collapsed'),
      modal: false,
      trapFocus: false,
      preventScroll: false,
      restoreFocus: false,
      swipeDirection: side === 'w-end' ? 'end' : 'start',
      // Zag's layer stack takes every later-opened layer for a nested one and dismisses it when a
      // lower layer leaves, which would close the other sidebar whenever this one closes.
      onRequestDismiss: (event) => {
        const { targetLayer } = event.detail;
        const own = event.currentTarget;
        if (!(own instanceof Node && targetLayer?.contains(own))) {
          event.preventDefault();
        }
      },
      initialFocusEl: () => (autoFocusVetoed ? (document.activeElement as HTMLElement | null) : null),
    });

    // NOTE(thure): This is a workaround for something further down the tree grabbing focus on Escape. Adding this
    //   intervention to `Tabs.Root` or `Tabs.Tabpenel` instances is somehow ineffectual.
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        const focusGroupParent = (event.target as HTMLElement).closest(`[${FOCUS_GROUP_ATTR}]`);
        if (event.key === 'Escape' && focusGroupParent) {
          event.preventDefault();
          event.stopPropagation();
          (focusGroupParent as HTMLElement).focus();
        }
        props.onKeyDown?.(event);
      },
      [props.onKeyDown],
    );

    const sidebarProps = {
      ...(state === 'closed' && { inert: true }),
      ...props,
      'aria-label': toLocalizedString(label, t),
      'data-side': side === 'w-end' ? 'ie' : 'is',
      'data-state': state,
      'data-resizing': resizing ? 'true' : 'false',
      'className': tx('main.sidebar', {}, classNames),
      'onKeyDownCapture': handleKeyDown,
      'ref': forwardedRef,
    };

    if (isLg) {
      return <ark.div {...sidebarProps}>{children}</ark.div>;
    }

    return (
      <DrawerPrimitive.RootProvider value={drawer}>
        {/* The machine hides closed content; the CSS slides it out instead, so it stays shown. */}
        <DrawerPrimitive.Content tabIndex={-1} {...sidebarProps} draggable={swipeToDismiss} hidden={false}>
          {children}
        </DrawerPrimitive.Content>
        {swipeToOpen && <DrawerPrimitive.SwipeArea className={tx('main.swipeArea', {})} />}
      </DrawerPrimitive.RootProvider>
    );
  },
);

MainSidebar.displayName = 'Main.Sidebar';

//
// Navigation Sidebar
//

type MainNavigationSidebarProps = Omit<MainSidebarProps, 'expanded' | 'side'>;

const MainNavigationSidebar = forwardRef<HTMLDivElement, MainNavigationSidebarProps>((props, forwardedRef) => {
  const { navigationSidebarState, setNavigationSidebarState, resizing } = useMainContext(NAVIGATION_SIDEBAR_NAME);
  const { ref: moverRef, ...mover } = useLandmarkMover(props.onKeyDown, '0');

  return (
    <MainSidebar
      {...mover}
      {...props}
      state={navigationSidebarState}
      onStateChange={setNavigationSidebarState}
      resizing={resizing}
      side='w-start'
      ref={useComposedRefs<HTMLDivElement>(forwardedRef, moverRef)}
    />
  );
});

MainNavigationSidebar.displayName = NAVIGATION_SIDEBAR_NAME;

//
// Complementary Sidebar
//

type MainComplementarySidebarProps = Omit<MainSidebarProps, 'expanded' | 'side'>;

const MainComplementarySidebar = forwardRef<HTMLDivElement, MainComplementarySidebarProps>((props, forwardedRef) => {
  const { complementarySidebarState, setComplementarySidebarState, resizing } =
    useMainContext(COMPLEMENTARY_SIDEBAR_NAME);
  const { ref: moverRef, ...mover } = useLandmarkMover(props.onKeyDown, '2');

  return (
    <MainSidebar
      {...mover}
      {...props}
      state={complementarySidebarState}
      onStateChange={setComplementarySidebarState}
      resizing={resizing}
      side='w-end'
      ref={useComposedRefs<HTMLDivElement>(forwardedRef, moverRef)}
    />
  );
});

MainComplementarySidebar.displayName = COMPLEMENTARY_SIDEBAR_NAME;

//
// Content
//

type MainContentProps = ThemedClassName<
  ComponentPropsWithRef<typeof ark.div> &
    MainStyleProps & {
      asChild?: boolean;
    }
>;

type MainContentStyle = CSSProperties & Record<'--main-drawer-height', string>;

const MainContent = forwardRef<HTMLDivElement, MainContentProps>(
  ({ asChild, classNames, bounce, handlesFocus, children, role, ...props }: MainContentProps, forwardedRef) => {
    const { navigationSidebarState, complementarySidebarState, drawerState, drawerHeight } = useMainContext(MAIN_NAME);
    const { tx } = useThemeContext();
    const Comp = role ? ark.div : ark.main;
    const { ref: moverRef, ...mover } = useLandmarkMover(props.onKeyDown, '1');
    // The padding lives in CSS so it transitions with the sidebars'; only the height is a variable.
    const style: MainContentStyle = {
      ...props.style,
      '--main-drawer-height': drawerState === 'open' ? `${drawerHeight}rem` : '0rem',
    };

    return (
      <Comp
        asChild={asChild}
        {...(handlesFocus && { ...mover })}
        {...props}
        role={role}
        data-sidebar-left-state={navigationSidebarState}
        data-sidebar-right-state={complementarySidebarState}
        data-drawer-state={drawerState}
        data-handles-focus={handlesFocus}
        style={style}
        className={tx('main.content', { bounce, handlesFocus }, classNames)}
        ref={useComposedRefs<HTMLDivElement>(forwardedRef, handlesFocus ? moverRef : null)}
      >
        {children}
      </Comp>
    );
  },
);

MainContent.displayName = MAIN_CONTENT_NAME;

//
// Drawer
//

type MainDrawerProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  label: Label;
  /** Height in rem. */
  minHeight?: number;
  /** Height in rem. */
  maxHeight?: number;
};

type Drag = { startY: number; startHeight: number; height: number };

/**
 * A bottom drawer across the main area, between the sidebars: `Main.Content` pads block-end by its
 * height so content reflows above it rather than being covered. Closed, it is not in the DOM.
 */
const MainDrawer = forwardRef<HTMLDivElement, MainDrawerProps>(
  (
    { classNames, children, label, minHeight = DRAWER_MIN_HEIGHT, maxHeight = DRAWER_MAX_HEIGHT, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { tx } = useThemeContext();
    const {
      drawerState,
      setDrawerState,
      drawerHeight,
      setDrawerHeight,
      onDrawerHeightChangeEnd,
      navigationSidebarState,
      complementarySidebarState,
    } = useMainContext(MAIN_DRAWER_NAME);
    // Escape closes the drawer like the floating window it stands in for, unless a child already claimed it.
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          setDrawerState('closed');
        }
        props.onKeyDown?.(event);
      },
      [setDrawerState, props.onKeyDown],
    );
    const { ref: moverRef, ...mover } = useLandmarkMover(handleKeyDown, '3');
    const composedRef = useComposedRefs<HTMLDivElement>(forwardedRef, moverRef);

    // Pointer drag on the top edge: rem = px / root font size, clamped. The drag carries its own
    // latest height because the render's `drawerHeight` can trail the final move by a frame.
    const dragRef = useRef<Drag | null>(null);
    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        dragRef.current = { startY: event.clientY, startHeight: drawerHeight, height: drawerHeight };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [drawerHeight],
    );
    const handlePointerMove = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag) {
          return;
        }

        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const next = drag.startHeight + (drag.startY - event.clientY) / rem;
        drag.height = Math.min(maxHeight, Math.max(minHeight, next));
        setDrawerHeight(drag.height);
      },
      [setDrawerHeight, minHeight, maxHeight],
    );
    // Also the cancel and lost-capture path: a drag left open would resize on the next bare hover.
    const handlePointerUp = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag) {
          return;
        }

        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        // A click that never moved has nothing new to persist.
        if (drag.height !== drag.startHeight) {
          onDrawerHeightChangeEnd?.(drag.height);
        }
      },
      [onDrawerHeightChangeEnd],
    );
    // Keyboard resize steps a rem at a time and persists each step, there being no drag to end.
    const handleHandleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLButtonElement>) => {
        const delta = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
        if (delta === 0) {
          return;
        }

        event.preventDefault();
        const next = Math.min(maxHeight, Math.max(minHeight, drawerHeight + delta));
        if (next !== drawerHeight) {
          setDrawerHeight(next);
          onDrawerHeightChangeEnd?.(next);
        }
      },
      [drawerHeight, setDrawerHeight, onDrawerHeightChangeEnd, minHeight, maxHeight],
    );

    if (drawerState !== 'open') {
      return null;
    }

    return (
      <div
        {...mover}
        {...props}
        role='region'
        aria-label={toLocalizedString(label, t)}
        data-sidebar-left-state={navigationSidebarState}
        data-sidebar-right-state={complementarySidebarState}
        className={tx('main.drawer', {}, classNames)}
        style={{ ...props.style, blockSize: `${drawerHeight}rem` }}
        ref={composedRef}
      >
        <button
          type='button'
          role='separator'
          aria-label={t('drawer.resize.label')}
          aria-orientation='horizontal'
          aria-valuenow={drawerHeight}
          aria-valuemin={minHeight}
          aria-valuemax={maxHeight}
          className={tx('main.drawerHandle', {})}
          onKeyDown={handleHandleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        />
        {children}
      </div>
    );
  },
);

MainDrawer.displayName = MAIN_DRAWER_NAME;

//
// Main
//

export const Main = {
  Root: MainRoot,
  Overlay: MainOverlay,
  Content: MainContent,
  NavigationSidebar: MainNavigationSidebar,
  ComplementarySidebar: MainComplementarySidebar,
  Drawer: MainDrawer,
};

export { DRAWER_DEFAULT_HEIGHT, DRAWER_MAX_HEIGHT, DRAWER_MIN_HEIGHT };

export type {
  DrawerState,
  MainContentProps,
  MainDrawerProps,
  MainNavigationSidebarProps,
  MainOverlayProps,
  MainRootProps,
  SidebarState,
};
