//
// Copyright 2025 DXOS.org
//

import { Collapsible } from '@ark-ui/react/collapsible';
import React, { type ComponentPropsWithoutRef, type JSX, type PropsWithChildren } from 'react';

import { createContext } from '@dxos/react-hooks';
import { Icon, IconBlock, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Built on `@ark-ui/react`'s Collapsible (zag state machine), so the header is a real button with
// the disclosure ARIA wiring instead of a click-handling div, and the body animates against the
// `--height` the machine measures rather than a `grid-template-rows` ramp.

//
// Context
//

type ContextValue = {
  duration: number;
};

const [TogglePanelContext, useTogglePanelContext] = createContext<ContextValue>('TogglePanel');

//
// Root — headless; owns disclosure state. Wrap children in a `TogglePanel.Content`.
//

const ROOT_NAME = 'TogglePanel.Root';

type RootProps = ThemedClassName<
  PropsWithChildren<
    {
      open?: boolean;
      defaultOpen?: boolean;
      onChangeOpen?: (open: boolean) => void;
    } & Partial<ContextValue>
  >
>;

const Root = ({ children, classNames, open, defaultOpen = false, duration = 250, onChangeOpen }: RootProps) => (
  <TogglePanelContext duration={duration}>
    <Collapsible.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onChangeOpen && ((details) => onChangeOpen(details.open))}
      // The body is clipped rather than unmounted, matching what callers relied on before: several
      // gate their own content on `open` and would double-unmount otherwise.
      lazyMount={false}
      className={mx(classNames)}
    >
      {children}
    </Collapsible.Root>
  </TogglePanelContext>
);

Root.displayName = ROOT_NAME;

//
// Content — the bordered shell that frames the header and body.
//

const CONTENT_NAME = 'TogglePanel.Content';

type ContentProps = ThemedClassName<PropsWithChildren>;

const Content = composable<HTMLDivElement, ContentProps>(({ children, ...props }, forwardedRef) => (
  <div
    {...composableProps(props, {
      classNames: 'w-full border border-subdued-separator rounded-md overflow-hidden!',
    })}
    ref={forwardedRef}
  >
    {children}
  </div>
));

Content.displayName = CONTENT_NAME;

//
// Header
//

const HEADER_NAME = 'TogglePanel.Header';

type HeaderProps = ThemedClassName<
  Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
    icon?: JSX.Element;
    /**
     * Which edge the disclosure caret sits on. `start` frames the row as a panel header; `end`
     * lets the caret trail the text so the row reads as a sentence with an affordance after it.
     */
    caret?: 'start' | 'end';
  }
>;

const Header = ({ classNames, children, icon, caret = 'start', ...props }: HeaderProps) => {
  const { duration } = useTogglePanelContext(HEADER_NAME);

  const disclosure = (
    <IconBlock>
      <Icon
        size={4}
        icon={'ph--caret-right--regular'}
        style={{ transitionDuration: `${duration}ms` }}
        // The machine owns the state, so the caret reads it off the trigger rather than a prop.
        classNames={['transition transition-transform ease-in-out', 'group-data-[state=open]:rotate-90']}
      />
    </IconBlock>
  );

  return (
    <Collapsible.Trigger
      {...props}
      className={mx(
        'group p-1 items-center cursor-pointer select-none w-full text-start dx-focus-ring-inset',
        caret === 'end' ? 'flex' : 'grid grid-cols-[2rem_1fr_2rem]',
        classNames,
      )}
    >
      {caret === 'start' && disclosure}
      <div className={mx('flex items-center overflow-hidden truncate', caret === 'end' ? 'min-w-0' : 'grow')}>
        {children}
      </div>
      {caret === 'end' && disclosure}
      {icon && <IconBlock>{icon}</IconBlock>}
    </Collapsible.Trigger>
  );
};

Header.displayName = HEADER_NAME;

//
// Body — collapsible region driven by the disclosure state.
//

const BODY_NAME = 'TogglePanel.Body';

type BodyProps = ThemedClassName<PropsWithChildren>;

const Body = composable<HTMLDivElement, BodyProps>(({ children, ...props }, forwardedRef) => {
  const { duration } = useTogglePanelContext(BODY_NAME);
  return (
    <Collapsible.Content
      {...composableProps(props, {
        // `--height` is measured by the machine; a zero duration is how a caller opts out of the
        // ramp entirely (the assistant feed does, because it measures height as the body settles).
        style: { animationDuration: `${duration}ms` },
        classNames: [
          'overflow-hidden',
          duration > 0 && 'data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down',
        ],
      })}
      ref={forwardedRef}
    >
      {children}
    </Collapsible.Content>
  );
});

Body.displayName = BODY_NAME;

//
// Viewport
//

const VIEWPORT_NAME = 'TogglePanel.Viewport';

export type ViewportProps = ThemedClassName<PropsWithChildren>;

/**
 * Scrollable region for nested flex/grid layouts. Uses min-h-0 and min-w-0 so overflow can shrink correctly.
 */
export const Viewport = composable<HTMLDivElement, ViewportProps>(({ children, ...props }, forwardedRef) => (
  <div {...composableProps(props, { classNames: ['overflow-y-auto'] })} ref={forwardedRef}>
    {children}
  </div>
));

Viewport.displayName = VIEWPORT_NAME;

//
// TogglePanel
//

export const TogglePanel = {
  Root,
  Content,
  Header,
  Body,
  Viewport,
};

export type {
  BodyProps as TogglePanelBodyProps,
  ContentProps as TogglePanelContentProps,
  HeaderProps as TogglePanelHeaderProps,
  RootProps as TogglePanelRootProps,
  ViewportProps as TogglePanelViewportProps,
};
