//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type Level } from '../Container/index.ts';

//
// Root
//

type PanelRootProps = {
  size?: Size;
  /** An absolute rung of the surface ladder; `base` by default, as the current Panel's content. */
  level?: Exclude<Level, '+1'>;
  /** `document` keeps a scrolling Body's content at the reading width, centred, while it still scrolls at the panel's edge. */
  width?: 'document';
};

/**
 * The plank host (Phase 4 decision 1): fills its parent, sets `data-size` and a level for its subtree, and is the pane's
 * query container (decision 5), so its header, body and footer collapse at the same pane width.
 */
const PanelRoot = slottable<HTMLDivElement, PanelRootProps>(
  ({ children, asChild, size, level = 'base', width, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.panel() });
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-scope='panel'
        data-part='root'
        data-size={size}
        data-surface={level}
        data-width={width}
        className={className}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

PanelRoot.displayName = 'Next.Panel.Root';

//
// Header
//

type PanelHeaderProps = {};

/**
 * The top row on the bar aspect, which steps off whatever level hosts the panel; it sizes to its content, so it takes
 * no space when empty and one block when it holds a `Toolbar.Root`.
 */
const PanelHeader = slottable<HTMLDivElement, PanelHeaderProps>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.panelHeader() });
  return (
    <ark.div
      asChild={asChild}
      {...rest}
      data-scope='panel'
      data-part='header'
      data-surface='bar'
      className={className}
      ref={forwardedRef}
    >
      {children}
    </ark.div>
  );
});

PanelHeader.displayName = 'Next.Panel.Header';

//
// Body
//

type PanelBodyProps = {};

/**
 * The growing middle row, a plain slot: it neither scrolls nor adds a gutter, so content composes its own frame
 * (`asChild` onto a `ScrollArea.Root` around a gutter Container, or a canvas that fills the row). Like the header and
 * footer it is no query container, so its content collapses against the panel.
 */
const PanelBody = slottable<HTMLDivElement, PanelBodyProps>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.panelBody() });
  return (
    <ark.div asChild={asChild} {...rest} data-scope='panel' data-part='body' className={className} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

PanelBody.displayName = 'Next.Panel.Body';

//
// Footer
//

type PanelFooterProps = {};

/** The bottom row on the bar aspect; like Header it sizes to its content, holding a `Toolbar.Root` when it needs one. */
const PanelFooter = slottable<HTMLDivElement, PanelFooterProps>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.panelFooter() });
  return (
    <ark.div
      asChild={asChild}
      {...rest}
      data-scope='panel'
      data-part='footer'
      data-surface='bar'
      className={className}
      ref={forwardedRef}
    >
      {children}
    </ark.div>
  );
});

PanelFooter.displayName = 'Next.Panel.Footer';

export const Panel = {
  Root: PanelRoot,
  Header: PanelHeader,
  Body: PanelBody,
  Footer: PanelFooter,
};

export type { PanelBodyProps, PanelFooterProps, PanelHeaderProps, PanelRootProps };
