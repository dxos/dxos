//
// Copyright 2026 DXOS.org
//

import {
  DIALOG_AUTOFOCUS_ATTRIBUTE as NEXT_DIALOG_AUTOFOCUS_ATTRIBUTE,
  AlertDialog as NextAlertDialog,
  Avatar as NextAvatar,
  type AvatarAnimation as NextAvatarAnimation,
  type AvatarHue as NextAvatarHue,
  type AvatarHueVariant as NextAvatarHueVariant,
  type AvatarRootProps as NextAvatarRootProps,
  type AvatarStatus as NextAvatarStatus,
  type AvatarVariant as NextAvatarVariant,
  Block as NextBlock,
  type BlockProps as NextBlockProps,
  Button as NextButton,
  type ButtonHue as NextButtonHue,
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
  type ContainerGap as NextContainerGap,
  type ContainerProps as NextContainerProps,
  DateInput as NextDateInput,
  type DateInputGranularity as NextDateInputGranularity,
  type DateInputProps as NextDateInputProps,
  type DateInputType as NextDateInputType,
  Dialog as NextDialog,
  DragHandle as NextDragHandle,
  type DragHandleProps as NextDragHandleProps,
  type DragMoveDirection as NextDragMoveDirection,
  DragPreview as NextDragPreview,
  DropIndicator as NextDropIndicator,
  Field as NextField,
  Fieldset as NextFieldset,
  type FieldValence as NextFieldValence,
  Group as NextGroup,
  type GroupProps as NextGroupProps,
  type Gutter as NextGutter,
  Icon as NextIcon,
  type IconHue as NextIconHue,
  type IconProps as NextIconProps,
  type IconValence as NextIconValence,
  Image as NextImage,
  type ImageProps as NextImageProps,
  Input as NextInput,
  type InputProps as NextInputProps,
  Label as NextLabel,
  type LabelProps as NextLabelProps,
  type Level as NextLevel,
  Listbox as NextListbox,
  type ListboxOption as NextListboxOption,
  type ListboxSelectionMode as NextListboxSelectionMode,
  Menu as NextMenu,
  type MenuOption as NextMenuOption,
  NumberInput as NextNumberInput,
  type NumberInputProps as NextNumberInputProps,
  Panel as NextPanel,
  type PanelRootProps as NextPanelRootProps,
  PasswordInput as NextPasswordInput,
  type PasswordInputProps as NextPasswordInputProps,
  PinInput as NextPinInput,
  type PinInputProps as NextPinInputProps,
  Popover as NextPopover,
  ScrollArea as NextScrollArea,
  Select as NextSelect,
  type SelectOption as NextSelectOption,
  Separator as NextSeparator,
  type SeparatorProps as NextSeparatorProps,
  Switch as NextSwitch,
  type SwitchProps as NextSwitchProps,
  SystemButton as NextSystemButton,
  type SystemButtonProps as NextSystemButtonProps,
  Tabs as NextTabs,
  type TabsOrientation as NextTabsOrientation,
  type TabsRootProps as NextTabsRootProps,
  type TabsSelectedVariant as NextTabsSelectedVariant,
  type TabsTriggerProps as NextTabsTriggerProps,
  Tag as NextTag,
  type TagHue as NextTagHue,
  type TagProps as NextTagProps,
  Textarea as NextTextarea,
  type TextareaProps as NextTextareaProps,
  TextTooltip as NextTextTooltip,
  type TextTooltipProps as NextTextTooltipProps,
  Toggle as NextToggle,
  ToggleGroup as NextToggleGroup,
  type ToggleProps as NextToggleProps,
  Toolbar as NextToolbar,
  type ToolbarRootProps as NextToolbarRootProps,
  Tooltip as NextTooltip,
  Typography as NextTypography,
  type TypographyProps as NextTypographyProps,
  dragScope as nextDragScope,
} from './components/index.ts';

/** Parallel namespace for the next primitives (decision 1); its rules ship separately as `@dxos/react-ui/next/theme.css`. */
export namespace Next {
  export const Container = NextContainer;
  export type ContainerProps = NextContainerProps;
  export type Gutter = NextGutter;
  export type ContainerGap = NextContainerGap;
  export type Level = NextLevel;
  export const Block = NextBlock;
  export type BlockProps = NextBlockProps;
  export const ScrollArea = NextScrollArea;
  export const Toolbar = NextToolbar;
  export type ToolbarRootProps = NextToolbarRootProps;
  export const Icon = NextIcon;
  export type IconHue = NextIconHue;
  export type IconProps = NextIconProps;
  export type IconValence = NextIconValence;
  export const Typography = NextTypography;
  export type TypographyProps = NextTypographyProps;
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
  export type ButtonHue = NextButtonHue;
  export const Field = NextField;
  export type FieldValence = NextFieldValence;
  export const Checkbox = NextCheckbox;
  export type CheckboxProps = NextCheckboxProps;
  export const Select = NextSelect;
  export type SelectOption = NextSelectOption;
  export const Dialog = NextDialog;
  export const DIALOG_AUTOFOCUS_ATTRIBUTE = NEXT_DIALOG_AUTOFOCUS_ATTRIBUTE;
  export const AlertDialog = NextAlertDialog;
  export const Switch = NextSwitch;
  export type SwitchProps = NextSwitchProps;
  export const SystemButton = NextSystemButton;
  export type SystemButtonProps = NextSystemButtonProps;
  export const Fieldset = NextFieldset;
  export const Image = NextImage;
  export type ImageProps = NextImageProps;
  export const Card = NextCard;
  export const DragHandle = NextDragHandle;
  export type DragHandleProps = NextDragHandleProps;
  export type DragMoveDirection = NextDragMoveDirection;
  export const DropIndicator = NextDropIndicator;
  export const DragPreview = NextDragPreview;
  export const dragScope = nextDragScope;
  export const Collapsible = NextCollapsible;
  export const Menu = NextMenu;
  export type MenuOption = NextMenuOption;
  export const Tooltip = NextTooltip;
  export const TextTooltip = NextTextTooltip;
  export type TextTooltipProps = NextTextTooltipProps;
  export const Textarea = NextTextarea;
  export type TextareaProps = NextTextareaProps;
  export const DateInput = NextDateInput;
  export type DateInputProps = NextDateInputProps;
  export type DateInputType = NextDateInputType;
  export type DateInputGranularity = NextDateInputGranularity;
  export const PinInput = NextPinInput;
  export type PinInputProps = NextPinInputProps;
  export const NumberInput = NextNumberInput;
  export type NumberInputProps = NextNumberInputProps;
  export const PasswordInput = NextPasswordInput;
  export type PasswordInputProps = NextPasswordInputProps;
  export const Popover = NextPopover;
  export const Combobox = NextCombobox;
  export type ComboboxOption = NextComboboxOption;
  export type ComboboxFilter = NextComboboxFilter;
  export const Tag = NextTag;
  export type TagProps = NextTagProps;
  export type TagHue = NextTagHue;
  export const Toggle = NextToggle;
  export type ToggleProps = NextToggleProps;
  export const ToggleGroup = NextToggleGroup;
  export const Listbox = NextListbox;
  export type ListboxOption = NextListboxOption;
  export type ListboxSelectionMode = NextListboxSelectionMode;
  export const Panel = NextPanel;
  export type PanelRootProps = NextPanelRootProps;
  export const Separator = NextSeparator;
  export type SeparatorProps = NextSeparatorProps;
  export const Avatar = NextAvatar;
  export type AvatarRootProps = NextAvatarRootProps;
  export type AvatarVariant = NextAvatarVariant;
  export type AvatarStatus = NextAvatarStatus;
  export type AvatarAnimation = NextAvatarAnimation;
  export type AvatarHue = NextAvatarHue;
  export type AvatarHueVariant = NextAvatarHueVariant;
  export const Tabs = NextTabs;
  export type TabsRootProps = NextTabsRootProps;
  export type TabsTriggerProps = NextTabsTriggerProps;
  export type TabsOrientation = NextTabsOrientation;
  export type TabsSelectedVariant = NextTabsSelectedVariant;
}
