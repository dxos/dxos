//
// Copyright 2023 DXOS.org
//

import { CaretDown } from '@phosphor-icons/react';
// TODO(burdon): Clearer if just import * as RadixSelect?
import {
  Root as SelectPrimitiveRoot,
  SelectProps as SelectPrimitiveRootProps,
  SelectItem as SelectPrimitiveItem,
  SelectItemProps as SelectPrimitiveItemProps,
  SelectItemText as SelectPrimitiveItemText,
  SelectContent as SelectPrimitiveContent,
  SelectContentProps as SelectPrimitiveContentProps,
  SelectTrigger as SelectPrimitiveTrigger,
  SelectTriggerProps as SelectPrimitiveTriggerProps,
  SelectValue as SelectPrimitiveValue,
  SelectIcon as SelectPrimitiveIcon,
  SelectPortal as SelectPrimitivePortal,
} from '@radix-ui/react-select';
import React, { FunctionComponent } from 'react';

import { ThemedClassName } from '../../util';

// https://www.radix-ui.com/themes/docs/components/select
// https://www.radix-ui.com/primitives/docs/components/select

type SelectRootProps = ThemedClassName<SelectPrimitiveRootProps>;

const SelectRoot: FunctionComponent<SelectRootProps> = SelectPrimitiveRoot;

// TODO(burdon): Add placeholder.
type SelectTriggerProps = ThemedClassName<SelectPrimitiveTriggerProps>;

// TODO(burdon): Style as button.
const SelectTrigger: FunctionComponent<SelectTriggerProps> = ({ children, placeholder, ...props }) => {
  return (
    <SelectPrimitiveTrigger {...props}>
      <div className='flex items-center'>
        <SelectPrimitiveValue placeholder={placeholder} />
        <SelectPrimitiveIcon>
          <CaretDown />
        </SelectPrimitiveIcon>
      </div>
    </SelectPrimitiveTrigger>
  );
};

type SelectContentProps = ThemedClassName<SelectPrimitiveContentProps>;

const SelectContent: FunctionComponent<SelectContentProps> = (props) => {
  return (
    <SelectPrimitivePortal>
      <SelectPrimitiveContent {...props} />
    </SelectPrimitivePortal>
  );
};

type SelectItemProps = ThemedClassName<SelectPrimitiveItemProps>;

// TODO(burdon): Add Check.
const SelectItem = ({ children, ...props }: SelectItemProps) => {
  return (
    <SelectPrimitiveItem {...props}>
      <SelectPrimitiveItemText>{children}</SelectPrimitiveItemText>
    </SelectPrimitiveItem>
  );
};

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
};

export type { SelectRootProps, SelectTriggerProps, SelectContentProps, SelectItemProps };
