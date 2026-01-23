//
// Copyright 2025 DXOS.org
//

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type ListItemRecord } from '../List';

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

export type AccordionItemHeaderProps = ThemedClassName<AccordionPrimitive.AccordionHeaderProps>;

export const AccordionItemHeader = ({ classNames, children, ...props }: AccordionItemHeaderProps) => {
  return (
    <AccordionPrimitive.Header {...props} className={mx(classNames)}>
      <AccordionPrimitive.Trigger className='group flex items-center p-2 dx-focus-ring-inset is-full text-start'>
        {children}
        <Icon
          icon='ph--caret-right--regular'
          size={4}
          classNames='transition-transform duration-200 group-data-[state=open]:rotate-90'
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

export type AccordionItemBodyProps = ThemedClassName<PropsWithChildren>;

export const AccordionItemBody = ({ children, classNames }: AccordionItemBodyProps) => {
  return (
    <AccordionPrimitive.Content className='overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown'>
      <div role='none' className={mx('p-2', classNames)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
};
