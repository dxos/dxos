//
// Copyright 2023 DXOS.org
//

import { type Theme } from '@dxos/ui-types';

import { avatarTheme } from '../components/Avatars/Avatar.theme.ts';
import { bannerTheme } from '../components/Banner/Banner.theme.ts';
import { breadcrumbTheme } from '../components/Breadcrumb/Breadcrumb.theme.ts';
import { buttonTheme } from '../components/Button/Button.theme.ts';
import { iconButtonTheme } from '../components/Button/IconButton.theme.ts';
import { calendarTheme } from '../components/Calendar/Calendar.theme.ts';
import { cardTheme } from '../components/Card/Card.theme.ts';
import { columnTheme } from '../components/Column/Column.theme.ts';
import { datePickerTheme } from '../components/DatePicker/DatePicker.theme.ts';
import { dialogTheme } from '../components/Dialog/Dialog.theme.ts';
import { editableTheme } from '../components/Editable/Editable.theme.ts';
import { focusTheme } from '../components/Focus/Focus.theme.ts';
import { iconTheme } from '../components/Icon/Icon.theme.ts';
import { inputTheme } from '../components/Input/Input.theme.ts';
import { linkTheme } from '../components/Link/Link.theme.ts';
import { mainTheme } from '../components/Main/Main.theme.ts';
import { menuTheme } from '../components/Menu/Menu.theme.ts';
import { panelTheme } from '../components/Panel/Panel.theme.ts';
import { popoverTheme } from '../components/Popover/Popover.theme.ts';
import { progressTheme } from '../components/Progress/Progress.theme.ts';
import { scrollAreaTheme } from '../components/ScrollArea/ScrollArea.theme.ts';
import { selectTheme } from '../components/Select/Select.theme.ts';
import { separatorTheme } from '../components/Separator/Separator.theme.ts';
import { skeletonTheme } from '../components/Skeleton/Skeleton.theme.ts';
import { sliderTheme } from '../components/Slider/Slider.theme.ts';
import { splitterTheme } from '../components/Splitter/Splitter.theme.ts';
import { stepperTheme } from '../components/Stepper/Stepper.theme.ts';
import { tagTheme } from '../components/Tag/Tag.theme.ts';
import { toastTheme } from '../components/Toast/Toast.theme.ts';
import { toolbarTheme } from '../components/Toolbar/Toolbar.theme.ts';
import { tooltipTheme } from '../components/Tooltip/Tooltip.theme.ts';
import { bindTheme } from './bindTheme.ts';

export const defaultTheme: Theme<Record<string, any>> = {
  themeName: () => 'default',

  //
  // Primitives
  //

  column: columnTheme,
  panel: panelTheme,

  //
  // Components
  //

  avatar: avatarTheme,
  breadcrumb: breadcrumbTheme,
  button: buttonTheme,
  calendar: calendarTheme,
  card: cardTheme,
  datePicker: datePickerTheme,
  dialog: dialogTheme,
  focus: focusTheme,
  icon: iconTheme,
  iconButton: iconButtonTheme,
  editable: editableTheme,
  input: inputTheme,
  link: linkTheme,
  main: mainTheme,
  banner: bannerTheme,
  menu: menuTheme,
  popover: popoverTheme,
  progress: progressTheme,
  scrollArea: scrollAreaTheme,
  select: selectTheme,
  separator: separatorTheme,
  skeleton: skeletonTheme,
  slider: sliderTheme,
  splitter: splitterTheme,
  stepper: stepperTheme,
  tag: tagTheme,
  toast: toastTheme,
  toolbar: toolbarTheme,
  tooltip: tooltipTheme,
};

export const defaultTx = bindTheme(defaultTheme);
