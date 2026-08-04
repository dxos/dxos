//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useLayoutEffect, useRef } from 'react';

import { type ThemedClassName, useElevationContext } from '@dxos/react-ui';
import { mx, surfaceZIndex } from '@dxos/ui-theme';

import { type Side, type Size } from '../types';

// Kept out of `ResizeHandle.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const RESIZE_SUBJECT = 'data-dx-resize-subject';

export const resizeAttributes = {
  [RESIZE_SUBJECT]: true,
};
