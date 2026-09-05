//
// Copyright 2023 DXOS.org
//

import { Dialog as DialogPrimitive, useDialog } from '@ark-ui/react/dialog';
import { ark } from '@ark-ui/react/factory';
import React, {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { addEventListener } from '@dxos/async';
import { FOCUS_GROUP_ATTR, KEYBOARD_MODALITY_ATTR } from '@dxos/react-focus';
import { useComposedRefs, useControllableState, useMediaQuery, useMergeRefs } from '@dxos/react-hooks';
import { osTranslations } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { type Label, toLocalizedString, useTranslation } from '../../primitives';
import { type MainStyleProps } from '../../theme';
import { type ThemedClassName } from '../../util';
import { MAIN_NAME, MainProvider, type SidebarState, useLandmarkMover, useMainContext } from './MainContext';
import { useSwipeToDismiss } from './useSwipeToDismiss';

const MAIN_ROOT_NAME = 'Main.Root';
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
}>;

const MainRoot = ({
  navigationSidebarState: propsNavigationSidebarState,
  defaultNavigationSidebarState = 'closed',
  onNavigationSidebarStateChange,

  complementarySidebarState: propsComplementarySidebarState,
  defaultComplementarySidebarState = 'closed',
  onComplementarySidebarStateChange,

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
  swipeToDismiss?: boolean;
  state?: SidebarState;
  resizing?: boolean;
  onStateChange?: (nextState: SidebarState) => void;
  /** Vetoes the focus the sidebar takes on opening; by default it takes focus only from the keyboard. */
  onOpenAutoFocus?: (event: Event) => void;
  side: 'w-start' | 'w-end';
  label: Label;
};

/**
 * Below `lg` an open sidebar is a non-modal dialog — the machine owns its dismissal (Escape, a tap
 * outside) and its ARIA — and the content stays mounted so the CSS can slide it; at `lg` it is a
 * plain landmark and the machine stays closed.
 */
const MainSidebar = forwardRef<HTMLDivElement, MainSidebarProps>(
  (
    { classNames, children, swipeToDismiss, onOpenAutoFocus, state, resizing, onStateChange, side, label, ...props },
    forwardedRef,
  ) => {
    const [isLg] = useMediaQuery('lg');
    const { tx } = useThemeContext();
    const { t } = useTranslation(osTranslations);
    // A ref object for `useSwipeToDismiss`, merged rather than synced: `useForwardedRef` writes the
    // forwarded ref once in an effect, which never delivers the node when `Root` swaps between
    // `ark.div` and the dialog content on a media-query change.
    const ref = useRef<HTMLDivElement>(null);
    const composedRef = useMergeRefs<HTMLDivElement>([ref, forwardedRef]);
    const noopRef = useRef(null);

    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, {
      onDismiss: () => onStateChange?.('closed'),
    });

    // Pointer-opened, the sidebar leaves focus where it was; the machine always focuses something,
    // so it is handed the element that already has it.
    const autoFocusVetoed = onOpenAutoFocus
      ? prevents(onOpenAutoFocus)
      : !document.body.hasAttribute(KEYBOARD_MODALITY_ATTR);
    const dialog = useDialog({
      'open': !isLg && state !== 'closed',
      'onOpenChange': ({ open }) => {
        if (!open) {
          onStateChange?.('closed');
        }
      },
      'aria-label': toLocalizedString(label, t),
      'modal': false,
      'trapFocus': false,
      'preventScroll': false,
      'restoreFocus': false,
      'initialFocusEl': () => (autoFocusVetoed ? (document.activeElement as HTMLElement | null) : null),
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
      'data-side': side === 'w-end' ? 'ie' : 'is',
      'data-state': state,
      'data-resizing': resizing ? 'true' : 'false',
      'className': tx('main.sidebar', {}, classNames),
      'onKeyDownCapture': handleKeyDown,
      'ref': composedRef,
    };

    if (isLg) {
      return <ark.div {...sidebarProps}>{children}</ark.div>;
    }

    return (
      <DialogPrimitive.RootProvider value={dialog}>
        {/* The machine hides closed content; the CSS slides it out instead, so it stays shown. */}
        <DialogPrimitive.Content tabIndex={-1} {...sidebarProps} hidden={false}>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.RootProvider>
    );
  },
);

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

const MainContent = forwardRef<HTMLDivElement, MainContentProps>(
  ({ asChild, classNames, bounce, handlesFocus, children, role, ...props }: MainContentProps, forwardedRef) => {
    const { navigationSidebarState, complementarySidebarState } = useMainContext(MAIN_NAME);
    const { tx } = useThemeContext();
    const Comp = role ? ark.div : ark.main;
    const { ref: moverRef, ...mover } = useLandmarkMover(props.onKeyDown, '1');

    return (
      <Comp
        asChild={asChild}
        {...(handlesFocus && { ...mover })}
        {...props}
        role={role}
        data-sidebar-left-state={navigationSidebarState}
        data-sidebar-right-state={complementarySidebarState}
        data-handles-focus={handlesFocus}
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
// Main
//

export const Main = {
  Root: MainRoot,
  Overlay: MainOverlay,
  Content: MainContent,
  NavigationSidebar: MainNavigationSidebar,
  ComplementarySidebar: MainComplementarySidebar,
};

export type { MainContentProps, MainNavigationSidebarProps, MainOverlayProps, MainRootProps, SidebarState };
