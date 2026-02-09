//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type KeyboardEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useIOSKeyboard } from '../../hooks';

//
// Context
//

export type DrawerState = 'open' | 'expanded' | 'closed';

type ContextValue = {
  keyboardOpen: boolean;
  drawerState: DrawerState;
  setDrawerState: (nextState: DrawerState) => void;
};

const [ContextProvider, useMobileLayout] = createContext<ContextValue>('MobileLayout');

//
// Root
//

type RootProps = PropsWithChildren<{
  drawerState?: DrawerState;
  defaultDrawerState?: DrawerState;
  onDrawerStateChange?: (nextState: DrawerState) => void;
}>;

const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    { children, drawerState: propsDrawerState, defaultDrawerState = 'closed', onDrawerStateChange, ...props },
    forwardedRef,
  ) => {
    // TODO(burdon): ios-only.
    // Hook handles keyboard detection and sets CSS custom properties.
    const { open: keyboardOpen } = useIOSKeyboard();

    const [drawerState, setDrawerStateInternal] = useState<DrawerState>(propsDrawerState ?? defaultDrawerState);
    const prevKeyboardOpen = useRef(keyboardOpen);

    // Sync external state changes
    useEffect(() => {
      if (propsDrawerState !== undefined) {
        setDrawerStateInternal(propsDrawerState);
      }
    }, [propsDrawerState]);

    // Auto-transition drawer state based on keyboard visibility.
    useEffect(() => {
      if (keyboardOpen && !prevKeyboardOpen.current && drawerState === 'open') {
        setDrawerStateInternal('expanded');
        onDrawerStateChange?.('expanded');
      } else if (!keyboardOpen && prevKeyboardOpen.current && drawerState === 'expanded') {
        setDrawerStateInternal('open');
        onDrawerStateChange?.('open');
      }
      prevKeyboardOpen.current = keyboardOpen;
    }, [keyboardOpen, drawerState, onDrawerStateChange]);

    const setDrawerState = useCallback(
      (nextState: DrawerState) => {
        setDrawerStateInternal(nextState);
        onDrawerStateChange?.(nextState);
      },
      [onDrawerStateChange],
    );

    log.info('MobileLayout', { keyboardOpen, drawerState });

    return (
      <ContextProvider keyboardOpen={keyboardOpen} drawerState={drawerState} setDrawerState={setDrawerState}>
        <div
          {...props}
          role='none'
          data-drawer-state={drawerState}
          style={{
            transition: 'block-size 250ms ease-out',
            blockSize: 'calc(100vh - var(--kb-height, 0px))',
          }}
          className='absolute top-0 left-0 right-0 flex flex-col bg-toolbarSurface'
          ref={forwardedRef}
        >
          <div
            role='none'
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: `calc((1 - var(--kb-open, 0)) * env(safe-area-inset-bottom))`,
            }}
            className='relative bs-full flex flex-col overflow-hidden'
          >
            {children}
          </div>
        </div>
      </ContextProvider>
    );
  },
);

Root.displayName = 'MobileLayout.Root';

//
// Main
//

type MainProps = ThemedClassName<PropsWithChildren>;

const Main = forwardRef<HTMLDivElement, MainProps>(({ classNames, children, ...props }, forwardedRef) => {
  const { drawerState } = useMobileLayout('MobileLayout.Main');

  return (
    <div
      {...props}
      className={mx('overflow-hidden transition-all duration-300 ease-in-out', classNames)}
      style={{
        // When drawer is closed, Main takes full height.
        // When drawer is open, Main takes 50% height (flex-1 behavior).
        // When drawer is expanded (keyboard visible), Main shrinks to 0.
        flexGrow: drawerState === 'closed' ? 1 : drawerState === 'open' ? 1 : 0,
        flexShrink: 1,
        flexBasis: drawerState === 'expanded' ? 0 : 'auto',
        minHeight: 0,
      }}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

Main.displayName = 'MobileLayout.Main';

//
// Drawer
//

type DrawerProps = ThemedClassName<
  PropsWithChildren<{
    label?: string;
  }>
>;

const Drawer = forwardRef<HTMLDivElement, DrawerProps>(({ classNames, children, label, ...props }, forwardedRef) => {
  const { drawerState: state } = useMobileLayout('MobileLayout.Drawer');

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const focusGroupParent = (event.target as HTMLElement).closest('[data-tabster]');
    if (event.key === 'Escape' && focusGroupParent) {
      event.preventDefault();
      event.stopPropagation();
      (focusGroupParent as HTMLElement).focus();
    }
  }, []);

  return (
    <div
      {...props}
      role='region'
      aria-label={label}
      data-state={state}
      className={mx(
        'overflow-hidden transition-all duration-300 ease-in-out',
        'border-bs border-subduedSeparator',
        'sidebar-surface backdrop-blur-md dark:backdrop-blur-lg',
        classNames,
      )}
      style={{
        // When drawer is closed, it shrinks to 0.
        // When drawer is open, takes 50% height (flex-1 splits with Main).
        // When drawer is expanded (keyboard visible), takes full height.
        flexGrow: state === 'closed' ? 0 : 1,
        flexShrink: 1,
        flexBasis: state === 'closed' ? 0 : 'auto',
        minHeight: 0,
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
      }}
      onKeyDownCapture={handleKeyDown}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

Drawer.displayName = 'MobileLayout.Drawer';

//
// Footer
//

const MAX_BLOCK_SIZE = 200;

type FooterProps = PropsWithChildren;

const Footer = forwardRef<HTMLDivElement, FooterProps>(({ children, ...props }, forwardedRef) => {
  return (
    <footer
      {...props}
      className={mx('shrink-0 overflow-hidden')}
      style={{
        // Smoothly collapse footer when keyboard opens.
        transition: 'max-block-size,opacity 300ms ease-out',
        maxBlockSize: `calc((1 - var(--kb-open, 0)) * ${MAX_BLOCK_SIZE}px)`,
        opacity: 'calc(1 - var(--kb-open, 0))',
      }}
      ref={forwardedRef}
    >
      {children}
    </footer>
  );
});

Footer.displayName = 'MobileLayout.Footer';

//
// Mobile
//

export const MobileLayout = {
  Root,
  Main,
  Drawer,
  Footer,
};

export { useMobileLayout };

export type { RootProps, MainProps, DrawerProps, FooterProps };
