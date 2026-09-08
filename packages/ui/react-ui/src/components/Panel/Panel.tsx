//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { PanelStyleProps } from '../../theme';
import { composableProps, slottable } from '../../util';

//
// Root
//

const GRID_TEMPLATE_ROWS = 'auto 1fr auto';
const GRID_TEMPLATE_AREAS = '"toolbar" "content" "statusbar"';

type PanelRootProps = SlottableProps<{ style?: CSSProperties }>;

const PanelRoot = slottable<HTMLDivElement, { style?: CSSProperties }>(
  ({ children, asChild, role, style, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const { tx } = useThemeContext();
    return (
      <ark.div
        asChild={asChild}
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
      </ark.div>
    );
  },
);

PanelRoot.displayName = 'Panel.Root';

//
// Toolbar
//

type PanelToolbarProps = SlottableProps & Pick<PanelStyleProps, 'size'>;

const PanelToolbar = slottable<HTMLDivElement, Pick<PanelStyleProps, 'size'>>(
  ({ children, asChild, size, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const { tx } = useThemeContext();
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-slot='toolbar'
        className={tx('panel.toolbar', { size }, className)}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

PanelToolbar.displayName = 'Panel.Toolbar';

//
// Content
//

type PanelContentProps = SlottableProps;

const PanelContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const { tx } = useThemeContext();
  return (
    <ark.div
      asChild={asChild}
      {...rest}
      data-slot='content'
      className={tx('panel.content', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </ark.div>
  );
});

PanelContent.displayName = 'Panel.Content';

//
// Statusbar
//

type PanelStatusbarProps = SlottableProps & Pick<PanelStyleProps, 'size'>;

const PanelStatusbar = slottable<HTMLDivElement, Pick<PanelStyleProps, 'size'>>(
  ({ children, asChild, size, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const { tx } = useThemeContext();
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-slot='statusbar'
        className={tx('panel.statusbar', { size }, className)}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

PanelStatusbar.displayName = 'Panel.Statusbar';

//
// Panel
//

export const Panel = {
  Root: PanelRoot,
  Toolbar: PanelToolbar,
  Content: PanelContent,
  Statusbar: PanelStatusbar,
};

export type { PanelContentProps, PanelRootProps, PanelStatusbarProps, PanelToolbarProps };
