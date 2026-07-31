//
// Copyright 2026 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { AttentionSigilButton } from '@dxos/app-toolkit/ui';
import { DensityProvider, IconButton, type ThemedClassName, composableProps, slottable } from '@dxos/react-ui';
import { Attention, useAttention } from '@dxos/react-ui-attention';
import { iconSize, mx } from '@dxos/ui-theme';
import type { Merge } from '@dxos/util';

//
// Pane
//
// A presentational, radix-style component for a single deck pane: a toolbar rail above a content body.
// A plank always has a toolbar, so it implements that layout directly rather than wrapping the
// generalized `Panel`. A companion pane is just a Pane whose toolbar holds `Pane.Tabs` instead of a
// sigil/title. Intentionally free of app-framework concepts (capabilities, operations, Surface) —
// containers compose the sigil, controls, tabs and content surface into the slots.
//

//
// Root
//

// Root accepts arbitrary div attributes (the container wires tabIndex, data-* and key handlers), so it
// is a plain forwarding div rather than the narrowly-typed `slottable` used by the toolbar/content slots.
type PaneRootProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const PaneRoot = forwardRef<HTMLDivElement, PaneRootProps>(({ children, ...props }, forwardedRef) => (
  <div
    {...composableProps(props, {
      role: 'article',
      classNames:
        'dx-container flex flex-col dx-attention-surface relative dx-focus-ring-inset-over-all dx-density-lg min-w-0',
    })}
    ref={forwardedRef}
  >
    {children}
  </div>
));

PaneRoot.displayName = 'Pane.Root';

//
// Toolbar
//

const PaneToolbar = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      {...composableProps(props, {
        style: iconSize(5),
        classNames: 'flex items-center gap-1 px-1 shrink-0 h-(--dx-rail-content) bg-header-surface',
      })}
      ref={forwardedRef}
    >
      <DensityProvider density='lg'>{children}</DensityProvider>
    </Comp>
  );
});

PaneToolbar.displayName = 'Pane.Toolbar';

//
// Content
//

const PaneContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp {...composableProps(props, { classNames: 'flex-1 min-h-0' })} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

PaneContent.displayName = 'Pane.Content';

//
// Title
//

type PaneTitleProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & Attention.AttendableId & Attention.Related;

/** Attention-aware plank title; colors to the accent when the plank (or a related companion) is attended. */
const PaneTitle = forwardRef<HTMLHeadingElement, PaneTitleProps>(
  ({ attendableId, related, classNames, ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={((related && isRelated) || hasAttention || isAncestor).toString()}
        className={mx(
          'px-1 min-w-0 w-0 grow truncate font-medium text-base-fg data-[attention=true]:text-accent-text self-center',
          classNames,
        )}
        ref={forwardedRef}
      />
    );
  },
);

PaneTitle.displayName = 'Pane.Title';

//
// Tabs
//

export type PaneTab = {
  id: string;
  icon: string;
  /** Already-localized label. */
  label: string;
};

type PaneTabsProps = Merge<
  ThemedClassName<{
    tabs: ReadonlyArray<PaneTab>;
    value?: string;
    onValueChange?: (id: string) => void;
    /** Collapse inactive tabs to icon-only once the tab count exceeds this. */
    maxTabs?: number;
  }>,
  Attention.AttendableId,
  Attention.Related
>;

/** Full-height tab strip for a companion plank's toolbar; selects among available companions. */
const PaneTabs = forwardRef<HTMLDivElement, PaneTabsProps>(
  ({ tabs, value, onValueChange, maxTabs = 5, attendableId, related, classNames }, forwardedRef) => {
    // The active tab only reads as primary when the plank (shared with its companion) is attended.
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    const attended = (related && isRelated) || hasAttention || isAncestor;
    return (
      <div
        role='tablist'
        className={mx('flex-1 min-w-0 overflow-x-auto scrollbar-none flex items-center gap-1', classNames)}
        ref={forwardedRef}
      >
        {tabs.map(({ id, icon, label }) => (
          <IconButton
            key={id}
            role='tab'
            aria-selected={value === id}
            tabIndex={value === id ? 0 : -1}
            data-id={id}
            icon={icon}
            iconOnly={tabs.length > maxTabs && value !== id}
            label={label}
            variant={value === id && attended ? 'primary' : 'ghost'}
            onClick={() => onValueChange?.(id)}
          />
        ))}
      </div>
    );
  },
);

PaneTabs.displayName = 'Pane.Tabs';

//
// Pane
//

export const Pane = {
  Root: PaneRoot,
  Toolbar: PaneToolbar,
  Sigil: AttentionSigilButton,
  Title: PaneTitle,
  Tabs: PaneTabs,
  Content: PaneContent,
};

export type { PaneRootProps, PaneTabsProps, PaneTitleProps };
