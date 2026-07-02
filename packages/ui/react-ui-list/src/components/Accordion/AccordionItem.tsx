//
// Copyright 2025 DXOS.org
//

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { listTheme } from '../List.theme';

// See `AccordionRoot.tsx` for the rationale on `ListItemRecord = any`.
type ListItemRecord = any;
import { useAccordionContext } from './AccordionRoot';

const ACCORDION_ITEM_NAME = 'AccordionItem';

const styles = listTheme.styles();

type AccordionItemContext<T extends ListItemRecord> = {
  item: T;
};

// TODO(wittjosiah): This seems to be conflicting with something in the bundle.
//  Perhaps @radix-ui/react-accordion?
export const [AccordionItemProvider, useDxAccordionItemContext] =
  createContext<AccordionItemContext<any>>(ACCORDION_ITEM_NAME);

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
  AccordionPrimitive.AccordionHeaderProps & {
    icon?: string;
    /** Apply `dx-hover` row styling on the trigger (off by default; mirrors `Listbox.Item`). */
    hover?: boolean;
  }
>;

export const AccordionItemHeader = ({ classNames, children, icon, hover, ...props }: AccordionItemHeaderProps) => {
  return (
    <AccordionPrimitive.Header {...props} className={mx(classNames)}>
      {/* `justify-between` pins the toggle caret to the trailing edge of the row regardless of
          the header content's intrinsic width — so the affordance lives at a predictable
          right-end position. The content wrapper grabs the remaining space. */}
      <AccordionPrimitive.Trigger className={styles.accordionTrigger({ class: hover && 'dx-hover' })}>
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
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

export type AccordionItemBodyProps = ThemedClassName<PropsWithChildren>;

export const AccordionItemBody = ({ children, classNames }: AccordionItemBodyProps) => {
  return (
    <AccordionPrimitive.Content className={styles.accordionBody()}>
      <div className={styles.accordionBodyContent({ class: mx(classNames) })}>{children}</div>
    </AccordionPrimitive.Content>
  );
};
