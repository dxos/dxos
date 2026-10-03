//
// Copyright 2026 DXOS.org
//

import { Collapsible as CollapsiblePrimitive } from '@ark-ui/react/collapsible';
import React, { forwardRef, useContext } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { containerAttributes } from '../Container/index.ts';
import { Icon } from '../Icon/index.ts';
import { RowContext } from '../Listbox/grid.ts';

//
// Root
//

type CollapsibleRootProps = ThemedClassName<CollapsiblePrimitive.RootProps>;

const CollapsibleRoot = forwardRef<HTMLDivElement, CollapsibleRootProps>(({ classNames, ...props }, forwardedRef) => (
  <CollapsiblePrimitive.Root {...props} className={mx(recipes.collapsible(), classNames)} ref={forwardedRef} />
));

CollapsibleRoot.displayName = 'Collapsible.Root';

//
// Trigger
//

type CollapsibleTriggerProps = ThemedClassName<CollapsiblePrimitive.TriggerProps> & {
  icon?: string;
};

/**
 * A block row: a caret that turns to point down when open, followed by the label. Without children it is the caret
 * alone, a block-sized square for a list row's trailing column, named by the row's `ItemText` unless given a label.
 */
const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ classNames, icon = 'ph--caret-right--regular', children, ...props }, forwardedRef) => {
    const row = useContext(RowContext);
    const caretOnly = children === undefined;
    const labelledBy =
      caretOnly && props['aria-label'] === undefined && props['aria-labelledby'] === undefined
        ? row?.textId
        : undefined;
    return (
      <CollapsiblePrimitive.Trigger
        aria-labelledby={labelledBy}
        {...props}
        data-caret-only={caretOnly ? '' : undefined}
        className={mx(recipes.collapsibleTrigger(), classNames)}
        ref={forwardedRef}
      >
        <CollapsiblePrimitive.Indicator className={recipes.collapsibleIndicator()}>
          <Icon icon={icon} />
        </CollapsiblePrimitive.Indicator>
        {children}
      </CollapsiblePrimitive.Trigger>
    );
  },
);

CollapsibleTrigger.displayName = 'Collapsible.Trigger';

//
// Content
//

type CollapsibleContentProps = ThemedClassName<CollapsiblePrimitive.ContentProps> & {
  /** `inherit` makes the content a subgrid of the enclosing grid (a Container or a grid Fieldset), keeping its rails. */
  gutter?: 'inherit';
};

/** Animates its height from Ark's measured `--height`. */
const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ classNames, gutter, style, ...props }, forwardedRef) => {
    const { style: gridStyle, ...grid } = gutter ? containerAttributes({ gutter }) : { style: undefined };
    return (
      <CollapsiblePrimitive.Content
        {...props}
        {...grid}
        style={gridStyle ? { ...gridStyle, ...style } : style}
        className={mx(recipes.collapsibleContent(), gutter && recipes.container(), classNames)}
        ref={forwardedRef}
      />
    );
  },
);

CollapsibleContent.displayName = 'Collapsible.Content';

export const Collapsible = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};

export type { CollapsibleContentProps, CollapsibleRootProps, CollapsibleTriggerProps };
