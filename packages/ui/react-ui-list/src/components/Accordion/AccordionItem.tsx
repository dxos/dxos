//
// Copyright 2025 DXOS.org
//

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// See `AccordionRoot.tsx` for the rationale on `ListItemRecord = any`.
type ListItemRecord = any;
import { useAccordionContext } from './AccordionRoot';

const ACCORDION_ITEM_NAME = 'AccordionItem';

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
      <AccordionPrimitive.Item value={getId(item)} className={mx('overflow-hidden', classNames)}>
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
      <AccordionPrimitive.Trigger
        className={mx(
          'group flex items-start justify-between gap-2 p-2 dx-focus-ring-inset w-full text-start',
          hover && 'dx-hover',
        )}
      >
        {/* Leading icon and caret center within a single line-height band (`h-6`) so they sit on
            the same centerline as the first line of the content, which may span multiple lines. */}
        {icon && (
          <span className='flex items-center h-6 shrink-0'>
            <Icon icon={icon} size={4} />
          </span>
        )}
        <div className='min-w-0 flex-1'>{children}</div>
        <span className='flex items-center h-6 shrink-0'>
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
    <AccordionPrimitive.Content className='overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down'>
      <div className={mx('p-2', classNames)}>{children}</div>
    </AccordionPrimitive.Content>
  );
};
