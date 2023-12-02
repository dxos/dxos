//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Root as DialogRoot, DialogContent } from '@radix-ui/react-dialog';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithRef,
  type Dispatch,
  forwardRef,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useRef,
} from 'react';

import { useMediaQuery, useForwardedRef } from '@dxos/react-hooks';

import { useSwipeToDismiss } from './useSwipeToDismiss';
import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ElevationProvider } from '../ElevationProvider';

const MAIN_ROOT_NAME = 'MainRoot';
const NAVIGATION_SIDEBAR_NAME = 'NavigationSidebar';
const COMPLEMENTARY_SIDEBAR_NAME = 'ComplementarySidebar';
const MAIN_NAME = 'Main';
const GENERIC_CONSUMER_NAME = 'GenericConsumer';

type MainContextValue = {
  navigationSidebarOpen: boolean;
  setNavigationSidebarOpen: Dispatch<SetStateAction<boolean | undefined>>;
  complementarySidebarOpen: boolean;
  setComplementarySidebarOpen: Dispatch<SetStateAction<boolean | undefined>>;
};

const [MainProvider, useMainContext] = createContext<MainContextValue>(MAIN_NAME, {
  navigationSidebarOpen: false,
  setNavigationSidebarOpen: (nextOpen) => {
    // TODO(burdon): Standardize with other context missing errors using raise.
    console.warn('Attempt to set sidebar state without initializing `MainRoot`');
  },
  complementarySidebarOpen: false,
  setComplementarySidebarOpen: (nextOpen) => {
    // TODO(burdon): Standardize with other context missing errors using raise.
    console.warn('Attempt to set sidebar state without initializing `MainRoot`');
  },
});

const useSidebars = (consumerName = GENERIC_CONSUMER_NAME) => {
  const { setNavigationSidebarOpen, navigationSidebarOpen, setComplementarySidebarOpen, complementarySidebarOpen } =
    useMainContext(consumerName);
  return {
    navigationSidebarOpen,
    setNavigationSidebarOpen,
    toggleNavigationSidebar: useCallback(
      () => setNavigationSidebarOpen(!navigationSidebarOpen),
      [navigationSidebarOpen, setNavigationSidebarOpen],
    ),
    openNavigationSidebar: useCallback(() => setNavigationSidebarOpen(true), [setNavigationSidebarOpen]),
    closeNavigationSidebar: useCallback(() => setNavigationSidebarOpen(false), [setNavigationSidebarOpen]),
    complementarySidebarOpen,
    setComplementarySidebarOpen,
    toggleComplementarySidebar: useCallback(
      () => setComplementarySidebarOpen(!complementarySidebarOpen),
      [complementarySidebarOpen, setComplementarySidebarOpen],
    ),
    openComplementarySidebar: useCallback(() => setComplementarySidebarOpen(true), [setComplementarySidebarOpen]),
    closeComplementarySidebar: useCallback(() => setComplementarySidebarOpen(false), [setComplementarySidebarOpen]),
  };
};

type MainRootProps = PropsWithChildren<{
  navigationSidebarOpen?: boolean;
  defaultNavigationSidebarOpen?: boolean;
  onNavigationSidebarOpenChange?: (nextOpen: boolean) => void;
  complementarySidebarOpen?: boolean;
  defaultComplementarySidebarOpen?: boolean;
  onComplementarySidebarOpenChange?: (nextOpen: boolean) => void;
}>;

const MainRoot = ({
  navigationSidebarOpen: propsNavigationSidebarOpen,
  defaultNavigationSidebarOpen,
  onNavigationSidebarOpenChange,
  complementarySidebarOpen: propsComplementarySidebarOpen,
  defaultComplementarySidebarOpen,
  onComplementarySidebarOpenChange,
  children,
  ...props
}: MainRootProps) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const [navigationSidebarOpen = isLg, setNavigationSidebarOpen] = useControllableState<boolean>({
    prop: propsNavigationSidebarOpen,
    defaultProp: defaultNavigationSidebarOpen,
    onChange: onNavigationSidebarOpenChange,
  });
  const [complementarySidebarOpen = false, setComplementarySidebarOpen] = useControllableState<boolean>({
    prop: propsComplementarySidebarOpen,
    defaultProp: defaultComplementarySidebarOpen,
    onChange: onComplementarySidebarOpenChange,
  });
  return (
    <MainProvider
      {...props}
      {...{
        navigationSidebarOpen,
        setNavigationSidebarOpen,
        complementarySidebarOpen,
        setComplementarySidebarOpen,
      }}
    >
      {children}
    </MainProvider>
  );
};

MainRoot.displayName = MAIN_ROOT_NAME;

const handleOpenAutoFocus = (event: Event) => {
  !document.body.hasAttribute('data-is-keyboard') && event.preventDefault();
};

type MainSidebarProps = ThemedClassName<ComponentPropsWithRef<typeof DialogContent>> & {
  swipeToDismiss?: boolean;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean | undefined>>;
  side: 'inline-start' | 'inline-end';
};

const MainSidebar = forwardRef<HTMLDivElement, MainSidebarProps>(
  ({ classNames, children, swipeToDismiss, onOpenAutoFocus, open, setOpen, side, ...props }, forwardedRef) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { tx } = useThemeContext();
    const ref = useForwardedRef(forwardedRef);
    const noopRef = useRef(null);
    useSwipeToDismiss(swipeToDismiss ? ref : noopRef, {
      onDismiss: () => setOpen(false),
    });
    const Root = isLg ? Primitive.div : DialogContent;
    return (
      <DialogRoot open={open} modal={false}>
        <Root
          {...(!isLg && { forceMount: true, tabIndex: -1, onOpenAutoFocus: onOpenAutoFocus ?? handleOpenAutoFocus })}
          {...props}
          className={tx(
            'main.sidebar',
            'main__sidebar',
            { isLg, [side === 'inline-end' ? 'inlineEndSidebarOpen' : 'inlineStartSidebarOpen']: open, side },
            classNames,
          )}
          {...(!open && { inert: 'true' })}
          ref={ref}
        >
          <ElevationProvider elevation='group'>{children}</ElevationProvider>
        </Root>
      </DialogRoot>
    );
  },
);

type MainNavigationSidebarProps = Omit<MainSidebarProps, 'open' | 'setOpen' | 'side'>;

const MainNavigationSidebar = forwardRef<HTMLDivElement, MainNavigationSidebarProps>((props, forwardedRef) => {
  const { navigationSidebarOpen, setNavigationSidebarOpen } = useMainContext(NAVIGATION_SIDEBAR_NAME);
  return (
    <MainSidebar
      {...props}
      open={navigationSidebarOpen}
      setOpen={setNavigationSidebarOpen}
      side='inline-start'
      ref={forwardedRef}
    />
  );
});

MainNavigationSidebar.displayName = NAVIGATION_SIDEBAR_NAME;

type MainComplementarySidebarProps = Omit<MainSidebarProps, 'open' | 'setOpen' | 'side'>;

const MainComplementarySidebar = forwardRef<HTMLDivElement, MainComplementarySidebarProps>((props, forwardedRef) => {
  const { complementarySidebarOpen, setComplementarySidebarOpen } = useMainContext(COMPLEMENTARY_SIDEBAR_NAME);
  return (
    <MainSidebar
      {...props}
      open={complementarySidebarOpen}
      setOpen={setComplementarySidebarOpen}
      side='inline-end'
      ref={forwardedRef}
    />
  );
});

MainNavigationSidebar.displayName = NAVIGATION_SIDEBAR_NAME;

type MainProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & { asChild?: boolean; bounce?: boolean };

const MainContent = forwardRef<HTMLDivElement, MainProps>(
  ({ asChild, classNames, bounce, children, ...props }: MainProps, forwardedRef) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { navigationSidebarOpen, complementarySidebarOpen } = useMainContext(MAIN_NAME);
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : 'main';

    return (
      <Root
        {...props}
        className={tx(
          'main.content',
          'main',
          {
            isLg,
            inlineStartSidebarOpen: navigationSidebarOpen,
            inlineEndSidebarOpen: complementarySidebarOpen,
            bounce,
          },
          classNames,
        )}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

MainContent.displayName = MAIN_NAME;

type MainOverlayProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.div>, 'children'>>;

const MainOverlay = forwardRef<HTMLDivElement, MainOverlayProps>(({ classNames, ...props }, forwardedRef) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { navigationSidebarOpen, setNavigationSidebarOpen, complementarySidebarOpen, setComplementarySidebarOpen } =
    useMainContext(MAIN_NAME);
  const { tx } = useThemeContext();
  return (
    <div
      onClick={() => {
        setNavigationSidebarOpen(false);
        setComplementarySidebarOpen(false);
      }}
      {...props}
      className={tx(
        'main.overlay',
        'main__overlay',
        { isLg, inlineStartSidebarOpen: navigationSidebarOpen, inlineEndSidebarOpen: complementarySidebarOpen },
        classNames,
      )}
      data-open={navigationSidebarOpen}
      aria-hidden='true'
      data-aria-hidden='true'
      ref={forwardedRef}
    />
  );
});

export const Main = {
  Root: MainRoot,
  Content: MainContent,
  Overlay: MainOverlay,
  NavigationSidebar: MainNavigationSidebar,
  ComplementarySidebar: MainComplementarySidebar,
};

export { useMainContext, useSidebars };

export type { MainRootProps, MainProps, MainOverlayProps, MainNavigationSidebarProps };
