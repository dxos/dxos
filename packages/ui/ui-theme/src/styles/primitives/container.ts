//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

/**
 * Padding variants:
 * - sm: Default padding for inputs, forms, etc.
 * - md: Padding for cards.
 * - lg: Padding for dialogs.
 */
export type ColumnPadding = 'sm' | 'md' | 'lg';

export type ColumnStyleProps = {
  variant?: ColumnPadding;
};

// TODO(burdon): Remove these TW types and just define here.
const padding: Record<ColumnPadding, string> = {
  sm: 'px-2',
  md: 'px-3',
  lg: 'px-6',
};

const containerColumn: ComponentFunction<ColumnStyleProps> = ({ variant }, ...etc) =>
  mx(variant && padding[variant], ...etc);

export const containerTheme = {
  column: containerColumn,
};
