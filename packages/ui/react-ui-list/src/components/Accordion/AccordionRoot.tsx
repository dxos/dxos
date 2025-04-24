//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { useCallback, useMemo, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ListItemRecord } from '../List';

type AccordionContext<T extends ListItemRecord> = {
  openItems: Map<string, boolean>;
  setItemOpen: (id: string, open: boolean) => void;
  getId?: (item: T) => string; // TODO(burdon): Require if T doesn't conform to type.
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
  } & Pick<AccordionContext<T>, 'getId'>
>;

export const AccordionRoot = <T extends ListItemRecord>({
  classNames,
  items,
  getId = defaultGetId,
  children,
}: AccordionRootProps<T>) => {
  const openItems = useMemo(() => new Map<string, boolean>(), []);
  const setItemOpen = useCallback(
    (id: string, open: boolean) => {
      openItems.set(id, open);
    },
    [openItems],
  );

  return (
    <AccordionProvider {...{ openItems, setItemOpen, getId }}>
      <div className={mx('flex flex-col h-full overflow-auto divide-y divide-divider', classNames)}>
        {children?.({ items: items ?? [] })}
      </div>
    </AccordionProvider>
  );
};
