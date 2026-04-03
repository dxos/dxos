//
// Copyright 2026 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { composableProps, PanelStyleProps, slottable } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';

//
// Root
//

const GRID_TEMPLATE_ROWS = 'auto 1fr auto';
const GRID_TEMPLATE_AREAS = '"toolbar" "content" "statusbar"';

const Root = slottable<HTMLDivElement>(({ children, asChild, role, style, ...props }, forwardedRef) => {
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
});

Root.displayName = 'Panel.Root';

//
// Toolbar
//

const Toolbar = slottable<HTMLDivElement, Pick<PanelStyleProps, 'size'>>(
  ({ children, asChild, size, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp {...rest} data-slot='toolbar' className={tx('panel.toolbar', { size }, className)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

Toolbar.displayName = 'Panel.Toolbar';

//
// Content
//

const Content = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} data-slot='content' className={tx('panel.content', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

Content.displayName = 'Panel.Content';

//
// Statusbar
//

const Statusbar = slottable<HTMLDivElement, Pick<PanelStyleProps, 'size'>>(
  ({ children, asChild, size, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp {...rest} data-slot='statusbar' className={tx('panel.statusbar', { size }, className)} ref={forwardedRef}>
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

import { type SlottableProps } from '@dxos/ui-types';

export type PanelRootProps = SlottableProps;
export type PanelToolbarProps = SlottableProps & Pick<PanelStyleProps, 'size'>;
export type PanelContentProps = SlottableProps;
export type PanelStatusbarProps = SlottableProps & Pick<PanelStyleProps, 'size'>;
