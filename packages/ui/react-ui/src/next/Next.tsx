//
// Copyright 2026 DXOS.org
//

import {
  Block as NextBlock,
  type BlockProps as NextBlockProps,
  Button as NextButton,
  type ButtonProps as NextButtonProps,
  type ButtonValence as NextButtonValence,
  type ButtonVariant as NextButtonVariant,
  Card as NextCard,
  Checkbox as NextCheckbox,
  type CheckboxProps as NextCheckboxProps,
  Collapsible as NextCollapsible,
  Combobox as NextCombobox,
  type ComboboxFilter as NextComboboxFilter,
  type ComboboxOption as NextComboboxOption,
  Container as NextContainer,
  type ContainerProps as NextContainerProps,
  DateInput as NextDateInput,
  type DateInputProps as NextDateInputProps,
  type DateInputType as NextDateInputType,
  Dialog as NextDialog,
  Field as NextField,
  FieldSet as NextFieldSet,
  Group as NextGroup,
  type GroupProps as NextGroupProps,
  type Gutter as NextGutter,
  Icon as NextIcon,
  type IconProps as NextIconProps,
  Image as NextImage,
  type ImageProps as NextImageProps,
  Input as NextInput,
  type InputProps as NextInputProps,
  Label as NextLabel,
  type LabelProps as NextLabelProps,
  type Level as NextLevel,
  Menu as NextMenu,
  Popover as NextPopover,
  ScrollArea as NextScrollArea,
  Select as NextSelect,
  type SelectOption as NextSelectOption,
  Separator as NextSeparator,
  type SeparatorProps as NextSeparatorProps,
  Switch as NextSwitch,
  type SwitchProps as NextSwitchProps,
  Tag as NextTag,
  type TagHue as NextTagHue,
  type TagProps as NextTagProps,
  Textarea as NextTextarea,
  type TextareaProps as NextTextareaProps,
  Toggle as NextToggle,
  type ToggleProps as NextToggleProps,
  Toolbar as NextToolbar,
  type ToolbarRootProps as NextToolbarRootProps,
  Tooltip as NextTooltip,
  Typography as NextTypography,
} from './components/index.ts';

/** Parallel namespace for the next primitives (decision 1); its rules ship separately as `@dxos/react-ui/next/theme.css`. */
export namespace Next {
  export const Container = NextContainer;
  export type ContainerProps = NextContainerProps;
  export type Gutter = NextGutter;
  export type Level = NextLevel;
  export const Block = NextBlock;
  export type BlockProps = NextBlockProps;
  export const ScrollArea = NextScrollArea;
  export const Toolbar = NextToolbar;
  export type ToolbarRootProps = NextToolbarRootProps;
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
  export type ButtonVariant = NextButtonVariant;
  export type ButtonValence = NextButtonValence;
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
  export const Card = NextCard;
  export const Collapsible = NextCollapsible;
  export const Menu = NextMenu;
  export const Tooltip = NextTooltip;
  export const Textarea = NextTextarea;
  export type TextareaProps = NextTextareaProps;
  export const DateInput = NextDateInput;
  export type DateInputProps = NextDateInputProps;
  export type DateInputType = NextDateInputType;
  export const Popover = NextPopover;
  export const Combobox = NextCombobox;
  export type ComboboxOption = NextComboboxOption;
  export type ComboboxFilter = NextComboboxFilter;
  export const Tag = NextTag;
  export type TagProps = NextTagProps;
  export type TagHue = NextTagHue;
  export const Toggle = NextToggle;
  export type ToggleProps = NextToggleProps;
  export const Separator = NextSeparator;
  export type SeparatorProps = NextSeparatorProps;
}
