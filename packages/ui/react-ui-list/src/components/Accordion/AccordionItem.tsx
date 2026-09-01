//
// Copyright 2025 DXOS.org
//

import { Accordion as AccordionPrimitive } from '@ark-ui/react/accordion';
import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { listTheme } from '../List.theme.ts';

// See `AccordionRoot.tsx` for the rationale on `ListItemRecord = any`.
type ListItemRecord = any;
import { ACCORDION_ITEM_NAME, AccordionItemProvider } from './AccordionItemContext.ts';
import { useAccordionContext } from './AccordionRoot.tsx';

const styles = listTheme.styles();

export type AccordionItemProps<T extends ListItemRecord> = ThemedClassName<PropsWithChildren<{ item: T }>>;

export const AccordionItem = <T extends ListItemRecord>({ children, classNames, item }: AccordionItemProps<T>) => {
  const { getId } = useAccordionContext(ACCORDION_ITEM_NAME);

  return (
    <AccordionItemProvider {...{ item }}>
      <AccordionPrimitive.Item value={getId(item)} className={styles.accordionItem({ class: mx(classNames) })}>
        {children}
      </AccordionPrimitive.Item>
    </AccordionItemProvider>
  );
};

export type AccordionItemHeaderProps = ThemedClassName<
  ComponentPropsWithoutRef<'div'> & {
    icon?: string;
    /** Apply `dx-hover` row styling on the trigger (off by default; mirrors `Listbox.Item`). */
    hover?: boolean;
    /**
     * Rendered beside the trigger rather than inside it. Use for interactive controls (a button,
     * a toggle) — nesting those in `children` would put a button inside the trigger's own button.
     */
    trailing?: ReactNode;
  }
>;

export const AccordionItemHeader = ({
  classNames,
  children,
  icon,
  hover,
  trailing,
  ...props
}: AccordionItemHeaderProps) => {
  return (
    // Ark exposes no `Header` part — `ItemTrigger` is the control itself — so this is a plain row.
    <div {...props} className={mx('flex items-start', classNames)}>
      {/* `justify-between` pins the toggle caret to the trailing edge of the row regardless of
          the header content's intrinsic width — so the affordance lives at a predictable
          right-end position. The content wrapper grabs the remaining space. */}
      <AccordionPrimitive.ItemTrigger className={styles.accordionTrigger({ class: hover && 'dx-hover' })}>
        {/* Leading icon and caret center within a single line-height band (`h-6`) so they sit on
            the same centerline as the first line of the content, which may span multiple lines. */}
        {icon && (
          <span className={styles.accordionTriggerIcon()}>
            <Icon icon={icon} size={4} />
          </span>
        )}
        <div className={styles.accordionTriggerContent()}>{children}</div>
        <span className={styles.accordionTriggerIcon()}>
          <Icon
            icon='ph--caret-right--regular'
            size={4}
            classNames='transition-transform duration-200 group-data-[state=open]:rotate-90'
          />
        </span>
      </AccordionPrimitive.ItemTrigger>
      {trailing && <div className={styles.accordionTrailing()}>{trailing}</div>}
    </div>
  );
};

export type AccordionItemBodyProps = ThemedClassName<PropsWithChildren<{ style?: CSSProperties }>>;

export const AccordionItemBody = ({ children, classNames, style }: AccordionItemBodyProps) => {
  return (
    <AccordionPrimitive.ItemContent className={styles.accordionBody()}>
      <div className={styles.accordionBodyContent({ class: mx(classNames) })} style={style}>
        {children}
      </div>
    </AccordionPrimitive.ItemContent>
  );
};
