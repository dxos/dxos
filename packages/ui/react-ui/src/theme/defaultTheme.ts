//
// Copyright 2023 DXOS.org
//

import { type Theme } from '@dxos/ui-types';

import { avatarTheme } from '../components/Avatars/Avatar.theme';
import { breadcrumbTheme } from '../components/Breadcrumb/Breadcrumb.theme';
import { buttonTheme } from '../components/Button/Button.theme';
import { iconButtonTheme } from '../components/Button/IconButton.theme';
import { calendarTheme } from '../components/Calendar/Calendar.theme';
import { cardTheme } from '../components/Card/Card.theme';
import { columnTheme } from '../components/Column/Column.theme';
import { datePickerTheme } from '../components/DatePicker/DatePicker.theme';
import { dialogTheme } from '../components/Dialog/Dialog.theme';
import { focusTheme } from '../components/Focus/Focus.theme';
import { iconTheme } from '../components/Icon/Icon.theme';
import { inputTheme } from '../components/Input/Input.theme';
import { linkTheme } from '../components/Link/Link.theme';
import { listTheme } from '../components/List/List.theme';
import { mainTheme } from '../components/Main/Main.theme';
import { menuTheme } from '../components/Menu/Menu.theme';
import { messageTheme } from '../components/Message/Message.theme';
import { panelTheme } from '../components/Panel/Panel.theme';
import { popoverTheme } from '../components/Popover/Popover.theme';
import { scrollAreaTheme } from '../components/ScrollArea/ScrollArea.theme';
import { selectTheme } from '../components/Select/Select.theme';
import { separatorTheme } from '../components/Separator/Separator.theme';
import { skeletonTheme } from '../components/Skeleton/Skeleton.theme';
import { splitterTheme } from '../components/Splitter/Splitter.theme';
import { statusTheme } from '../components/Status/Status.theme';
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
  datePicker: datePickerTheme,
  dialog: dialogTheme,
  focus: focusTheme,
  icon: iconTheme,
  iconButton: iconButtonTheme,
  input: inputTheme,
  link: linkTheme,
  list: listTheme,
  main: mainTheme,
  message: messageTheme,
  menu: menuTheme,
  popover: popoverTheme,
  scrollArea: scrollAreaTheme,
  select: selectTheme,
  separator: separatorTheme,
  skeleton: skeletonTheme,
  splitter: splitterTheme,
  status: statusTheme,
  tag: tagTheme,
  toast: toastTheme,
  toolbar: toolbarTheme,
  tooltip: tooltipTheme,
};

export const defaultTx = bindTheme(defaultTheme);
