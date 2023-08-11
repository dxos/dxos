//
// Copyright 2023 DXOS.org
//

import { CaretDown } from '@phosphor-icons/react';
// TODO(burdon): Clearer and less verbose if `import * as RadixSelect`?
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
  SelectGroup as SelectPrimitiveGroup,
  SelectGroupProps as SelectPrimitiveGroupProps,
  SelectSeparator as SelectPrimitiveSeparator,
  SelectSeparatorProps as SelectPrimitiveSeparatorProps,
} from '@radix-ui/react-select';
import React, { FunctionComponent } from 'react';

import { Density, Elevation } from '@dxos/aurora-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

// https://www.radix-ui.com/themes/docs/components/select
// https://www.radix-ui.com/primitives/docs/components/select

type SelectRootProps = ThemedClassName<SelectPrimitiveRootProps>;

const SelectRoot: FunctionComponent<SelectRootProps> = SelectPrimitiveRoot;

// TODO(burdon): Add placeholder.
type SelectTriggerProps = ThemedClassName<SelectPrimitiveTriggerProps> & {
  density?: Density;
  elevation?: Elevation;
};

// TODO(burdon): Style as button.
const SelectTrigger: FunctionComponent<SelectTriggerProps> = ({
  children,
  placeholder,
  density: propsDensity,
  elevation: propsElevation,
  ...props
}) => {
  const { tx } = useThemeContext();
  const elevation = useElevationContext(propsElevation);
  const density = useDensityContext(propsDensity);
  return (
    <SelectPrimitiveTrigger
      {...props}
      className={tx('select.root', 'select', { disabled: props.disabled, density, elevation })}
    >
      <div className='flex items-center'>
        <SelectPrimitiveValue placeholder={placeholder} />
        <SelectPrimitiveIcon className='pis-2'>
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

type SelectGroupProps = ThemedClassName<SelectPrimitiveGroupProps>;

const SelectGroup: FunctionComponent<SelectGroupProps> = SelectPrimitiveGroup;

type SelectItemProps = ThemedClassName<SelectPrimitiveItemProps>;

// TODO(burdon): Add Check icon.
const SelectItem = ({ children, ...props }: SelectItemProps) => {
  return (
    <SelectPrimitiveItem {...props}>
      <SelectPrimitiveItemText>{children}</SelectPrimitiveItemText>
    </SelectPrimitiveItem>
  );
};

type SelectSeparatorProps = ThemedClassName<SelectPrimitiveSeparatorProps>;

const SelectSeparator: FunctionComponent<SelectSeparatorProps> = SelectPrimitiveSeparator;

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Group: SelectGroup,
  Item: SelectItem,
  Separator: SelectSeparator,
};

export type {
  SelectRootProps,
  SelectTriggerProps,
  SelectContentProps,
  SelectGroupProps,
  SelectItemProps,
  SelectSeparatorProps,
};
