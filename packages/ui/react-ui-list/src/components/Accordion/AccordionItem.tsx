//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { useCallback, type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useAccordionContext } from './AccordionRoot';
import { type ListItemRecord } from '../List';

const ACCORDION_ITEM_NAME = 'AccordionItem';

type AccordionItemContext<T extends ListItemRecord> = {
  item: T;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const [AccordionItemProvider, useAccordionItemContext] =
  createContext<AccordionItemContext<any>>(ACCORDION_ITEM_NAME);

export type AccordionItemProps<T extends ListItemRecord> = ThemedClassName<PropsWithChildren<{ item: T }>>;

export const AccordionItem = <T extends ListItemRecord>({ children, classNames, item }: AccordionItemProps<T>) => {
  const { openItems, setItemOpen, getId } = useAccordionContext(ACCORDION_ITEM_NAME);
  const open = !!openItems[getId(item)];
  const setOpen = useCallback((open: boolean) => setItemOpen(getId(item), open), [setItemOpen, getId, item]);

  return (
    <AccordionItemProvider {...{ item, open, setOpen }}>
      <div className={mx('flex flex-col w-full overflow-hidden', classNames)}>{children}</div>
    </AccordionItemProvider>
  );
};

const ACCORDION_ITEM_HEADER_NAME = 'AccordionItemHeader';

export type AccordionItemHeaderProps = ThemedClassName<{ title: string; icon?: string }>;

export const AccordionItemHeader = ({ classNames, title, icon }: AccordionItemHeaderProps) => {
  const { open, setOpen } = useAccordionItemContext(ACCORDION_ITEM_HEADER_NAME);
  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <div className={mx('flex w-full items-center p-2 gap-2', classNames)} onClick={handleToggle}>
      {icon && <Icon icon={icon} classNames='cursor-pointer' />}
      <div className='grow truncate cursor-pointer'>{title}</div>
      <Icon
        icon='ph--caret-right--regular'
        size={4}
        classNames={['transition-transform duration-200 cursor-pointer', open && 'rotate-90']}
        onClick={handleToggle}
      />
    </div>
  );
};

export type AccordionItemBodyProps = ThemedClassName<PropsWithChildren>;

export const AccordionItemBody = ({ children, classNames, ...props }: AccordionItemBodyProps) => {
  const { open } = useAccordionItemContext(ACCORDION_ITEM_HEADER_NAME);
  if (!open) {
    return null;
  }

  return (
    <div className={mx('flex flex-col p-2', classNames)} {...props}>
      {children}
    </div>
  );
};
