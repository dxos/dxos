//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName, composableProps } from '@dxos/react-ui';
import { type AttendableId, type Related, useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

//
// Plank
//
// A presentational, radix-style component for a single deck pane: a fixed-height toolbar rail above a
// content body. A plank always has a toolbar, so it implements that layout directly rather than wrapping
// the generalized `Panel`. Intentionally free of app-framework concepts (capabilities, operations,
// Surface) — containers compose the sigil, controls and content surface into the slots.
//

type PlankDivProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const PlankRoot = forwardRef<HTMLDivElement, PlankDivProps>(({ children, ...props }, forwardedRef) => (
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

const PlankToolbar = forwardRef<HTMLDivElement, PlankDivProps>(({ children, ...props }, forwardedRef) => (
  <div
    {...composableProps(props, {
      classNames: 'flex items-center gap-1 px-1 shrink-0 h-(--dx-rail-size) bg-header-surface border-b border-subdued-separator',
    })}
    ref={forwardedRef}
  >
    {children}
  </div>
));

PlankToolbar.displayName = 'Plank.Toolbar';

const PlankContent = forwardRef<HTMLDivElement, PlankDivProps>(({ children, ...props }, forwardedRef) => (
  <div {...composableProps(props, { classNames: 'flex-1 min-h-0' })} ref={forwardedRef}>
    {children}
  </div>
));

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

export const Plank = {
  Root: PlankRoot,
  Toolbar: PlankToolbar,
  Content: PlankContent,
  Title: PlankTitle,
};

export type { PlankDivProps, PlankTitleProps };
