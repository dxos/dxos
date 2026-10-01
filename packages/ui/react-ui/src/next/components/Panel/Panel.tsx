//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Container, type ContainerProps, type Level } from '../Container/index.ts';
import { ScrollArea, type ScrollAreaRootProps } from '../ScrollArea/index.ts';

//
// Root
//

type PanelRootProps = {
  size?: Size;
  /** An absolute rung of the surface ladder; `base` by default, as the current Panel's content. */
  level?: Exclude<Level, '+1'>;
  /** `document` keeps the Body's content at the reading width, centred, while it still scrolls at the panel's edge. */
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

type PanelBodyProps = Pick<ScrollAreaRootProps, 'mode' | 'width' | 'native'> &
  Pick<ContainerProps, 'gutter' | 'columns' | 'gap' | 'layout' | 'align'>;

/**
 * The growing middle row: a composed ScrollArea (decision 5) around a gutter Container (`rail` by default), so the
 * thin overlay bar sits in the end gutter. The frame is no query container of its own: its Container collapses against
 * the panel, like the header and footer. Carries ScrollArea's `data-scope` (finding 10); the ref is the frame's.
 */
const PanelBody = slottable<HTMLDivElement, PanelBodyProps>(
  (
    { children, classNames, mode, width, native, gutter = 'rail', columns, gap, layout, align, ...props },
    forwardedRef,
  ) => (
    <ScrollArea.Root
      {...props}
      mode={mode}
      width={width}
      native={native}
      classNames={mx(recipes.panelBody(), classNames)}
      ref={forwardedRef}
    >
      <ScrollArea.Viewport asChild>
        <Container gutter={gutter} columns={columns} gap={gap} layout={layout} align={align}>
          {children}
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  ),
);

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
