//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { useState, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ListItemRecord } from '../List';

type AccordionContext<T extends ListItemRecord> = {
  value: string[];
  setValue: (value: string[]) => void;
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
  value: controlledValue,
  defaultValue = [],
  onValueChange,
}: AccordionRootProps<T> & {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = (newValue: string[]) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <AccordionProvider {...{ value, setValue, getId }}>
      <div className={mx('overflow-y-auto scrollbar-thin', classNames)}>{children?.({ items: items ?? [] })}</div>
    </AccordionProvider>
  );
};
