//
// Copyright 2026 DXOS.org
//

import { Collapsible as CollapsiblePrimitive } from '@ark-ui/react/collapsible';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

//
// Root
//

type CollapsibleRootProps = ThemedClassName<CollapsiblePrimitive.RootProps>;

const CollapsibleRoot = forwardRef<HTMLDivElement, CollapsibleRootProps>(({ classNames, ...props }, forwardedRef) => (
  <CollapsiblePrimitive.Root {...props} className={mx(recipes.collapsible(), classNames)} ref={forwardedRef} />
));

CollapsibleRoot.displayName = 'Next.Collapsible.Root';

//
// Trigger
//

type CollapsibleTriggerProps = ThemedClassName<CollapsiblePrimitive.TriggerProps> & {
  icon?: string;
};

/** A block row: a caret that turns to point down when open, followed by the label. */
const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ classNames, icon = 'ph--caret-right--regular', children, ...props }, forwardedRef) => (
    <CollapsiblePrimitive.Trigger
      {...props}
      className={mx(recipes.collapsibleTrigger(), classNames)}
      ref={forwardedRef}
    >
      <CollapsiblePrimitive.Indicator className={recipes.collapsibleIndicator()}>
        <Icon icon={icon} />
      </CollapsiblePrimitive.Indicator>
      {children}
    </CollapsiblePrimitive.Trigger>
  ),
);

CollapsibleTrigger.displayName = 'Next.Collapsible.Trigger';

//
// Content
//

type CollapsibleContentProps = ThemedClassName<CollapsiblePrimitive.ContentProps>;

/** Animates its height from Ark's measured `--height`. */
const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <CollapsiblePrimitive.Content
      {...props}
      className={mx(recipes.collapsibleContent(), classNames)}
      ref={forwardedRef}
    />
  ),
);

CollapsibleContent.displayName = 'Next.Collapsible.Content';

export const Collapsible = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};

export type { CollapsibleContentProps, CollapsibleRootProps, CollapsibleTriggerProps };
