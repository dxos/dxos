//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useRef } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import dxnsCenter from '../../../assets/backgrounds/bg-dxns-center.svg?raw';
import dxnsLeft from '../../../assets/backgrounds/bg-dxns-left.svg?raw';
import dxnsRight from '../../../assets/backgrounds/bg-dxns-right.svg?raw';
import dxos from '../../../assets/backgrounds/bg-dxos.svg?raw';
import echoCenter from '../../../assets/backgrounds/bg-echo-center.svg?raw';
import echoLeft from '../../../assets/backgrounds/bg-echo-left.svg?raw';
import echoRight from '../../../assets/backgrounds/bg-echo-right.svg?raw';
import haloCenter from '../../../assets/backgrounds/bg-halo-center.svg?raw';
import haloLeft from '../../../assets/backgrounds/bg-halo-left.svg?raw';
import haloRight from '../../../assets/backgrounds/bg-halo-right.svg?raw';
import kubeCenter from '../../../assets/backgrounds/bg-kube-center.svg?raw';
import kubeLeft from '../../../assets/backgrounds/bg-kube-left.svg?raw';
import kubeRight from '../../../assets/backgrounds/bg-kube-right.svg?raw';
import meshCenter from '../../../assets/backgrounds/bg-mesh-center.svg?raw';
import meshLeft from '../../../assets/backgrounds/bg-mesh-left.svg?raw';
import meshRight from '../../../assets/backgrounds/bg-mesh-right.svg?raw';
import plexCenter from '../../../assets/backgrounds/bg-plex-center.svg?raw';
import plexLeft from '../../../assets/backgrounds/bg-plex-left.svg?raw';
import plexRight from '../../../assets/backgrounds/bg-plex-right.svg?raw';
import tileCenter from '../../../assets/backgrounds/bg-tile-center.svg?raw';
import tileLeft from '../../../assets/backgrounds/bg-tile-left.svg?raw';
import tileRight from '../../../assets/backgrounds/bg-tile-right.svg?raw';

const PLACEMENTS = ['left', 'center', 'right'] as const;

type Placement = (typeof PLACEMENTS)[number];

// Each mark comes with its icon on the left, in the centre and on the right; DXOS is drawn centred only.
const marks: Record<string, Record<Placement, string>> = {
  dxns: { left: dxnsLeft, center: dxnsCenter, right: dxnsRight },
  echo: { left: echoLeft, center: echoCenter, right: echoRight },
  halo: { left: haloLeft, center: haloCenter, right: haloRight },
  kube: { left: kubeLeft, center: kubeCenter, right: kubeRight },
  mesh: { left: meshLeft, center: meshCenter, right: meshRight },
  plex: { left: plexLeft, center: plexCenter, right: plexRight },
  tile: { left: tileLeft, center: tileCenter, right: tileRight },
};

const backgrounds = (placements: readonly Placement[]): [string, string][] => [
  ['dxos', dxos],
  ...Object.entries(marks).flatMap(([name, files]) =>
    placements.map((placement): [string, string] => [`${name}-${placement}`, files[placement]]),
  ),
];

type BackgroundsProps = {
  lines?: string;
  icon?: string;
  fill?: string;
  /** The text color of each drawing, which its lines take where `lines` is not set. */
  color?: string;
  /** Reverts a tile to the file's default colors on hover. */
  hover?: boolean;
  /** Every mark at one placement, in a grid; without it, every file in a column. */
  placement?: Placement;
};

const Backgrounds = ({ lines, icon, fill, color, hover, placement }: BackgroundsProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // React's `style` prop has no type for custom properties, so the overrides are set imperatively.
  useLayoutEffect(() => {
    const style = rootRef.current?.style;
    if (!style) {
      return;
    }

    for (const [name, value] of [
      ['--dx-bg-lines', lines],
      ['--dx-bg-icon', icon],
      ['--dx-bg-fill', fill],
      ['--dx-bg-color', color],
    ] as const) {
      if (value) {
        style.setProperty(name, value);
      } else {
        style.removeProperty(name);
      }
    }
  }, [lines, icon, fill, color]);

  return (
    <div
      ref={rootRef}
      className={mx(
        'gap-4 p-4 overflow-auto',
        placement ? 'grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]' : 'flex flex-col',
      )}
    >
      {backgrounds(placement ? [placement] : PLACEMENTS).map(([name, svg]) => (
        <div key={name} className='flex flex-col gap-1'>
          <div
            className={mx(
              'aspect-video [&_svg_*]:transition-[stroke,fill] [&_svg_*]:duration-500',
              // A color set on the drawing itself replaces the default its `color` attribute carries.
              color && '[&_svg]:[color:var(--dx-bg-color)]',
              // `initial` makes each `var()` in the SVG fall back to its built-in default color.
              hover && 'hover:[--dx-bg-lines:initial] hover:[--dx-bg-icon:initial] hover:[--dx-bg-fill:initial]',
            )}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <span className='text-sm text-description'>{name}</span>
        </div>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/brand/components/Backgrounds',
  component: Backgrounds,
  decorators: [withTheme()],
  argTypes: {
    lines: { control: 'color' },
    icon: { control: 'color' },
    fill: { control: 'color' },
    color: { control: 'color' },
    placement: { control: 'inline-radio', options: PLACEMENTS },
  },
} satisfies Meta<typeof Backgrounds>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every mark at one placement, side by side. */
export const Grid: Story = {
  args: {
    placement: 'center',
  },
};

/** The lines take the drawing's text color, where no `--dx-bg-lines` is set. */
export const CurrentColor: Story = {
  args: {
    placement: 'center',
    color: '#f97316',
  },
};

export const Themed: Story = {
  args: {
    lines: '#3a3f44',
    fill: '#101214',
    hover: true,
  },
};
