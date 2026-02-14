//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

/**
 * Padding variants:
 * - xs: Default padding for inputs, forms, etc.
 * - sm: Padding for cards.
 * - lg: Padding for dialogs.
 */
export type ColumnPadding = 'xs' | 'sm' | 'lg';

export type ColumnStyleProps = {
  variant?: ColumnPadding;
};

// TODO(burdon): Remove these TW types and just define here.
const padding: Record<ColumnPadding, string> = {
  xs: 'pli-2',
  sm: 'pli-3',
  lg: 'pli-6',
};

const containerColumn: ComponentFunction<ColumnStyleProps> = ({ variant }, ...etc) =>
  mx(variant && padding[variant], ...etc);

export const containerTheme = {
  column: containerColumn,
};
