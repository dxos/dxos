//
// Copyright 2025 DXOS.org
//

import { Accordion as AccordionPrimitive } from '@ark-ui/react/accordion';
import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
} from 'react';

import { type ThemedClassName } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { Icon } from '../Icon';
import {
  ACCORDION_ITEM_NAME,
  AccordionItemProvider,
  type AccordionItemRecord,
  AccordionProvider,
  useAccordionContext,
} from './AccordionContext.ts';

// Built on `@ark-ui/react`'s Accordion (zag state machine), which carries the APG keymap for key
// navigation.

export type { AccordionItemRecord };

//
// Root
//

export type AccordionRendererProps<T extends AccordionItemRecord> = {
  items: T[];
};

/** Kept as `(value: string[]) => void` rather than Ark's details object, so callers are unaffected. */
export type AccordionValueProps = {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

const defaultGetId = <T extends AccordionItemRecord>(item: T) => (item as any)?.id;

export type AccordionRootProps<T extends AccordionItemRecord> = ThemedClassName<
  {
    children?: (props: AccordionRendererProps<T>) => ReactNode;
    items?: T[];
    getId?: (item: T) => string;
  } & AccordionValueProps
>;

const AccordionRoot = <T extends AccordionItemRecord>({
  classNames,
  items,
  getId = defaultGetId,
  children,
  value,
  defaultValue,
  onValueChange,
}: AccordionRootProps<T>) => {
  const { tx } = useThemeContext();
  return (
    <AccordionProvider {...{ getId }}>
      <AccordionPrimitive.Root
        multiple
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange && ((details) => onValueChange(details.value))}
        className={tx('accordion.root', {}, classNames)}
      >
        {children?.({ items: items ?? [] })}
      </AccordionPrimitive.Root>
    </AccordionProvider>
  );
};

AccordionRoot.displayName = 'Accordion.Root';

//
// Item
//

export type AccordionItemProps<T extends AccordionItemRecord> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    /** The item's element — a reorder aspect binds its drop target here. */
    ref?: Ref<HTMLDivElement>;
  }>
>;

const AccordionItem = <T extends AccordionItemRecord>({ children, classNames, item, ref }: AccordionItemProps<T>) => {
  const { tx } = useThemeContext();
  const { getId } = useAccordionContext(ACCORDION_ITEM_NAME);

  return (
    <AccordionItemProvider {...{ item }}>
      <AccordionPrimitive.Item ref={ref} value={getId(item)} className={tx('accordion.item', {}, classNames)}>
        {children}
      </AccordionPrimitive.Item>
    </AccordionItemProvider>
  );
};

AccordionItem.displayName = 'Accordion.Item';

export type AccordionItemHeaderProps = ThemedClassName<
  ComponentPropsWithoutRef<'div'> & {
    icon?: string;
    /** Apply `dx-hover` row styling on the trigger (off by default; mirrors `Listbox.Item`). */
    hover?: boolean;
    /**
     * Rendered before the trigger, outside it — a drag handle or a checkbox, which would otherwise
     * nest a control inside the trigger's own button.
     */
    leading?: ReactNode;
    /**
     * Rendered beside the trigger rather than inside it. Use for interactive controls (a button,
     * a toggle) — nesting those in `children` would put a button inside the trigger's own button.
     */
    trailing?: ReactNode;
  }
>;

const AccordionItemHeader = ({
  classNames,
  children,
  icon,
  hover,
  leading,
  trailing,
  ...props
}: AccordionItemHeaderProps) => {
  const { tx } = useThemeContext();
  return (
    // Ark exposes no `Header` part — `ItemTrigger` is the control itself — so this is a plain row.
    <div {...props} className={tx('accordion.header', {}, classNames)}>
      {leading && <div className={tx('accordion.trailing', {})}>{leading}</div>}
      {/* `justify-between` pins the toggle caret to the trailing edge of the row regardless of
          the header content's intrinsic width — so the affordance lives at a predictable
          right-end position. The content wrapper grabs the remaining space. */}
      <AccordionPrimitive.ItemTrigger className={tx('accordion.trigger', { hover })}>
        {/* Leading icon and caret center within a single line-height band so they sit on the same
            centerline as the first line of the content, which may span multiple lines. */}
        {icon && (
          <span className={tx('accordion.triggerIcon', {})}>
            <Icon icon={icon} size={4} />
          </span>
        )}
        <div className={tx('accordion.triggerContent', {})}>{children}</div>
        <span className={tx('accordion.triggerIcon', {})}>
          <Icon
            icon='ph--caret-right--regular'
            size={4}
            classNames='transition-transform duration-200 group-data-[state=open]:rotate-90'
          />
        </span>
      </AccordionPrimitive.ItemTrigger>
      {trailing && <div className={tx('accordion.trailing', {})}>{trailing}</div>}
    </div>
  );
};

AccordionItemHeader.displayName = 'Accordion.ItemHeader';

export type AccordionItemBodyProps = ThemedClassName<PropsWithChildren<{ style?: CSSProperties }>>;

const AccordionItemBody = ({ children, classNames, style }: AccordionItemBodyProps) => {
  const { tx } = useThemeContext();
  return (
    <AccordionPrimitive.ItemContent className={tx('accordion.body', {})}>
      <div className={tx('accordion.bodyContent', {}, classNames)} style={style}>
        {children}
      </div>
    </AccordionPrimitive.ItemContent>
  );
};

AccordionItemBody.displayName = 'Accordion.ItemBody';

export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  ItemHeader: AccordionItemHeader,
  ItemBody: AccordionItemBody,
};
