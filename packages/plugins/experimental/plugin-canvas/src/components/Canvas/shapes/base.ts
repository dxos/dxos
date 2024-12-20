//
// Copyright 2024 DXOS.org
//

import type { PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type BaseShape } from '../../../types';

/**
 * Runtime representations of shape.
 */
// TODO(burdon): Rename.
export type BaseShapeProps<S extends BaseShape> = PropsWithChildren<
  ThemedClassName<{
    shape: S;
    scale: number;
    guide?: boolean;
    selected?: boolean;
    onSelect?: (id: string, shift: boolean) => void;
  }>
>;
