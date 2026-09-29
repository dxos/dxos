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
import { Toolbar, type ToolbarRootProps } from '../Toolbar/index.ts';

//
// Root
//

type PanelRootProps = {
  size?: Size;
  /** An absolute rung of the surface ladder; `base` by default, as the current Panel's content. */
  level?: Exclude<Level, '+1'>;
};

/**
 * The plank host (Phase 4 decision 1): fills its parent, sets `data-size` and a level for its subtree, and is the pane's
 * query container (decision 5), so its toolbar, content and statusbar collapse at the same pane width.
 */
const PanelRoot = slottable<HTMLDivElement, PanelRootProps>(
  ({ children, asChild, size, level = 'base', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.panel() });
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-scope='panel'
        data-part='root'
        data-size={size}
        data-surface={level}
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
// Toolbar
//

type PanelToolbarProps = Omit<ToolbarRootProps, 'size'>;

/** A `Next.Toolbar.Root` row at the top on the bar aspect, which steps off whatever level hosts the panel. */
const PanelToolbar = slottable<HTMLDivElement, PanelToolbarProps>(({ classNames, ...props }, forwardedRef) => (
  <Toolbar.Root {...props} data-surface='bar' classNames={mx(recipes.panelToolbar(), classNames)} ref={forwardedRef} />
));

PanelToolbar.displayName = 'Next.Panel.Toolbar';

//
// Content
//

type PanelContentProps = Pick<ScrollAreaRootProps, 'mode' | 'width' | 'native'> &
  Pick<ContainerProps, 'gutter' | 'columns' | 'gap' | 'layout'>;

/**
 * The growing middle row: a composed ScrollArea (decision 5) around a gutter Container (`rail` by default), so the
 * thin overlay bar sits in the end gutter. The frame is no query container of its own: its Container collapses against
 * the panel, like the toolbar and statusbar. Carries ScrollArea's `data-scope` (finding 10); the ref is the frame's.
 */
const PanelContent = slottable<HTMLDivElement, PanelContentProps>(
  ({ children, classNames, mode, width, native, gutter = 'rail', columns, gap, layout, ...props }, forwardedRef) => (
    <ScrollArea.Root
      {...props}
      mode={mode}
      width={width}
      native={native}
      classNames={mx(recipes.panelContent(), classNames)}
      ref={forwardedRef}
    >
      <ScrollArea.Viewport asChild>
        <Container gutter={gutter} columns={columns} gap={gap} layout={layout}>
          {children}
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  ),
);

PanelContent.displayName = 'Next.Panel.Content';

//
// Statusbar
//

type PanelStatusbarProps = {};

/** The bottom row: one block tall on the bar aspect, in the size's label text and `--color-description`; no role. */
const PanelStatusbar = slottable<HTMLDivElement, PanelStatusbarProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.panelStatusbar() });
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-scope='panel'
        data-part='statusbar'
        data-surface='bar'
        className={className}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

PanelStatusbar.displayName = 'Next.Panel.Statusbar';

export const Panel = {
  Root: PanelRoot,
  Toolbar: PanelToolbar,
  Content: PanelContent,
  Statusbar: PanelStatusbar,
};

export type { PanelContentProps, PanelRootProps, PanelStatusbarProps, PanelToolbarProps };
