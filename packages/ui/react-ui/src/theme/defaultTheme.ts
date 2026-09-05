//
// Copyright 2023 DXOS.org
//

import { type Theme } from '@dxos/ui-types';

import { avatarTheme } from '../components/Avatars/Avatar.theme';
import { bannerTheme } from '../components/Banner/Banner.theme';
import { breadcrumbTheme } from '../components/Breadcrumb/Breadcrumb.theme';
import { buttonTheme } from '../components/Button/Button.theme';
import { iconButtonTheme } from '../components/Button/IconButton.theme';
import { calendarTheme } from '../components/Calendar/Calendar.theme';
import { cardTheme } from '../components/Card/Card.theme';
import { collapsibleTheme } from '../components/Collapsible/Collapsible.theme';
import { columnTheme } from '../components/Column/Column.theme';
import { datePickerTheme } from '../components/DatePicker/DatePicker.theme';
import { dialogTheme } from '../components/Dialog/Dialog.theme';
import { editableTheme } from '../components/Editable/Editable.theme';
import { focusTheme } from '../components/Focus/Focus.theme';
import { iconTheme } from '../components/Icon/Icon.theme';
import { inputTheme } from '../components/Input/Input.theme';
import { linkTheme } from '../components/Link/Link.theme';
import { mainTheme } from '../components/Main/Main.theme';
import { menuTheme } from '../components/Menu/Menu.theme';
import { panelTheme } from '../components/Panel/Panel.theme';
import { popoverTheme } from '../components/Popover/Popover.theme';
import { progressTheme } from '../components/Progress/Progress.theme';
import { qrCodeTheme } from '../components/QrCode/QrCode.theme';
import { scrollAreaTheme } from '../components/ScrollArea/ScrollArea.theme';
import { selectTheme } from '../components/Select/Select.theme';
import { separatorTheme } from '../components/Separator/Separator.theme';
import { skeletonTheme } from '../components/Skeleton/Skeleton.theme';
import { sliderTheme } from '../components/Slider/Slider.theme';
import { splitterTheme } from '../components/Splitter/Splitter.theme';
import { stepperTheme } from '../components/Stepper/Stepper.theme';
import { tagTheme } from '../components/Tag/Tag.theme';
import { toastTheme } from '../components/Toast/Toast.theme';
import { toolbarTheme } from '../components/Toolbar/Toolbar.theme';
import { tooltipTheme } from '../components/Tooltip/Tooltip.theme';
import { bindTheme } from './bindTheme';

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
  collapsible: collapsibleTheme,
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
  qrCode: qrCodeTheme,
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
