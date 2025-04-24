//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { useCallback, useState, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ListItemRecord } from '../List';

type AccordionContext<T extends ListItemRecord> = {
  openItems: Record<string, boolean>;
  setItemOpen: (id: string, open: boolean) => void;
  getId: (item: T) => string;
};

const ACCORDION_NAME = 'Accordion';

export const [AccordionProvider, useAccordionContext] = createContext<AccordionContext<any>>(ACCORDION_NAME);

export type AccordionRendererProps<T extends ListItemRecord> = {
  items: T[];
};

const defaultGetId = <T extends ListItemRecord>(item: T) => (item as any)?.id;

export type AccordionRootProps<T extends ListItemRecord> = ThemedClassName<
  {
    children?: (props: AccordionRendererProps<T>) => ReactNode;
    items?: T[];
  } & Partial<Pick<AccordionContext<T>, 'getId'>>
>;

export const AccordionRoot = <T extends ListItemRecord>({
  classNames,
  items,
  getId = defaultGetId,
  children,
}: AccordionRootProps<T>) => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const handleSetItemOpen = useCallback((id: string, open: boolean) => {
    setOpenItems((prev) => ({ ...prev, [id]: open }));
  }, []);

  return (
    <AccordionProvider {...{ openItems, setItemOpen: handleSetItemOpen, getId }}>
      <div className={mx('overflow-y-auto scrollbar-thin', classNames)}>{children?.({ items: items ?? [] })}</div>
    </AccordionProvider>
  );
};
