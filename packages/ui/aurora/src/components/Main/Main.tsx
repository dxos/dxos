//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Root as DialogRoot, DialogContent } from '@radix-ui/react-dialog';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  ComponentPropsWithRef,
  Dispatch,
  forwardRef,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useRef,
} from 'react';

import { useMediaQuery, useForwardedRef } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';
import { useSwipeToDismiss } from './useSwipeToDismiss';

const MAIN_ROOT_NAME = 'MainRoot';
const SIDEBAR_NAME = 'Sidebar';
const MAIN_NAME = 'Main';
const GENERIC_CONSUMER_NAME = 'GenericConsumer';

type MainContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean | undefined>>;
};

const [MainProvider, useMainContext] = createContext<MainContextValue>(MAIN_NAME, {
  sidebarOpen: false,
  setSidebarOpen: (nextOpen) => {
    // TODO(burdon): Standardize with other context missing errors using raise.
    console.warn('Attempt to set sidebar state without initializing `MainRoot`');
  },
});

const useSidebar = (consumerName = GENERIC_CONSUMER_NAME) => {
  const { setSidebarOpen, sidebarOpen } = useMainContext(consumerName);
  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar: useCallback(() => setSidebarOpen(!sidebarOpen), [sidebarOpen, setSidebarOpen]),
    openSidebar: useCallback(() => setSidebarOpen(true), [setSidebarOpen]),
    closeSidebar: useCallback(() => setSidebarOpen(false), [setSidebarOpen]),
  };
};

type MainRootProps = PropsWithChildren<{
  sidebarOpen?: boolean;
  defaultSidebarOpen?: boolean;
  onSidebarOpenChange?: (nextOpen: boolean) => void;
}>;

const MainRoot = ({
  sidebarOpen: propsSidebarOpen,
  defaultSidebarOpen,
  onSidebarOpenChange,
  children,
  ...props
}: MainRootProps) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const [sidebarOpen = isLg, setSidebarOpen] = useControllableState<boolean>({
    prop: propsSidebarOpen,
    defaultProp: defaultSidebarOpen,
    onChange: onSidebarOpenChange,
  });
  return (
    <MainProvider {...{ ...props, sidebarOpen, setSidebarOpen }}>
      <DialogRoot open={sidebarOpen} modal={false}>
        {children}
      </DialogRoot>
    </MainProvider>
  );
};

MainRoot.displayName = MAIN_ROOT_NAME;

type SidebarProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContent>> & { swipeToDismiss?: boolean };

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, swipeToDismiss, ...props }, forwardedRef) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { sidebarOpen, setSidebarOpen } = useMainContext(SIDEBAR_NAME);
    const { tx } = useThemeContext();
    const ref = useForwardedRef(forwardedRef);
    const noopRef = useRef(null);
    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, () => setSidebarOpen(false), 48, 'left', 0);
    return (
      <DialogContent
        forceMount
        onOpenAutoFocus={(event) => isLg && event.preventDefault()}
        onCloseAutoFocus={(event) => isLg && event.preventDefault()}
        {...props}
        className={tx('main.sidebar', 'main__sidebar', { isLg, sidebarOpen }, className)}
        ref={ref}
      >
        <ElevationProvider elevation='chrome'>{children}</ElevationProvider>
      </DialogContent>
    );
  },
);

Sidebar.displayName = SIDEBAR_NAME;

type MainProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & { asChild?: boolean };

const Main = forwardRef<HTMLDivElement, MainProps>(
  ({ asChild, className, children, ...props }: MainProps, forwardedRef) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { sidebarOpen } = useMainContext(MAIN_NAME);
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'main';

    return (
      <Root {...props} className={tx('main.content', 'main', { isLg, sidebarOpen }, className)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

Main.displayName = MAIN_NAME;

type MainOverlayProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.div>, 'children'>>;

const MainOverlay = forwardRef<HTMLDivElement, MainOverlayProps>(({ className, ...props }, forwardedRef) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { sidebarOpen, setSidebarOpen } = useMainContext(MAIN_NAME);
  const { tx } = useThemeContext();
  return (
    <div
      onClick={() => setSidebarOpen(false)}
      {...props}
      className={tx('main.overlay', 'main__overlay', { isLg, sidebarOpen }, className)}
      data-open={sidebarOpen}
      aria-hidden='true'
      data-aria-hidden='true'
      ref={forwardedRef}
    />
  );
});

export { Main, MainOverlay, MainRoot, Sidebar, useMainContext, useSidebar };

export type { MainRootProps, MainProps, MainOverlayProps, SidebarProps };
