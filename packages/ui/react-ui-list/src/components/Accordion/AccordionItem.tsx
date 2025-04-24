//
// Copyright 2025 DXOS.org
//

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useAccordionContext } from './AccordionRoot';
import { type ListItemRecord } from '../List';

const ACCORDION_ITEM_NAME = 'AccordionItem';

type AccordionItemContext<T extends ListItemRecord> = {
  item: T;
};

export const [AccordionItemProvider, useAccordionItemContext] =
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

export type AccordionItemHeaderProps = ThemedClassName<{ title: string; icon?: string }>;

export const AccordionItemHeader = ({ classNames, title, icon }: AccordionItemHeaderProps) => {
  return (
    <AccordionPrimitive.Header className={mx(classNames)}>
      <AccordionPrimitive.Trigger className='group flex items-center p-2 dx-focus-ring-inset is-full text-start'>
        {icon && <Icon icon={icon} />}
        <span className='grow truncate'>{title}</span>
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
