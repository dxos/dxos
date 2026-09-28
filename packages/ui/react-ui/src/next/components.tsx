//
// Copyright 2026 DXOS.org
//

import { Checkbox as NextCheckbox, type CheckboxProps as NextCheckboxProps } from './Checkbox.tsx';
import {
  Block as NextBlock,
  type BlockProps as NextBlockProps,
  Container as NextContainer,
  type ContainerProps as NextContainerProps,
  type Gutter as NextGutter,
  type Level as NextLevel,
} from './Container.tsx';
import { Field as NextField } from './Field.tsx';
import {
  Button as NextButton,
  type ButtonProps as NextButtonProps,
  Icon as NextIcon,
  IconButton as NextIconButton,
  type IconButtonProps as NextIconButtonProps,
  type IconProps as NextIconProps,
  Input as NextInput,
  type InputProps as NextInputProps,
  Label as NextLabel,
  type LabelProps as NextLabelProps,
  Typography as NextTypography,
} from './primitives.tsx';
import { ScrollArea as NextScrollArea } from './ScrollArea.tsx';
import { Select as NextSelect, type SelectOption as NextSelectOption } from './Select.tsx';
import { Toolbar as NextToolbar, type ToolbarProps as NextToolbarProps } from './Toolbar.tsx';

/** Parallel namespace for the next primitives (decision 1); stories load `theme/index.css` for their rules. */
export namespace Next {
  export const Container = NextContainer;
  export type ContainerProps = NextContainerProps;
  export type Gutter = NextGutter;
  export type Level = NextLevel;
  export const Block = NextBlock;
  export type BlockProps = NextBlockProps;
  export const ScrollArea = NextScrollArea;
  export const Toolbar = NextToolbar;
  export type ToolbarProps = NextToolbarProps;
  export const Icon = NextIcon;
  export type IconProps = NextIconProps;
  export const Typography = NextTypography;
  export const Label = NextLabel;
  export type LabelProps = NextLabelProps;
  export const Input = NextInput;
  export type InputProps = NextInputProps;
  export const Button = NextButton;
  export type ButtonProps = NextButtonProps;
  export const IconButton = NextIconButton;
  export type IconButtonProps = NextIconButtonProps;
  export const Field = NextField;
  export const Checkbox = NextCheckbox;
  export type CheckboxProps = NextCheckboxProps;
  export const Select = NextSelect;
  export type SelectOption = NextSelectOption;
}
