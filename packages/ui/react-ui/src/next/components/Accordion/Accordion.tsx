//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Accordion as AccordionPrimitive, useAccordionItemContext } from '@ark-ui/react/accordion';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import * as Icon from '../Icon/Icon.tsx';

//
// Root
//

type AccordionRootProps = ThemedClassName<
  Omit<AccordionPrimitive.RootProps, 'onValueChange' | 'multiple'> & {
    /** More than one item open at once (the default). */
    multiple?: boolean;
    /** A separator frame around and between the items (the default); `false` leaves only the dividers. */
    border?: boolean;
    /** Called with the open items' values. */
    onValueChange?: (value: string[]) => void;
  }
>;

/** A stack of disclosure items; any number may be open unless `multiple` is false. */
const AccordionRoot = forwardRef<HTMLDivElement, AccordionRootProps>(
  ({ classNames, multiple = true, border = true, onValueChange, ...props }, forwardedRef) => (
    <AccordionPrimitive.Root
      {...props}
      multiple={multiple}
      onValueChange={onValueChange && ((details) => onValueChange(details.value))}
      data-border={border ? '' : undefined}
      className={mx(recipes.accordion(), classNames)}
      ref={forwardedRef}
    />
  ),
);

AccordionRoot.displayName = 'Accordion.Root';

//
// Item
//

type AccordionItemProps = ThemedClassName<AccordionPrimitive.ItemProps>;

/** One item; `disabled` keeps the row in the list's rhythm but shows no caret and does not toggle. */
const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(({ classNames, ...props }, forwardedRef) => (
  <AccordionPrimitive.Item {...props} className={mx(recipes.accordionItem(), classNames)} ref={forwardedRef} />
));

AccordionItem.displayName = 'Accordion.Item';

//
// ItemTrigger
//

type AccordionItemTriggerProps = ThemedClassName<AccordionPrimitive.ItemTriggerProps> & {
  /** Leading icon, before the label. */
  icon?: string;
};

/**
 * A block row: an optional leading icon, the label, and a trailing caret (Ark's `ItemIndicator`) that turns to point
 * down while open. A disabled item has nothing to open, so its caret is dropped.
 */
const AccordionItemTrigger = forwardRef<HTMLButtonElement, AccordionItemTriggerProps>(
  ({ classNames, icon, children, ...props }, forwardedRef) => {
    const { disabled } = useAccordionItemContext();
    return (
      <AccordionPrimitive.ItemTrigger
        {...props}
        className={mx(recipes.accordionItemTrigger(), classNames)}
        ref={forwardedRef}
      >
        {icon && (
          <span data-scope='accordion' data-part='item-icon' className={recipes.accordionItemIcon()}>
            <Icon.Icon icon={icon} />
          </span>
        )}
        <span data-scope='accordion' data-part='item-text' className={recipes.accordionItemText()}>
          {children}
        </span>
        {!disabled && (
          <AccordionPrimitive.ItemIndicator className={recipes.accordionItemIndicator()}>
            <Icon.Icon icon='ph--caret-right--regular' />
          </AccordionPrimitive.ItemIndicator>
        )}
      </AccordionPrimitive.ItemTrigger>
    );
  },
);

AccordionItemTrigger.displayName = 'Accordion.ItemTrigger';

//
// ItemContent
//

type AccordionItemContentProps = ThemedClassName<AccordionPrimitive.ItemContentProps>;

/** The disclosed region; its height animates from Ark's measured `--height`. */
const AccordionItemContent = forwardRef<HTMLDivElement, AccordionItemContentProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <AccordionPrimitive.ItemContent
      {...props}
      className={mx(recipes.accordionItemContent(), classNames)}
      ref={forwardedRef}
    />
  ),
);

AccordionItemContent.displayName = 'Accordion.ItemContent';
export type {
  AccordionItemContentProps as ItemContentProps,
  AccordionItemProps as ItemProps,
  AccordionItemTriggerProps as ItemTriggerProps,
  AccordionRootProps as RootProps,
};

export {
  AccordionItem as Item,
  AccordionItemContent as ItemContent,
  AccordionItemTrigger as ItemTrigger,
  AccordionRoot as Root,
};
