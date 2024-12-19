//
// Copyright 2024 DXOS.org
//

import type { PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type ShapeKind, type ShapeType } from '../../../graph';

export type BaseShapeProps<K extends ShapeKind> = PropsWithChildren<
  ThemedClassName<{
    shape: ShapeType<K>;
    scale: number;
    selected?: boolean;
    onSelect?: (id: string, shift: boolean) => void;
  }>
>;
