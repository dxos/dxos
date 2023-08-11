//
// Copyright 2023 DXOS.org
//

import { CaretDown } from '@phosphor-icons/react';
// TODO(burdon): Clearer and less verbose to use `import *` across components?
import * as SelectPrimitive from '@radix-ui/react-select';
import React, { FunctionComponent } from 'react';

import { Density, Elevation } from '@dxos/aurora-types';

import { useDensityContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';

// https://www.radix-ui.com/themes/docs/components/select
// https://www.radix-ui.com/primitives/docs/components/select

type SelectRootProps = ThemedClassName<SelectPrimitive.SelectProps> & {
  variant?: 'default' | 'primary' | 'outline' | 'ghost'; // TODO(burdon): Export type.
  density?: Density;
  elevation?: Elevation; // TODO(burdon): ???
};

const SelectRoot: FunctionComponent<SelectRootProps> = ({ children, density: propsDensity, ...props }) => {
  const density = useDensityContext(propsDensity);
  return (
    <SelectPrimitive.Root {...props}>
      <DensityProvider density={density}>{children}</DensityProvider>
    </SelectPrimitive.Root>
  );
};

type SelectTriggerProps = SelectPrimitive.SelectTriggerProps;

const SelectTrigger: FunctionComponent<SelectTriggerProps> = ({ children, placeholder, ...props }) => {
  const { tx } = useThemeContext();
  const density = useDensityContext();
  return (
    <SelectPrimitive.Trigger
      {...props}
      className={tx('select.trigger', 'select', {
        disabled: props.disabled,
        density,
      })}
    >
      <div className='flex items-center'>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className='pis-2'>
          <CaretDown />
        </SelectPrimitive.Icon>
      </div>
    </SelectPrimitive.Trigger>
  );
};

type SelectContentProps = ThemedClassName<SelectPrimitive.SelectContentProps>;

// TODO(burdon): Make same width as trigger?
const SelectContent: FunctionComponent<SelectContentProps> = ({ children }) => {
  const { tx } = useThemeContext();
  return (
    <SelectPrimitive.Portal className={tx('select.content', 'content')}>
      <SelectPrimitive.Content className='z-[50]'>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

type SelectGroupProps = ThemedClassName<SelectPrimitive.SelectGroupProps>;

const SelectGroup: FunctionComponent<SelectGroupProps> = SelectPrimitive.Group;

type SelectItemProps = ThemedClassName<SelectPrimitive.SelectItemProps>;

// TODO(burdon): Add Check icon.
const SelectItem = ({ children, ...props }: SelectItemProps) => {
  return (
    <SelectPrimitive.Item {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
};

type SelectSeparatorProps = ThemedClassName<SelectPrimitive.SelectSeparatorProps>;

const SelectSeparator: FunctionComponent<SelectSeparatorProps> = SelectPrimitive.Separator;

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
