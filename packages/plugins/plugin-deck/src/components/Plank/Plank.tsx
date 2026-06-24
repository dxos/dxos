//
// Copyright 2026 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { AttentionSigilButton } from '@dxos/app-toolkit/ui';
import { DensityProvider, IconButton, type ThemedClassName, composableProps, slottable } from '@dxos/react-ui';
import { type AttendableId, type Related, useAttention } from '@dxos/react-ui-attention';
import { iconSize, mx } from '@dxos/ui-theme';
import type { Merge } from '@dxos/util';

//
// Plank
//
// A presentational, radix-style component for a single deck pane: a toolbar rail above a content body.
// A plank always has a toolbar, so it implements that layout directly rather than wrapping the
// generalized `Panel`. A companion pane is just a Plank whose toolbar holds `Plank.Tabs` instead of a
// sigil/title. Intentionally free of app-framework concepts (capabilities, operations, Surface) —
// containers compose the sigil, controls, tabs and content surface into the slots.
//

//
// Root
//

// Root accepts arbitrary div attributes (the container wires tabIndex, data-* and key handlers), so it
// is a plain forwarding div rather than the narrowly-typed `slottable` used by the toolbar/content slots.
type PlankRootProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const PlankRoot = forwardRef<HTMLDivElement, PlankRootProps>(({ children, ...props }, forwardedRef) => (
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

PlankRoot.displayName = 'Plank.Root';

//
// Toolbar
//

// Toolbar rail: 48px (--dx-rail-content) header that vertically centers its items.
// Provides `lg` density so buttons resolve to 40px (--dx-rail-action), matching the sigil.
const PlankToolbar = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      {...composableProps(props, {
        style: iconSize(5),
        classNames: 'flex items-center gap-1 px-1 shrink-0 h-(--dx-rail-content) bg-header-surface',
      })}
      ref={forwardedRef}
    >
      {asChild ? children : <DensityProvider density='lg'>{children}</DensityProvider>}
    </Comp>
  );
});

PlankToolbar.displayName = 'Plank.Toolbar';

//
// Content
//

const PlankContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp {...composableProps(props, { classNames: 'flex-1 min-h-0' })} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

PlankContent.displayName = 'Plank.Content';

//
// Title
//

type PlankTitleProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId & Related;

/** Attention-aware plank title; colors to the accent when the plank (or a related companion) is attended. */
const PlankTitle = forwardRef<HTMLHeadingElement, PlankTitleProps>(
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

PlankTitle.displayName = 'Plank.Title';

//
// Tabs
//

export type PlankTab = {
  id: string;
  icon: string;
  /** Already-localized label. */
  label: string;
};

type PlankTabsProps = Merge<
  ThemedClassName<{
    tabs: ReadonlyArray<PlankTab>;
    value?: string;
    onValueChange?: (id: string) => void;
    /** Collapse inactive tabs to icon-only once the tab count exceeds this. */
    maxTabs?: number;
  }>,
  AttendableId,
  Related
>;

/** Full-height tab strip for a companion plank's toolbar; selects among available companions. */
const PlankTabs = forwardRef<HTMLDivElement, PlankTabsProps>(
  ({ tabs, value, onValueChange, maxTabs = 5, attendableId, related, classNames }, forwardedRef) => {
    // The active tab only reads as primary when the plank (shared with its companion) is attended.
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    const attended = (related && isRelated) || hasAttention || isAncestor;
    return (
      <div
        className={mx('flex-1 min-w-0 overflow-x-auto scrollbar-none flex items-center gap-1', classNames)}
        ref={forwardedRef}
      >
        {tabs.map(({ id, icon, label }) => (
          <IconButton
            key={id}
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

PlankTabs.displayName = 'Plank.Tabs';

//
// Plank
//

export const Plank = {
  Root: PlankRoot,
  Toolbar: PlankToolbar,
  Sigil: AttentionSigilButton,
  Title: PlankTitle,
  Tabs: PlankTabs,
  Content: PlankContent,
};

export type { PlankRootProps, PlankTitleProps, PlankTabsProps };
