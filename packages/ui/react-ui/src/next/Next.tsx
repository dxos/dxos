//
// Copyright 2026 DXOS.org
//

import {
  Block as NextBlock,
  type BlockProps as NextBlockProps,
  Button as NextButton,
  type ButtonProps as NextButtonProps,
  Checkbox as NextCheckbox,
  type CheckboxProps as NextCheckboxProps,
  Container as NextContainer,
  type ContainerProps as NextContainerProps,
  Dialog as NextDialog,
  Field as NextField,
  FieldSet as NextFieldSet,
  Group as NextGroup,
  type GroupProps as NextGroupProps,
  type Gutter as NextGutter,
  Icon as NextIcon,
  IconButton as NextIconButton,
  type IconButtonProps as NextIconButtonProps,
  type IconProps as NextIconProps,
  Image as NextImage,
  type ImageProps as NextImageProps,
  Input as NextInput,
  type InputProps as NextInputProps,
  Label as NextLabel,
  type LabelProps as NextLabelProps,
  type Level as NextLevel,
  ScrollArea as NextScrollArea,
  Select as NextSelect,
  type SelectOption as NextSelectOption,
  Switch as NextSwitch,
  type SwitchProps as NextSwitchProps,
  Toolbar as NextToolbar,
  type ToolbarProps as NextToolbarProps,
  Typography as NextTypography,
} from './components/index.ts';

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
  export const Group = NextGroup;
  export type GroupProps = NextGroupProps;
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
  export const Dialog = NextDialog;
  export const Switch = NextSwitch;
  export type SwitchProps = NextSwitchProps;
  export const FieldSet = NextFieldSet;
  export const Image = NextImage;
  export type ImageProps = NextImageProps;
}
