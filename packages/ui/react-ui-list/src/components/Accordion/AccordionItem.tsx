//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';

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
  const { value, setValue, getId } = useAccordionContext(ACCORDION_ITEM_NAME);
  const open = value.includes(getId(item));
  const setOpen = useCallback(
    (open: boolean) => setValue(open ? [...value, getId(item)] : value.filter((id) => id !== getId(item))),
    [setValue, value, getId, item],
  );

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

export const AccordionItemBody = ({ children, classNames }: AccordionItemBodyProps) => {
  const { open } = useAccordionItemContext(ACCORDION_ITEM_HEADER_NAME);
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight);
    }
  }, [children]);

  return (
    <div className='transition-all duration-200 overflow-hidden' style={{ height: open ? height : 0 }}>
      <div ref={ref} className={mx('flex flex-col p-2', classNames)}>
        {children}
      </div>
    </div>
  );
};
