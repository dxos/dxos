//
// Copyright 2026 DXOS.org
//

/** Metrics per size live in `theme/size.css`; parts only set `data-size`. */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const SIZES: Size[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * | Size | Block | Inset | Input height |
 * | xs   | 20px  | 1px   | 18px         |
 * | sm   | 24px  | 2px   | 20px         |
 * | md   | 32px  | 2px   | 28px         |
 * | lg   | 40px  | 3px   | 34px         |
 * | xl   | 48px  | 3px   | 42px         |
 */
