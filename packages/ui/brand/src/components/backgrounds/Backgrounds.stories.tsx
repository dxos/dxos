//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useRef } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import dxns from '../../../assets/backgrounds/bg-dxns.svg?raw';
import dxos from '../../../assets/backgrounds/bg-dxos.svg?raw';
import echo from '../../../assets/backgrounds/bg-echo.svg?raw';
import halo from '../../../assets/backgrounds/bg-halo.svg?raw';
import kube from '../../../assets/backgrounds/bg-kube.svg?raw';
import mesh from '../../../assets/backgrounds/bg-mesh.svg?raw';

const backgrounds: Record<string, string> = { dxos, dxns, echo, halo, kube, mesh };

type BackgroundsProps = {
  lines?: string;
  icon?: string;
  fill?: string;
  /** Reverts a tile to the file's default colors on hover. */
  hover?: boolean;
};

const Backgrounds = ({ lines, icon, fill, hover }: BackgroundsProps) => {
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
    ] as const) {
      if (value) {
        style.setProperty(name, value);
      } else {
        style.removeProperty(name);
      }
    }
  }, [lines, icon, fill]);

  return (
    <div ref={rootRef} className='flex flex-col gap-4 p-4 overflow-auto'>
      {Object.entries(backgrounds).map(([name, svg]) => (
        <div key={name} className='flex flex-col gap-1'>
          <div
            className={mx(
              'aspect-video [&_svg_*]:transition-[stroke,fill] [&_svg_*]:duration-500',
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
  },
} satisfies Meta<typeof Backgrounds>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Themed: Story = {
  args: {
    lines: '#3a3f44',
    fill: '#101214',
    hover: true,
  },
};
