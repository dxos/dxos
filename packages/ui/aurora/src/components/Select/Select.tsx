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
  SelectViewport as SelectPrimitiveViewport,
} from '@radix-ui/react-select';
import React, { FunctionComponent } from 'react';

import { mx } from '@dxos/aurora-theme';
import { Density, Elevation } from '@dxos/aurora-types';

import { useDensityContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { DensityProvider } from '../DensityProvider';

// https://www.radix-ui.com/themes/docs/components/select
// https://www.radix-ui.com/primitives/docs/components/select

type SelectRootProps = ThemedClassName<SelectPrimitiveRootProps> & {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  density?: Density;
  elevation?: Elevation;
};

const SelectRoot: FunctionComponent<SelectRootProps> = ({ children, density: propsDensity, ...props }) => {
  const density = useDensityContext(propsDensity);
  return (
    <SelectPrimitiveRoot {...props}>
      <DensityProvider density={density}>{children}</DensityProvider>
    </SelectPrimitiveRoot>
  );
};

const SelectTrigger: FunctionComponent<SelectPrimitiveTriggerProps> = ({ children, placeholder, ...props }) => {
  const { tx } = useThemeContext();
  // const elevation = useElevationContext(propsElevation);
  const density = useDensityContext();
  return (
    <SelectPrimitiveTrigger
      {...props}
      className={tx('select.trigger', 'select', {
        disabled: props.disabled,
        density,
      })}
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

// TODO(burdon): Make same width as trigger?
const SelectContent: FunctionComponent<SelectContentProps> = ({ children }) => {
  const { tx } = useThemeContext();
  return (
    <SelectPrimitivePortal className={tx('select.content', 'content')}>
      <SelectPrimitiveContent className={mx('z-[50]')}>
        <SelectPrimitiveViewport>{children}</SelectPrimitiveViewport>
      </SelectPrimitiveContent>
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
  // SelectTriggerProps,
  SelectContentProps,
  SelectGroupProps,
  SelectItemProps,
  SelectSeparatorProps,
};
