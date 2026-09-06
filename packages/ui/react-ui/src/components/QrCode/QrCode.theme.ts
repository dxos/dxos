//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type QrCodeStyleProps = {};

const root: ComponentFunction<QrCodeStyleProps> = (_props, ...etc) => mx('inline-block w-full aspect-square', ...etc);

const frame: ComponentFunction<QrCodeStyleProps> = (_props, ...etc) => mx('dx-fill', ...etc);

// The pattern inherits the text colour, so a code reads on any surface without a fill of its own.
const pattern: ComponentFunction<QrCodeStyleProps> = (_props, ...etc) => mx('fill-current', ...etc);

export const qrCodeTheme: Theme<QrCodeStyleProps> = {
  root,
  frame,
  pattern,
};
