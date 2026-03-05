//
// Copyright 2022 DXOS.org
//

import '@fontsource/k2d/100-italic.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { arc } from 'd3';
import React, { useRef, useState } from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { DXOS } from '../icons';

import { type AnimationController, ComposerLogo, ComposerSpinner } from './experimental';

// import ident from '../../../assets/sounds/ident-1.mp3';

// https://pixabay.com/sound-effects/search/logo/?pagi=2

const meta = {
  title: 'ui/brand/experimental/Logo',
  component: ComposerLogo,
  decorators: [withTheme()],
} satisfies Meta<typeof ComposerLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): Get from theme?
const colors = {
  gray: '#888888',
  purple: '#AA23D3',
  orange: '#CA6346',
  green: '#4DA676',
  blue: '#539ACD',
};

export const Default: Story = {
  render: () => {
    const controller = useRef<AnimationController>(null);
    const [logo, setLogo] = useState(false);
    const handleSpin = async () => {
      // const audio = new Audio(ident);
      // await audio.play();
      setTimeout(() => {
        setLogo(true);
      }, 1_500);

      controller.current?.spin();
    };

    return (
      <div className='absolute flex inset-0 items-center justify-center'>
        <div className='absolute left-4 top-4'>
          <Button onClick={handleSpin}>Spin</Button>
        </div>

        <div>
          <div className='flex justify-center'>
            <ComposerLogo ref={controller} size={256} />
          </div>

          <div className={mx('transition opacity-0 duration-1000', logo && 'opacity-100')}>
            <div className={mx('text-[100px] text-teal-400 font-[k2d] italic')}>composer</div>
            <div className={mx('flex items-center -mt-[20px] text-neutral-700')}>
              <span className='ml-[210px] mt-[2px] mr-2'>Powered by DXOS</span>
              <div>
                <DXOS className='w-[32px] h-[32px]' />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const Colors: Story = {
  render: () => {
    const colors = [
      ['fill-teal-400', 'fill-teal-500', 'fill-teal-600'],
      ['fill-orange-400', 'fill-orange-500', 'fill-orange-600'],
      ['fill-cyan-400', 'fill-cyan-500', 'fill-cyan-600'],
      ['fill-purple-400', 'fill-purple-500', 'fill-purple-600'],
      ['fill-blue-500', 'fill-blue-600', 'fill-blue-700'],
      ['fill-slate-500', 'fill-slate-600', 'fill-slate-700'],
      ['fill-blue-500', 'fill-neutral-100', 'fill-red-500'],
      ['fill-stone-400', 'fill-stone-500', 'fill-stone-600'],
      ['fill-neutral-500', 'fill-neutral-600', 'fill-neutral-700'],
    ];

    return (
      <div className='absolute inset-0 flex justify-center items-center'>
        <div className='grid grid-cols-3 gap-20 w-[800px]'>
          {colors.map((classNames, i) => (
            <div key={i} className='flex justify-center items-center'>
              <ComposerLogo animate={false} size={160} classNames={classNames} />
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Pacman: Story = {
  render: () => {
    return (
      <div className='absolute inset-0 flex flex-col justify-center'>
        <div className='flex flex-col'>
          <div className='flex items-center p-4'>
            <div className='flex ml-8 mr-[100px]'>
              <div>
                <Icon icon='ph--ghost--duotone' classNames='w-[180px] h-[180px] text-blue-500' />
              </div>
              <div>
                <Icon icon='ph--ghost--duotone' classNames='w-[180px] h-[180px] text-purple-500' />
              </div>
              <div>
                <Icon icon='ph--ghost--duotone' classNames='w-[180px] h-[180px] text-red-500' />
              </div>
            </div>

            <ComposerLogo size={145} classNames={['fill-yellow-200', 'fill-yellow-300', 'fill-yellow-400']} />

            <div className='flex -ml-10'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='p-4'>
                  <Icon icon='ph--square--duotone' classNames='w-6 h-6 text-yellow-200' />
                </div>
              ))}
            </div>
          </div>

          <div className='flex justify-center font-mono font-light text-[60px] mt-8 text-neutral-200'>
            <div>Ready Player 1</div>
          </div>
        </div>
      </div>
    );
  },
};

const SpinnerContainer = () => {
  const [spinning, setSpinning] = useState(false);
  return (
    <div>
      <div className='absolute left-4 top-4'>
        {(spinning && <Button onClick={() => setSpinning(false)}>Stop</Button>) || (
          <Button onClick={() => setSpinning(true)}>Start</Button>
        )}
      </div>
      <div className='grid grid-cols-3 gap-20'>
        <>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.blue} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.green} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.orange} />
          </div>
        </>
        <>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={200} color={colors.blue} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={100} color={colors.green} />
          </div>
          <div className='flex justify-center items-center'>
            <ComposerSpinner animate={spinning} gap={1} size={40} color={colors.orange} />
          </div>
        </>
      </div>
    </div>
  );
};

export const Spinner: Story = {
  render: () => {
    return (
      <div className='absolute inset-0 flex items-center justify-center'>
        <SpinnerContainer />
      </div>
    );
  },
};

// https://github.com/grafana/grafana/blob/main/packages/grafana-ui/src/components/LoadingBar/LoadingBar.tsx
export const Linear: Story = {
  render: () => {
    return (
      <div className='absolute flex flex-col inset-0 bg-black'>
        <div
          className={'h-[1px] translateX(-100%) animate-progress-linear'}
          style={{
            background:
              'linear-gradient(90deg, rgba(110, 159, 255, 0) 0%, #6E9FFF 80.75%, rgba(110, 159, 255, 0) 100%)',
          }}
        />
      </div>
    );
  },
};

// Brand icon colors, outer → inner.
const composerBrandColors = ['rgb(5,40,61)', 'rgb(10,75,105)', 'rgb(1,122,183)', 'rgb(6,197,253)'];

export const BrandArcSimple: Story = {
  render: () => {
    const size = 256;
    const totalRadius = size / 2;
    const n = composerBrandColors.length;
    const ringWidth = totalRadius / (n + 1);
    const gap = 0;
    const startAngle = (1 / 4) * Math.PI;
    const endAngle = -(5 / 4) * Math.PI;

    return (
      <div className='absolute inset-0 flex items-center justify-center'>
        <svg width={size} height={size}>
          <g transform={`translate(${totalRadius}, ${totalRadius})`}>
            {composerBrandColors.map((color, i) => {
              const outerRadius = totalRadius - i * ringWidth;
              const innerRadius = outerRadius - ringWidth + gap;
              const d = arc<any, any>()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startAngle)
                .endAngle(endAngle)({}) as string;
              return <path key={i} d={d} fill={color} />;
            })}
          </g>
        </svg>
      </div>
    );
  },
};

/**
 * Build a single brand-accurate C-arc layer.
 *
 * Shape: left semicircle ring (6 → 9 → 12 o'clock) with a
 * horizontal-then-diagonal stepped edge at each open end, matching the
 * Composer brand icon geometry. Two 90° arcs avoid the 180° SVG ambiguity.
 */
const makeBrandLayerPath = (cx: number, cy: number, r1: number, r2: number): string => {
  // Horizontal step at each open end (from brand icon: outerStep/R ≈ 0.29).
  const outerStep = r1 * 0.29;
  const innerStep = r2 * 0.29;
  return [
    // Start at the outer bottom-right step edge (short at bottom).
    `M ${cx + innerStep} ${cy + r1}`,
    // Move left to 6-oclock.
    `L ${cx} ${cy + r1}`,
    // Outer arc CW: 6-oclock → 9-oclock → 12-oclock (through the left/west side).
    `A ${r1} ${r1} 0 0 1 ${cx - r1} ${cy}`,
    `A ${r1} ${r1} 0 0 1 ${cx} ${cy - r1}`,
    // Move right along the top edge.
    `L ${cx + outerStep} ${cy - r1}`,
    // Diagonal down to inner top-right.
    `L ${cx + innerStep} ${cy - r2}`,
    // Move left to inner 12-oclock.
    `L ${cx} ${cy - r2}`,
    // Inner arc CCW: 12-oclock → 9-oclock → 6-oclock (back through the left/west side).
    `A ${r2} ${r2} 0 0 0 ${cx - r2} ${cy}`,
    `A ${r2} ${r2} 0 0 0 ${cx} ${cy + r2}`,
    // Move right along the inner bottom edge (long at bottom).
    `L ${cx + outerStep} ${cy + r2}`,
    // Close: diagonal back up to start.
    'Z',
  ].join(' ');
};

export const BrandArc: Story = {
  render: () => {
    const size = 256;
    const cx = size / 2;
    const cy = size / 2;
    const n = composerBrandColors.length;
    const ringWidth = size / 2 / (n + 1);
    const gap = 0;

    return (
      <div className='absolute inset-0 flex items-center justify-center'>
        <svg width={size} height={size}>
          {composerBrandColors.map((color, i) => {
            const r1 = size / 2 - i * ringWidth;
            const r2 = r1 - ringWidth + gap;
            return <path key={i} d={makeBrandLayerPath(cx, cy, r1, r2)} fill={color} />;
          })}
        </svg>
      </div>
    );
  },
};
