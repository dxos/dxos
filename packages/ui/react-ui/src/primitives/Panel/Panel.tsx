//
// Copyright 2026 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Root
//

const GRID_TEMPLATE_ROWS = 'auto 1fr auto';
const GRID_TEMPLATE_AREAS = '"toolbar" "content" "statusbar"';

type PanelRootProps = SlottableProps<HTMLDivElement>;

const Root = forwardRef<HTMLDivElement, PanelRootProps>(
  ({ classNames, className, asChild, children, role, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        ref={forwardedRef}
        role={role ?? 'none'}
        {...props}
        style={{
          gridTemplateRows: GRID_TEMPLATE_ROWS,
          gridTemplateAreas: GRID_TEMPLATE_AREAS,
          ...props.style,
        }}
        className={tx('panel.root', {}, [className, classNames])}
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
  ({ classNames, className, asChild, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        ref={forwardedRef}
        data-slot='toolbar'
        {...props}
        className={tx('panel.toolbar', {}, [className, classNames])}
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
  ({ classNames, className, asChild, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        ref={forwardedRef}
        data-slot='content'
        {...props}
        className={tx('panel.content', {}, [className, classNames])}
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
  ({ classNames, className, asChild, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        ref={forwardedRef}
        data-slot='statusbar'
        {...props}
        className={tx('panel.statusbar', {}, [className, classNames])}
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
  PanelRootProps,
  ToolbarProps as PanelToolbarProps,
  ContentProps as PanelContentProps,
  StatusbarProps as PanelStatusbarProps,
};
