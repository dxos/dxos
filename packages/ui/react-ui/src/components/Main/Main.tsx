//
// Copyright 2023 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { DialogContent, Root as DialogRoot, DialogTitle } from '@radix-ui/react-dialog';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
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
import { useForwardedRef, useMediaQuery } from '@dxos/react-hooks';
import { osTranslations } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { type Label, toLocalizedString, useTranslation } from '../../primitives';
import { type MainStyleProps } from '../../theme';
import { FOCUS_GROUP_ATTR, KEYBOARD_MODALITY_ATTR, type ThemedClassName } from '../../util';
import { MAIN_NAME, MainProvider, type SidebarState, useLandmarkMover, useMainContext } from './MainContext';
import { useSwipeToDismiss } from './useSwipeToDismiss';

const MAIN_ROOT_NAME = 'Main.Root';
const MAIN_OVERLAY_NAME = 'Main.Overlay';
const MAIN_CONTENT_NAME = 'Main.Content';
const NAVIGATION_SIDEBAR_NAME = 'Main.NavigationSidebar';
const COMPLEMENTARY_SIDEBAR_NAME = 'Main.ComplementarySidebar';

const handleOpenAutoFocus = (event: Event) => {
  !document.body.hasAttribute(KEYBOARD_MODALITY_ATTR) && event.preventDefault();
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

type MainOverlayProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.div>, 'children' | 'onClick'>>;

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

type MainSidebarProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContent>> & {
  swipeToDismiss?: boolean;
  state?: SidebarState;
  resizing?: boolean;
  onStateChange?: (nextState: SidebarState) => void;
  side: 'w-start' | 'w-end';
  label: Label;
};

const MainSidebar = forwardRef<HTMLDivElement, MainSidebarProps>(
  (
    { classNames, children, swipeToDismiss, onOpenAutoFocus, state, resizing, onStateChange, side, label, ...props },
    forwardedRef,
  ) => {
    const [isLg] = useMediaQuery('lg');
    const { tx } = useThemeContext();
    const { t } = useTranslation(osTranslations);
    const ref = useForwardedRef(forwardedRef);
    const noopRef = useRef(null);

    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, {
      onDismiss: () => onStateChange?.('closed'),
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

    const Root = isLg ? Primitive.div : DialogContent;

    return (
      <DialogRoot open={state !== 'closed'} aria-label={toLocalizedString(label, t)} modal={false}>
        {!isLg && <DialogTitle className='sr-only'>{toLocalizedString(label, t)}</DialogTitle>}
        <Root
          {...(!isLg && { forceMount: true, tabIndex: -1, onOpenAutoFocus: onOpenAutoFocus ?? handleOpenAutoFocus })}
          {...(state === 'closed' && { inert: true })}
          {...props}
          data-side={side === 'w-end' ? 'ie' : 'is'}
          data-state={state}
          data-resizing={resizing ? 'true' : 'false'}
          className={tx('main.sidebar', {}, classNames)}
          onKeyDownCapture={handleKeyDown}
          ref={ref}
        >
          {children}
        </Root>
      </DialogRoot>
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
  ComponentPropsWithRef<typeof Primitive.div> &
    MainStyleProps & {
      asChild?: boolean;
    }
>;

const MainContent = forwardRef<HTMLDivElement, MainContentProps>(
  ({ asChild, classNames, bounce, handlesFocus, children, role, ...props }: MainContentProps, forwardedRef) => {
    const { navigationSidebarState, complementarySidebarState } = useMainContext(MAIN_NAME);
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : role ? Primitive.div : 'main';
    const { ref: moverRef, ...mover } = useLandmarkMover(props.onKeyDown, '1');

    return (
      <Comp
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
