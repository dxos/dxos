//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { IconButton, type ThemedClassName, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Companion
//
// A presentational, radix-style component for the companion pane that accompanies a plank: a tab strip
// (selecting among companions) above a content body. Like {@link Plank} it implements toolbar+content
// directly (no `Panel`) and is free of app-framework concepts — labels arrive already localized and
// selection is driven via callbacks.
//

type CompanionDivProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const CompanionRoot = forwardRef<HTMLDivElement, CompanionDivProps>(({ children, ...props }, forwardedRef) => (
  <div
    {...composableProps(props, { role: 'complementary', classNames: 'dx-container flex flex-col dx-attention-surface relative min-w-0' })}
    ref={forwardedRef}
  >
    {children}
  </div>
));

CompanionRoot.displayName = 'Companion.Root';

export type CompanionTab = {
  id: string;
  icon: string;
  /** Already-localized label. */
  label: string;
};

type CompanionTabsProps = ThemedClassName<{
  tabs: ReadonlyArray<CompanionTab>;
  value?: string;
  onValueChange?: (id: string) => void;
  /** Collapse inactive tabs to icon-only once the tab count exceeds this. */
  maxLabels?: number;
}>;

/** Tab strip (the companion's toolbar rail) for choosing among available companions. */
const CompanionTabs = forwardRef<HTMLDivElement, CompanionTabsProps>(
  ({ tabs, value, onValueChange, maxLabels = 5, classNames }, forwardedRef) => (
    <div
      className={mx(
        'flex items-center gap-1 px-1 shrink-0 h-(--dx-rail-size) bg-header-surface border-b border-subdued-separator',
        classNames,
      )}
      ref={forwardedRef}
    >
      <div className='flex-1 min-w-0 overflow-x-auto scrollbar-none flex gap-1'>
        {tabs.map(({ id, icon, label }) => (
          <IconButton
            key={id}
            data-id={id}
            icon={icon}
            iconOnly={tabs.length > maxLabels && value !== id}
            label={label}
            variant={value === id ? 'primary' : 'ghost'}
            onClick={() => onValueChange?.(id)}
          />
        ))}
      </div>
    </div>
  ),
);

CompanionTabs.displayName = 'Companion.Tabs';

const CompanionContent = forwardRef<HTMLDivElement, CompanionDivProps>(({ children, ...props }, forwardedRef) => (
  <div {...composableProps(props, { classNames: 'flex-1 min-h-0' })} ref={forwardedRef}>
    {children}
  </div>
));

CompanionContent.displayName = 'Companion.Content';

export const Companion = {
  Root: CompanionRoot,
  Tabs: CompanionTabs,
  Content: CompanionContent,
};

export type { CompanionDivProps, CompanionTabsProps };
