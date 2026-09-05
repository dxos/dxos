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
  mx(orientation === 'vertical' ? 'h-full' : 'w-full', disabled && 'opacity-50 pointer-events-none', ...etc);

/** The box the machine positions the thumbs in; it is as tall (wide) as a thumb so `top-0` centres them on the track. */
const control: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx('flex items-center', orientation === 'vertical' ? 'h-full w-3 flex-col' : 'w-full h-3', ...etc);

const track: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'relative grow overflow-hidden rounded-full bg-input-surface',
    orientation === 'vertical' ? 'w-1 h-full' : 'h-1 w-full',
    ...etc,
  );

const range: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx('absolute bg-accent-bg', orientation === 'vertical' ? 'w-full' : 'h-full', ...etc);

const thumb: ComponentFunction<SliderStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'block h-3 w-3 shrink-0 rounded-full bg-base-surface border-2 border-accent-bg shadow-sm transition-colors dx-focus-ring',
    // The machine sets the along-axis offset and transform inline; the cross axis is ours.
    orientation === 'vertical' ? 'left-0' : 'top-0',
    'hover:bg-hover-surface',
    ...etc,
  );

export const sliderTheme: Theme<SliderStyleProps> = { root, control, track, range, thumb };
