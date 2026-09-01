//
// Copyright 2025 DXOS.org
//

import { Accordion as AccordionPrimitive } from '@ark-ui/react/accordion';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Records flowing through this compound carry caller-defined shapes (any record with an
// optional `id` is acceptable; `getId` defaults to reading `.id`). Typed as `any` so the
// generic parameter remains the caller's source of truth.
type ListItemRecord = any;

type AccordionContext<T extends ListItemRecord> = {
  getId: (item: T) => string;
};

const ACCORDION_NAME = 'Accordion';

export const [AccordionProvider, useAccordionContext] = createContext<AccordionContext<any>>(ACCORDION_NAME);

export type AccordionRendererProps<T extends ListItemRecord> = {
  items: T[];
};

/** Kept as `(value: string[]) => void` rather than Ark's details object, so callers are unaffected. */
export type AccordionValueProps = {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
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
  value,
  defaultValue,
  onValueChange,
}: AccordionRootProps<T> & AccordionValueProps) => {
  return (
    <AccordionProvider {...{ getId }}>
      <AccordionPrimitive.Root
        multiple
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange && ((details) => onValueChange(details.value))}
        className={mx(classNames)}
      >
        {children?.({ items: items ?? [] })}
      </AccordionPrimitive.Root>
    </AccordionProvider>
  );
};
