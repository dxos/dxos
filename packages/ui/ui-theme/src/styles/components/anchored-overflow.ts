//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type AnchoredOverflowStyleProps = {};

export const anchoredOverflowRoot: ComponentFunction<AnchoredOverflowStyleProps> = (_props, ...etc) =>
  mx('overflow-anchored overflow-auto', ...etc);

export const anchoredOverflowAnchor: ComponentFunction<AnchoredOverflowStyleProps> = (_props, ...etc) =>
  mx('overflow-anchor is-px bs-px', ...etc);

export const anchoredOverflowTheme: Theme<AnchoredOverflowStyleProps> = {
  root: anchoredOverflowRoot,
  anchor: anchoredOverflowAnchor,
};
