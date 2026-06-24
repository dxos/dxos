//
// Copyright 2026 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { IconButton, type ThemedClassName, composableProps, slottable } from '@dxos/react-ui';
import { type AttendableId, type Related, useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

//
// Plank
//
// A presentational, radix-style component for a single deck pane: a toolbar rail above a content body.
// A plank always has a toolbar, so it implements that layout directly rather than wrapping the
// generalized `Panel`. A companion pane is just a Plank whose toolbar holds `Plank.Tabs` instead of a
// sigil/title. Intentionally free of app-framework concepts (capabilities, operations, Surface) —
// containers compose the sigil, controls, tabs and content surface into the slots.
//

// Root accepts arbitrary div attributes (the container wires tabIndex, data-* and key handlers), so it
// is a plain forwarding div rather than the narrowly-typed `slottable` used by the toolbar/content slots.
type PlankRootProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const PlankRoot = forwardRef<HTMLDivElement, PlankRootProps>(({ children, ...props }, forwardedRef) => (
  <div
    {...composableProps(props, {
      role: 'article',
      classNames: 'dx-container flex flex-col dx-attention-surface relative dx-focus-ring-inset-over-all dx-density-lg min-w-0',
    })}
    ref={forwardedRef}
  >
    {children}
  </div>
));

PlankRoot.displayName = 'Plank.Root';

// Toolbar rail: fixed-height header whose direct icon buttons fill the rail height.
const PlankToolbar = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'div';
  const { className, ...rest } = composableProps(props, {
    classNames: 'flex items-stretch gap-1 px-1 shrink-0 h-(--dx-rail-size) bg-header-surface [&>button]:h-full',
  });
  return (
    <Comp {...rest} className={className} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

PlankToolbar.displayName = 'Plank.Toolbar';

const PlankContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : 'div';
  const { className, ...rest } = composableProps(props, { classNames: 'flex-1 min-h-0' });
  return (
    <Comp {...rest} className={className} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

PlankContent.displayName = 'Plank.Content';

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

export type PlankTab = {
  id: string;
  icon: string;
  /** Already-localized label. */
  label: string;
};

type PlankTabsProps = ThemedClassName<{
  tabs: ReadonlyArray<PlankTab>;
  value?: string;
  onValueChange?: (id: string) => void;
  /** Collapse inactive tabs to icon-only once the tab count exceeds this. */
  maxLabels?: number;
}>;

/** Full-height tab strip for a companion plank's toolbar; selects among available companions. */
const PlankTabs = forwardRef<HTMLDivElement, PlankTabsProps>(
  ({ tabs, value, onValueChange, maxLabels = 5, classNames }, forwardedRef) => (
    <div
      className={mx('flex-1 min-w-0 overflow-x-auto scrollbar-none flex items-stretch gap-1', classNames)}
      ref={forwardedRef}
    >
      {tabs.map(({ id, icon, label }) => (
        <IconButton
          key={id}
          data-id={id}
          icon={icon}
          iconOnly={tabs.length > maxLabels && value !== id}
          label={label}
          variant={value === id ? 'primary' : 'ghost'}
          onClick={() => onValueChange?.(id)}
          classNames='h-full'
        />
      ))}
    </div>
  ),
);

PlankTabs.displayName = 'Plank.Tabs';

export const Plank = {
  Root: PlankRoot,
  Toolbar: PlankToolbar,
  Content: PlankContent,
  Title: PlankTitle,
  Tabs: PlankTabs,
};

export type { PlankRootProps, PlankTitleProps, PlankTabsProps };
