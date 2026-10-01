//
// Copyright 2026 DXOS.org
//

import {
  DIALOG_AUTOFOCUS_ATTRIBUTE as NEXT_DIALOG_AUTOFOCUS_ATTRIBUTE,
  Accordion as NextAccordion,
  type AccordionItemContentProps as NextAccordionItemContentProps,
  type AccordionItemProps as NextAccordionItemProps,
  type AccordionItemTriggerProps as NextAccordionItemTriggerProps,
  type AccordionRootProps as NextAccordionRootProps,
  AlertDialog as NextAlertDialog,
  AttentionGlyph as NextAttentionGlyph,
  type AttentionGlyphPresence as NextAttentionGlyphPresence,
  type AttentionGlyphProps as NextAttentionGlyphProps,
  Avatar as NextAvatar,
  type AvatarAnimation as NextAvatarAnimation,
  type AvatarHue as NextAvatarHue,
  type AvatarHueVariant as NextAvatarHueVariant,
  type AvatarRootProps as NextAvatarRootProps,
  type AvatarStatus as NextAvatarStatus,
  type AvatarVariant as NextAvatarVariant,
  toAvatarHue as nextToAvatarHue,
  Banner as NextBanner,
  type BannerRootProps as NextBannerRootProps,
  Block as NextBlock,
  type BlockProps as NextBlockProps,
  Breadcrumb as NextBreadcrumb,
  type BreadcrumbCurrentProps as NextBreadcrumbCurrentProps,
  type BreadcrumbItemProps as NextBreadcrumbItemProps,
  type BreadcrumbLinkProps as NextBreadcrumbLinkProps,
  type BreadcrumbListProps as NextBreadcrumbListProps,
  type BreadcrumbRootProps as NextBreadcrumbRootProps,
  type BreadcrumbSeparatorProps as NextBreadcrumbSeparatorProps,
  Button as NextButton,
  type ButtonHue as NextButtonHue,
  type ButtonProps as NextButtonProps,
  type ButtonValence as NextButtonValence,
  type ButtonVariant as NextButtonVariant,
  Card as NextCard,
  Carousel as NextCarousel,
  type CarouselCaptionProps as NextCarouselCaptionProps,
  type CarouselIndicatorGroupProps as NextCarouselIndicatorGroupProps,
  type CarouselItemGroupProps as NextCarouselItemGroupProps,
  type CarouselItemProps as NextCarouselItemProps,
  type CarouselRootProps as NextCarouselRootProps,
  type CarouselTriggerProps as NextCarouselTriggerProps,
  Checkbox as NextCheckbox,
  type CheckboxProps as NextCheckboxProps,
  Collapsible as NextCollapsible,
  Combobox as NextCombobox,
  type ComboboxFilter as NextComboboxFilter,
  type ComboboxOption as NextComboboxOption,
  Container as NextContainer,
  type ContainerGap as NextContainerGap,
  type ContainerProps as NextContainerProps,
  ControlFrame as NextControlFrame,
  type ControlFrameProps as NextControlFrameProps,
  type ControlFrameVariant as NextControlFrameVariant,
  DateInput as NextDateInput,
  type DateInputGranularity as NextDateInputGranularity,
  type DateInputProps as NextDateInputProps,
  type DateInputType as NextDateInputType,
  Deferred as NextDeferred,
  type DeferredProps as NextDeferredProps,
  Dialog as NextDialog,
  DragHandle as NextDragHandle,
  type DragHandleProps as NextDragHandleProps,
  type DragMoveDirection as NextDragMoveDirection,
  DragPreview as NextDragPreview,
  DropIndicator as NextDropIndicator,
  Editable as NextEditable,
  type EditableActivation as NextEditableActivation,
  type EditableBlurBehavior as NextEditableBlurBehavior,
  type EditableInputProps as NextEditableInputProps,
  type EditablePreviewProps as NextEditablePreviewProps,
  type EditableRootProps as NextEditableRootProps,
  Empty as NextEmpty,
  type EmptyProps as NextEmptyProps,
  ErrorFallback as NextErrorFallback,
  type ErrorFallbackProps as NextErrorFallbackProps,
  ErrorStack as NextErrorStack,
  type ErrorStackFrame as NextErrorStackFrame,
  type ErrorStackProps as NextErrorStackProps,
  Field as NextField,
  Fieldset as NextFieldset,
  type FieldValence as NextFieldValence,
  FloatingPanel as NextFloatingPanel,
  type FloatingPanelBodyProps as NextFloatingPanelBodyProps,
  type FloatingPanelCloseTriggerProps as NextFloatingPanelCloseTriggerProps,
  type FloatingPanelContentProps as NextFloatingPanelContentProps,
  type FloatingPanelControlProps as NextFloatingPanelControlProps,
  type FloatingPanelDragTriggerProps as NextFloatingPanelDragTriggerProps,
  type FloatingPanelHeaderProps as NextFloatingPanelHeaderProps,
  type FloatingPanelPoint as NextFloatingPanelPoint,
  type FloatingPanelRootProps as NextFloatingPanelRootProps,
  type FloatingPanelSize as NextFloatingPanelSize,
  type FloatingPanelStage as NextFloatingPanelStage,
  type FloatingPanelStageTriggerProps as NextFloatingPanelStageTriggerProps,
  type FloatingPanelTitleProps as NextFloatingPanelTitleProps,
  type FloatingPanelTriggerProps as NextFloatingPanelTriggerProps,
  Focus as NextFocus,
  type FocusContextValue as NextFocusContextValue,
  type FocusGroupProps as NextFocusGroupProps,
  type FocusItemProps as NextFocusItemProps,
  type FocusState as NextFocusState,
  Group as NextGroup,
  type GroupProps as NextGroupProps,
  type Gutter as NextGutter,
  HoverCard as NextHoverCard,
  type HoverCardContentProps as NextHoverCardContentProps,
  type HoverCardRootProps as NextHoverCardRootProps,
  type HoverCardTriggerProps as NextHoverCardTriggerProps,
  Icon as NextIcon,
  type IconHue as NextIconHue,
  type IconProps as NextIconProps,
  type IconTone as NextIconTone,
  type IconValence as NextIconValence,
  Image as NextImage,
  type ImageProps as NextImageProps,
  Input as NextInput,
  type InputProps as NextInputProps,
  Label as NextLabel,
  type LabelProps as NextLabelProps,
  type Level as NextLevel,
  Link as NextLink,
  type LinkProps as NextLinkProps,
  type LinkVariant as NextLinkVariant,
  Listbox as NextListbox,
  type ListboxContext as NextListboxContext,
  type ListboxOption as NextListboxOption,
  type ListboxSelectionMode as NextListboxSelectionMode,
  Main as NextMain,
  MAIN_DRAWER_DEFAULT_HEIGHT as NextMAIN_DRAWER_DEFAULT_HEIGHT,
  MAIN_DRAWER_MAX_HEIGHT as NextMAIN_DRAWER_MAX_HEIGHT,
  MAIN_DRAWER_MIN_HEIGHT as NextMAIN_DRAWER_MIN_HEIGHT,
  type MainContentProps as NextMainContentProps,
  type MainDrawerState as NextMainDrawerState,
  type MainRootProps as NextMainRootProps,
  type MainSidebarState as NextMainSidebarState,
  MediaPlayer as NextMediaPlayer,
  type MediaPlayerFit as NextMediaPlayerFit,
  type MediaPlayerKind as NextMediaPlayerKind,
  type MediaPlayerProps as NextMediaPlayerProps,
  Menu as NextMenu,
  MenuButton as NextMenuButton,
  type MenuButtonItem as NextMenuButtonItem,
  type MenuButtonProps as NextMenuButtonProps,
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
  Progress as NextProgress,
  type ProgressProps as NextProgressProps,
  QrCode as NextQrCode,
  type QrCodeErrorCorrection as NextQrCodeErrorCorrection,
  type QrCodeProps as NextQrCodeProps,
  RowContext as NextRowContext,
  ScrollArea as NextScrollArea,
  ScrollContainer as NextScrollContainer,
  type ScrollContainerContentProps as NextScrollContainerContentProps,
  type ScrollContainerFadeProps as NextScrollContainerFadeProps,
  type ScrollContainerRootProps as NextScrollContainerRootProps,
  type ScrollContainerScrollDownButtonProps as NextScrollContainerScrollDownButtonProps,
  type ScrollContainerViewportProps as NextScrollContainerViewportProps,
  type ScrollController as NextScrollController,
  Select as NextSelect,
  type SelectOption as NextSelectOption,
  Separator as NextSeparator,
  type SeparatorProps as NextSeparatorProps,
  Skeleton as NextSkeleton,
  type SkeletonProps as NextSkeletonProps,
  type SkeletonVariant as NextSkeletonVariant,
  Slider as NextSlider,
  type SliderProps as NextSliderProps,
  type Span as NextSpan,
  Splitter as NextSplitter,
  type SplitterContext as NextSplitterContext,
  type SplitterMode as NextSplitterMode,
  type SplitterOrientation as NextSplitterOrientation,
  type SplitterRootProps as NextSplitterRootProps,
  type Step as NextStep,
  Steps as NextSteps,
  type StepsProps as NextStepsProps,
  type StepState as NextStepState,
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
  TextCrawl as NextTextCrawl,
  type TextCrawlProps as NextTextCrawlProps,
  TextTooltip as NextTextTooltip,
  type TextTooltipProps as NextTextTooltipProps,
  Timestamp as NextTimestamp,
  type TimestampProps as NextTimestampProps,
  Toast as NextToast,
  type ToastProviderProps as NextToastProviderProps,
  type ToastRootProps as NextToastRootProps,
  Toggle as NextToggle,
  ToggleGroup as NextToggleGroup,
  type ToggleProps as NextToggleProps,
  Toolbar as NextToolbar,
  type ToolbarRootProps as NextToolbarRootProps,
  Tooltip as NextTooltip,
  Tour as NextTour,
  type TourActionsProps as NextTourActionsProps,
  type TourActionTriggerProps as NextTourActionTriggerProps,
  type TourCloseTriggerProps as NextTourCloseTriggerProps,
  type TourContentProps as NextTourContentProps,
  type TourControlProps as NextTourControlProps,
  type TourDescriptionProps as NextTourDescriptionProps,
  type TourHeaderProps as NextTourHeaderProps,
  type TourProgressTextProps as NextTourProgressTextProps,
  type TourRootProps as NextTourRootProps,
  type TourStepAction as NextTourStepAction,
  type TourStepDetails as NextTourStepDetails,
  type TourStepPlacement as NextTourStepPlacement,
  type TourTitleProps as NextTourTitleProps,
  Typography as NextTypography,
  type TypographyProps as NextTypographyProps,
  type TypographyTone as NextTypographyTone,
  type UseEditableOptions as NextUseEditableOptions,
  type UseEditableReturn as NextUseEditableReturn,
  type UseTourProps as NextUseTourProps,
  type UseTourReturn as NextUseTourReturn,
  type VirtualAnchorPositioning as NextVirtualAnchorPositioning,
  type VirtualMode as NextVirtualMode,
  VirtualSpacer as NextVirtualSpacer,
  dragScope as nextDragScope,
  useEditable as nextUseEditable,
  useFocus as nextUseFocus,
  useMainSidebars as nextUseMainSidebars,
  useTour as nextUseTour,
  useTourContext as nextUseTourContext,
  useVirtualAnchor as nextUseVirtualAnchor,
  useVirtualRows as nextUseVirtualRows,
  virtualAnchor as nextVirtualAnchor,
} from './components/index.ts';
import {
  useIosKeyboard as nextUseIosKeyboard,
  usePlatform as nextUsePlatform,
  useThemeMode as nextUseThemeMode,
} from './hooks.ts';

/** Parallel namespace for the next primitives (decision 1); its rules ship separately as `@dxos/react-ui/next/theme.css`. */
export namespace Next {
  export const Container = NextContainer;
  export type ContainerProps = NextContainerProps;
  export type Gutter = NextGutter;
  export type ContainerGap = NextContainerGap;
  export type Span = NextSpan;
  export type Level = NextLevel;
  export const Block = NextBlock;
  export type BlockProps = NextBlockProps;
  export const ScrollArea = NextScrollArea;
  export const Toolbar = NextToolbar;
  export type ToolbarRootProps = NextToolbarRootProps;
  export const Icon = NextIcon;
  export type IconHue = NextIconHue;
  export type IconProps = NextIconProps;
  export type IconTone = NextIconTone;
  export type IconValence = NextIconValence;
  export const Typography = NextTypography;
  export type TypographyProps = NextTypographyProps;
  export type TypographyTone = NextTypographyTone;
  export const Group = NextGroup;
  export type GroupProps = NextGroupProps;
  export const Label = NextLabel;
  export type LabelProps = NextLabelProps;
  export const Input = NextInput;
  export const ControlFrame = NextControlFrame;
  export type ControlFrameProps = NextControlFrameProps;
  export type ControlFrameVariant = NextControlFrameVariant;
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
  export const Banner = NextBanner;
  export type BannerRootProps = NextBannerRootProps;
  export const Empty = NextEmpty;
  export type EmptyProps = NextEmptyProps;
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
  export type ListboxContext = NextListboxContext;
  export type ListboxSelectionMode = NextListboxSelectionMode;
  export type VirtualMode = NextVirtualMode;
  export const useVirtualRows = nextUseVirtualRows;
  export const useThemeMode = nextUseThemeMode;
  export const usePlatform = nextUsePlatform;
  export const useIosKeyboard = nextUseIosKeyboard;
  export const VirtualSpacer = NextVirtualSpacer;
  export const RowContext = NextRowContext;
  export const Panel = NextPanel;
  export type PanelRootProps = NextPanelRootProps;
  export const Separator = NextSeparator;
  export type SeparatorProps = NextSeparatorProps;
  export const virtualAnchor = nextVirtualAnchor;
  export const useVirtualAnchor = nextUseVirtualAnchor;
  export type VirtualAnchorPositioning = NextVirtualAnchorPositioning;
  export const Avatar = NextAvatar;
  export type AvatarRootProps = NextAvatarRootProps;
  export type AvatarVariant = NextAvatarVariant;
  export type AvatarStatus = NextAvatarStatus;
  export type AvatarAnimation = NextAvatarAnimation;
  export type AvatarHue = NextAvatarHue;
  export type AvatarHueVariant = NextAvatarHueVariant;
  export const toAvatarHue = nextToAvatarHue;
  export const Tabs = NextTabs;
  export type TabsRootProps = NextTabsRootProps;
  export type TabsTriggerProps = NextTabsTriggerProps;
  export type TabsOrientation = NextTabsOrientation;
  export type TabsSelectedVariant = NextTabsSelectedVariant;
  export const Progress = NextProgress;
  export type ProgressProps = NextProgressProps;
  export const Splitter = NextSplitter;
  export type SplitterRootProps = NextSplitterRootProps;
  export type SplitterMode = NextSplitterMode;
  export type SplitterContext = NextSplitterContext;
  export type SplitterOrientation = NextSplitterOrientation;
  export const Toast = NextToast;
  export type ToastRootProps = NextToastRootProps;
  export type ToastProviderProps = NextToastProviderProps;
  export const Main = NextMain;
  export const MAIN_DRAWER_DEFAULT_HEIGHT = NextMAIN_DRAWER_DEFAULT_HEIGHT;
  export const MAIN_DRAWER_MAX_HEIGHT = NextMAIN_DRAWER_MAX_HEIGHT;
  export const MAIN_DRAWER_MIN_HEIGHT = NextMAIN_DRAWER_MIN_HEIGHT;
  export const useMainSidebars = nextUseMainSidebars;
  export type MainRootProps = NextMainRootProps;
  export type MainContentProps = NextMainContentProps;
  export type MainSidebarState = NextMainSidebarState;
  export type MainDrawerState = NextMainDrawerState;
  export const ErrorFallback = NextErrorFallback;
  export const ErrorStack = NextErrorStack;
  export type ErrorFallbackProps = NextErrorFallbackProps;
  export type ErrorStackFrame = NextErrorStackFrame;
  export type ErrorStackProps = NextErrorStackProps;
  export const Focus = NextFocus;
  export const useFocus = nextUseFocus;
  export type FocusGroupProps = NextFocusGroupProps;
  export type FocusItemProps = NextFocusItemProps;
  export type FocusState = NextFocusState;
  export type FocusContextValue = NextFocusContextValue;
  export const ScrollContainer = NextScrollContainer;
  export type ScrollContainerContentProps = NextScrollContainerContentProps;
  export type ScrollContainerFadeProps = NextScrollContainerFadeProps;
  export type ScrollContainerRootProps = NextScrollContainerRootProps;
  export type ScrollContainerScrollDownButtonProps = NextScrollContainerScrollDownButtonProps;
  export type ScrollContainerViewportProps = NextScrollContainerViewportProps;
  export type ScrollController = NextScrollController;
  export const Carousel = NextCarousel;
  export type CarouselRootProps = NextCarouselRootProps;
  export type CarouselItemGroupProps = NextCarouselItemGroupProps;
  export type CarouselItemProps = NextCarouselItemProps;
  export type CarouselTriggerProps = NextCarouselTriggerProps;
  export type CarouselIndicatorGroupProps = NextCarouselIndicatorGroupProps;
  export type CarouselCaptionProps = NextCarouselCaptionProps;
  export const MediaPlayer = NextMediaPlayer;
  export type MediaPlayerProps = NextMediaPlayerProps;
  export type MediaPlayerFit = NextMediaPlayerFit;
  export type MediaPlayerKind = NextMediaPlayerKind;
  export const QrCode = NextQrCode;
  export type QrCodeProps = NextQrCodeProps;
  export type QrCodeErrorCorrection = NextQrCodeErrorCorrection;
  export const Timestamp = NextTimestamp;
  export type TimestampProps = NextTimestampProps;
  export const Tour = NextTour;
  export const useTour = nextUseTour;
  export const useTourContext = nextUseTourContext;
  export type TourActionTriggerProps = NextTourActionTriggerProps;
  export type TourActionsProps = NextTourActionsProps;
  export type TourCloseTriggerProps = NextTourCloseTriggerProps;
  export type TourContentProps = NextTourContentProps;
  export type TourControlProps = NextTourControlProps;
  export type TourDescriptionProps = NextTourDescriptionProps;
  export type TourHeaderProps = NextTourHeaderProps;
  export type TourProgressTextProps = NextTourProgressTextProps;
  export type TourRootProps = NextTourRootProps;
  export type TourStepAction = NextTourStepAction;
  export type TourStepDetails = NextTourStepDetails;
  export type TourStepPlacement = NextTourStepPlacement;
  export type TourTitleProps = NextTourTitleProps;
  export type UseTourProps = NextUseTourProps;
  export type UseTourReturn = NextUseTourReturn;
  export const Editable = NextEditable;
  export const useEditable = nextUseEditable;
  export type EditableRootProps = NextEditableRootProps;
  export type EditablePreviewProps = NextEditablePreviewProps;
  export type EditableInputProps = NextEditableInputProps;
  export type EditableActivation = NextEditableActivation;
  export type EditableBlurBehavior = NextEditableBlurBehavior;
  export type UseEditableOptions = NextUseEditableOptions;
  export type UseEditableReturn = NextUseEditableReturn;
  export const HoverCard = NextHoverCard;
  export type HoverCardContentProps = NextHoverCardContentProps;
  export type HoverCardRootProps = NextHoverCardRootProps;
  export type HoverCardTriggerProps = NextHoverCardTriggerProps;
  export const MenuButton = NextMenuButton;
  export type MenuButtonItem = NextMenuButtonItem;
  export type MenuButtonProps = NextMenuButtonProps;
  export const Slider = NextSlider;
  export type SliderProps = NextSliderProps;
  export const Steps = NextSteps;
  export type Step = NextStep;
  export type StepState = NextStepState;
  export type StepsProps = NextStepsProps;
  export const TextCrawl = NextTextCrawl;
  export type TextCrawlProps = NextTextCrawlProps;
  export const Accordion = NextAccordion;
  export type AccordionItemContentProps = NextAccordionItemContentProps;
  export type AccordionItemProps = NextAccordionItemProps;
  export type AccordionItemTriggerProps = NextAccordionItemTriggerProps;
  export type AccordionRootProps = NextAccordionRootProps;
  export const Link = NextLink;
  export type LinkProps = NextLinkProps;
  export type LinkVariant = NextLinkVariant;
  export const Skeleton = NextSkeleton;
  export type SkeletonProps = NextSkeletonProps;
  export type SkeletonVariant = NextSkeletonVariant;
  export const Deferred = NextDeferred;
  export type DeferredProps = NextDeferredProps;
  export const FloatingPanel = NextFloatingPanel;
  export type FloatingPanelBodyProps = NextFloatingPanelBodyProps;
  export type FloatingPanelCloseTriggerProps = NextFloatingPanelCloseTriggerProps;
  export type FloatingPanelContentProps = NextFloatingPanelContentProps;
  export type FloatingPanelControlProps = NextFloatingPanelControlProps;
  export type FloatingPanelDragTriggerProps = NextFloatingPanelDragTriggerProps;
  export type FloatingPanelHeaderProps = NextFloatingPanelHeaderProps;
  export type FloatingPanelPoint = NextFloatingPanelPoint;
  export type FloatingPanelRootProps = NextFloatingPanelRootProps;
  export type FloatingPanelSize = NextFloatingPanelSize;
  export type FloatingPanelStage = NextFloatingPanelStage;
  export type FloatingPanelStageTriggerProps = NextFloatingPanelStageTriggerProps;
  export type FloatingPanelTitleProps = NextFloatingPanelTitleProps;
  export type FloatingPanelTriggerProps = NextFloatingPanelTriggerProps;
  export const AttentionGlyph = NextAttentionGlyph;
  export type AttentionGlyphProps = NextAttentionGlyphProps;
  export type AttentionGlyphPresence = NextAttentionGlyphPresence;
  export const Breadcrumb = NextBreadcrumb;
  export type BreadcrumbRootProps = NextBreadcrumbRootProps;
  export type BreadcrumbListProps = NextBreadcrumbListProps;
  export type BreadcrumbItemProps = NextBreadcrumbItemProps;
  export type BreadcrumbLinkProps = NextBreadcrumbLinkProps;
  export type BreadcrumbCurrentProps = NextBreadcrumbCurrentProps;
  export type BreadcrumbSeparatorProps = NextBreadcrumbSeparatorProps;
}
