//
// Copyright 2023 DXOS.org
//

import { type CheckboxProps } from '@radix-ui/react-checkbox';
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type Dispatch,
  type RefAttributes,
  type SetStateAction,
} from 'react';

import { createContext } from '@dxos/react-hooks';

// Kept out of `ListItem.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const LIST_ITEM_NAME = 'ListItem';

export interface ListItemData {
  id: string;
  labelId?: string;
  selected?: CheckboxProps['checked'];
  open?: boolean;
}

export type ListItemProps = Omit<ListItemData, 'id'> & { collapsible?: boolean } & RefAttributes<HTMLLIElement> &
  ComponentPropsWithoutRef<'li'> & {
    defaultOpen?: boolean;
    onOpenChange?: (nextOpen: boolean) => void;
  } & {
    onSelectedChange?: CheckboxProps['onCheckedChange'];
    defaultSelected?: CheckboxProps['defaultChecked'];
  };

export type ListItemElement = ComponentRef<'li'>;

export type ListItemContextValue = {
  headingId: string;
  open: boolean;
  selected: CheckboxProps['checked'];
  setSelected: Dispatch<SetStateAction<CheckboxProps['checked']>>;
};

export const [ListItemProvider, useListItemContext] = createContext<ListItemContextValue>(LIST_ITEM_NAME);

export type ListItemHeadingProps = Omit<ComponentPropsWithoutRef<'p'>, 'id'> &
  RefAttributes<HTMLParagraphElement> & {
    asChild?: boolean;
  };
