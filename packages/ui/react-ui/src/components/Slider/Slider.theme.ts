//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type SliderStyleProps = {
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
};

const root: ComponentFunction<SliderStyleProps> = ({ orientation, disabled }, ...etc) =>
  mx(
    'relative flex touch-none select-none items-center',
    orientation === 'vertical' ? 'h-full w-5 flex-col' : 'w-full h-5',
    disabled && 'opacity-50 pointer-events-none',
    ...etc,
  );

const track: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'relative grow overflow-hidden rounded-full bg-input-surface',
    orientation === 'vertical' ? 'w-1 h-full' : 'h-1 w-full',
    ...etc,
  );

const range: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx('absolute bg-accent-bg', orientation === 'vertical' ? 'w-full' : 'h-full', ...etc);

const thumb: ComponentFunction<SliderStyleProps> = (_props, ...etc) =>
  mx(
    'block is-4 bs-4 rounded-full bg-base-surface border border-separator shadow-sm transition-colors dx-focus-ring',
    'hover:bg-hover-surface',
    ...etc,
  );

export const sliderTheme: Theme<SliderStyleProps> = { root, track, range, thumb };
