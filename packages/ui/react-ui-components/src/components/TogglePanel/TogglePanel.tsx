//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type JSX, type PropsWithChildren, useEffect } from 'react';

import { Icon, type ThemedClassName, useControlledState } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

const IconBlock = ({ children }: PropsWithChildren) => {
  return <div className='grid h-[24px] w-[24px] place-items-center'>{children}</div>;
};

//
// Context
//

type ContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  duration: number;
};

const [TogglePanelContext, useTogglePanelContext] = createContext<ContextValue>('TogglePanel');

//
// Root
//

const ROOT_NAME = 'TogglePanel.Root';

type RootProps = ThemedClassName<
  PropsWithChildren<
    {
      open?: boolean;
      defaultOpen?: boolean;
      onChangeOpen?: (open: boolean) => void;
    } & Partial<Pick<ContextValue, 'duration'>>
  >
>;

const Root = composable<HTMLDivElement, RootProps>(
  ({ children, open: openProp, defaultOpen = false, duration = 250, onChangeOpen, ...props }, forwardedRef) => {
    const [open, setOpen] = useControlledState<boolean>(openProp ?? defaultOpen);

    useEffect(() => {
      onChangeOpen?.(open);
    }, [open]);

    return (
      <TogglePanelContext duration={duration} open={open} setOpen={setOpen}>
        <div
          {...composableProps(props, {
            classNames: ['border border-separator rounded-sm overflow-hidden w-full'],
          })}
          ref={forwardedRef}
        >
          {children}
        </div>
      </TogglePanelContext>
    );
  },
);

Root.displayName = ROOT_NAME;

//
// Header
//

const HEADER_NAME = 'TogglePanel.Header';

type HeaderProps = ThemedClassName<
  PropsWithChildren<{
    icon?: JSX.Element;
  }>
>;

const Header = ({ classNames, children, icon }: HeaderProps) => {
  const { open, setOpen, duration } = useTogglePanelContext(HEADER_NAME);

  return (
    <div
      className={mx('w-full p-1 grid grid-cols-[24px_1fr_24px] gap-1 cursor-pointer select-none', classNames)}
      onClick={() => setOpen(!open)}
    >
      <IconBlock>
        <Icon
          size={4}
          icon={'ph--caret-right--regular'}
          style={{ transitionDuration: `${duration}ms` }}
          classNames={['transition transition-transform ease-in-out', open ? 'rotate-90' : 'transform-none']}
        />
      </IconBlock>
      <div className='flex items-center overflow-hidden truncate'>{children}</div>
      {icon && <IconBlock>{icon}</IconBlock>}
    </div>
  );
};

Header.displayName = HEADER_NAME;

//
// Content
//

const CONTENT_NAME = 'TogglePanel.Content';

type ContentProps = ThemedClassName<PropsWithChildren>;

const Content = composable<HTMLDivElement, ContentProps>(({ children, ...props }, forwardedRef) => {
  const { duration, open } = useTogglePanelContext(CONTENT_NAME);
  return (
    <div
      {...composableProps(props, {
        style: { transitionDuration: `${duration}ms` },
        classNames: ['grid transition-[grid-template-rows] ease-in-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'],
      })}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

Content.displayName = CONTENT_NAME;

//
// Viewport
//

const VIEWPORT_NAME = 'TogglePanel.Viewport';

export type ViewportProps = ThemedClassName<PropsWithChildren>;

/**
 * Scrollable region for nested flex/grid layouts. Uses min-h-0 and min-w-0 so overflow can shrink correctly.
 */
export const Viewport = composable<HTMLDivElement, ViewportProps>(({ children, ...props }, forwardedRef) => (
  <div {...composableProps(props, { classNames: ['min-h-0 min-w-0 overflow-y-auto'] })} ref={forwardedRef}>
    {children}
  </div>
));

Viewport.displayName = VIEWPORT_NAME;

//
// TogglePanel
//

export const TogglePanel = {
  Root,
  Header,
  Content,
  Viewport,
};

export type {
  RootProps as TogglePanelRootProps,
  HeaderProps as TogglePanelHeaderProps,
  ContentProps as TogglePanelContentProps,
  ViewportProps as TogglePanelViewportProps,
};
