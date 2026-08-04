//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { URI } from '@dxos/keys';
import { Card, Icon, IconButton } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { type XmlWidgetProps } from '@dxos/ui-editor';

// Kept out of `PreviewComponent.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

const HEIGHT_PATTERN = /^(.*)\|(\d+)$/;

export const parseEmbedLabel = (alt: string): { baseLabel: string; height?: number } => {
  const match = HEIGHT_PATTERN.exec(alt ?? '');
  if (match) {
    const height = Number.parseInt(match[2], 10);
    if (Number.isFinite(height) && height > 0) {
      return { baseLabel: match[1], height };
    }
  }
  return { baseLabel: alt ?? '' };
};
