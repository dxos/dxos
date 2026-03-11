//
// Copyright 2026 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { composableProps } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Root
//

const GRID_TEMPLATE_ROWS = 'auto 1fr auto';
const GRID_TEMPLATE_AREAS = '"toolbar" "content" "statusbar"';

type RootProps = SlottableProps<HTMLDivElement>;

const Root = forwardRef<HTMLDivElement, RootProps>(
  ({ children, asChild, role, style, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp
        {...rest}
        role={role ?? 'none'}
        style={{
          gridTemplateRows: GRID_TEMPLATE_ROWS,
          gridTemplateAreas: GRID_TEMPLATE_AREAS,
          ...style,
        }}
        className={tx('panel.root', {}, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

Root.displayName = 'Panel.Root';

//
// Toolbar
//

type ToolbarProps = SlottableProps<HTMLDivElement>;

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp
        {...rest}
        data-slot='toolbar'
        className={tx('panel.toolbar', {}, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

Toolbar.displayName = 'Panel.Toolbar';

//
// Content
//

type ContentProps = SlottableProps<HTMLDivElement>;

const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp
        {...rest}
        data-slot='content'
        className={tx('panel.content', {}, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

Content.displayName = 'Panel.Content';

//
// Statusbar
//

type StatusbarProps = SlottableProps<HTMLDivElement>;

const Statusbar = forwardRef<HTMLDivElement, StatusbarProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp
        {...rest}
        data-slot='statusbar'
        className={tx('panel.statusbar', {}, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

Statusbar.displayName = 'Panel.Statusbar';

//
// Panel
//

export const Panel = {
  Root,
  Toolbar,
  Content,
  Statusbar,
};

export type {
  RootProps as PanelRootProps,
  ToolbarProps as PanelToolbarProps,
  ContentProps as PanelContentProps,
  StatusbarProps as PanelStatusbarProps,
};
