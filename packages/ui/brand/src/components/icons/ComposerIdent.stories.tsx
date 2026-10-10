//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { composerRingPaths } from './Composer.tsx';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Poiret+One&display=swap';

type RingStep = {
  keyframes: Keyframe[];
  easing: string;
};

type IdentVariant = {
  label: string;
  /** Ring animation; receives the ring index (0 = innermost) to vary direction per ring. */
  ring: (index: number) => RingStep;
  /** Ring order: innermost first unless reversed. */
  outerFirst?: boolean;
  /** Duration of each ring's animation (ms). */
  duration: number;
  /** Delay between successive rings (ms). */
  stagger: number;
  /** Start from the symmetric mark, then extend each bottom arm to its true length. */
  grow?: {
    /** Growth speed shared by every arm (viewBox units per ms), so shorter arms finish first. */
    rate: number;
    /** Pause after the rings land before the arms grow (ms). */
    delay: number;
  };
};

/**
 * Bottom-arm vertices of each ring paired with their mirror image of the top arm across y = 128 (in path coordinates),
 * so the mark can start symmetric; the bottom arms of the real mark are longer.
 */
const SYMMETRIC_ARMS: [string, string][][] = [
  [
    ['761.579,164', '729.238,164'],
    ['769.5,140', '721.317,140'],
  ],
  [
    ['1065.83,1064', '1047.85,1064'],
    ['1074.47,1040', '1039.21,1040'],
  ],
  [
    ['745.738,212', '745.079,212'],
    ['753.659,188', '737.159,188'],
  ],
  [
    ['152.958,212', '152.319,212'],
    ['145.277,236', '160,236'],
  ],
];

const symmetricPaths = composerRingPaths.map(({ d }, index) =>
  SYMMETRIC_ARMS[index].reduce((path, [from, to]) => path.replaceAll(from, to), d),
);

/** Furthest any bottom-arm vertex travels, in path x units. */
const growDistances = SYMMETRIC_ARMS.map((pairs) =>
  Math.max(...pairs.map(([from, to]) => Math.abs(parseFloat(from) - parseFloat(to)))),
);

const VARIANT_NAMES = ['grow', 'ripple', 'focus', 'sweep', 'spin', 'fade'] as const;

type VariantName = (typeof VARIANT_NAMES)[number];

const variants: Record<VariantName, IdentVariant> = {
  grow: {
    label: 'Grow',
    duration: 700,
    stagger: 180,
    ring: () => ({
      keyframes: [
        { opacity: 0, transform: 'scale(0.85)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      easing: 'ease-out',
    }),
    grow: { rate: 0.05, delay: 300 },
  },
  ripple: {
    label: 'Ripple',
    duration: 900,
    stagger: 150,
    ring: () => ({
      keyframes: [
        { opacity: 0, transform: 'scale(0)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }),
  },
  focus: {
    label: 'Focus',
    outerFirst: true,
    duration: 1100,
    stagger: 200,
    ring: () => ({
      keyframes: [
        { opacity: 0, filter: 'blur(24px)' },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      easing: 'ease-out',
    }),
  },
  sweep: {
    label: 'Sweep',
    duration: 1000,
    stagger: 160,
    ring: () => ({
      keyframes: [
        { opacity: 0, transform: 'rotate(-90deg)' },
        { opacity: 1, transform: 'rotate(0deg)' },
      ],
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }),
  },
  spin: {
    label: 'Spin',
    outerFirst: true,
    duration: 1200,
    stagger: 120,
    ring: (index) => ({
      keyframes: [
        { opacity: 0, transform: `scale(4) rotate(${index % 2 ? -270 : 270}deg)` },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' },
      ],
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }),
    grow: { rate: 0.05, delay: 200 },
  },
  fade: {
    label: 'Fade',
    duration: 700,
    stagger: 220,
    ring: () => ({
      keyframes: [
        { opacity: 0, transform: 'scale(0.85)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      easing: 'ease-out',
    }),
  },
};

const FONT_FAMILY = 'Poiret One';

/** Wordmark size and offset from the mark, in viewBox units (the mark is 256 square). */
const WORDMARK_SIZE = 150;
const WORDMARK_X = 216;

type WordmarkMetrics = {
  /** Baseline that puts the centre of the "c" on the mark's centre. */
  baseline: number;
  width: number;
};

/** Loads Poiret One, then measures the wordmark so layout is final before anything animates. */
const useWordmarkMetrics = (): WordmarkMetrics | undefined => {
  const [metrics, setMetrics] = useState<WordmarkMetrics>();
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }

    let cancelled = false;
    const font = `${WORDMARK_SIZE}px "${FONT_FAMILY}"`;
    void document.fonts.load(font).then(() => {
      const context = document.createElement('canvas').getContext('2d');
      if (cancelled || !context) {
        return;
      }
      context.font = font;
      const glyph = context.measureText('c');
      const glyphCentre = (glyph.actualBoundingBoxAscent - glyph.actualBoundingBoxDescent) / 2;
      setMetrics({ baseline: 128 + glyphCentre, width: context.measureText('composer').width });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return metrics;
};

type ComposerIdentProps = {
  variant: VariantName;
  size?: number;
  /** Multiplier on every duration and delay; >1 is slower. */
  speed?: number;
  /** Pause between the last ring landing and the wordmark (ms). */
  wordmarkDelay?: number;
  wordmark?: boolean;
};

const ComposerIdent = ({
  variant,
  size = 160,
  speed = 1,
  wordmarkDelay = 100,
  wordmark = true,
}: ComposerIdentProps) => {
  const metrics = useWordmarkMetrics();
  const ringRefs = useRef<(SVGGElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const wordmarkRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (!metrics) {
      return;
    }

    const { ring, outerFirst, duration, stagger, grow } = variants[variant];
    const count = composerRingPaths.length;
    const animations = ringRefs.current.flatMap((element, index) => {
      if (!element) {
        return [];
      }
      const order = outerFirst ? count - 1 - index : index;
      const { keyframes, easing } = ring(index);
      return [
        element.animate(keyframes, {
          duration: duration * speed,
          delay: order * stagger * speed,
          easing,
          fill: 'both',
        }),
      ];
    });

    let ringsEnd = (count - 1) * stagger + duration;
    if (grow) {
      const growStart = ringsEnd + grow.delay;
      // Paths carry different x scales, so convert each arm's travel into viewBox units before timing it.
      const growDurations = pathRefs.current.map((element, index) => {
        const scaleX = element?.transform.baseVal.consolidate()?.matrix.a ?? 1;
        return (growDistances[index] * scaleX) / grow.rate;
      });
      const longest = Math.max(...growDurations);
      // Shorter arms start later at the same rate so every arm closes together.
      const growEnd = growStart + longest;
      pathRefs.current.forEach((element, index) => {
        if (element) {
          const growDuration = growDurations[index];
          animations.push(
            element.animate(
              [{ d: `path("${symmetricPaths[index]}")` }, { d: `path("${composerRingPaths[index].d}")` }],
              {
                duration: growDuration * speed,
                delay: (growEnd - growDuration) * speed,
                easing: 'linear',
                fill: 'both',
              },
            ),
          );
        }
      });
      ringsEnd = growEnd;
    }

    if (wordmarkRef.current) {
      animations.push(
        wordmarkRef.current.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 1200 * speed,
          delay: (ringsEnd + wordmarkDelay) * speed,
          easing: 'ease-in-out',
          fill: 'both',
        }),
      );
    }

    return () => animations.forEach((animation) => animation.cancel());
  }, [metrics, variant, speed, wordmarkDelay, wordmark]);

  // The lockup is sized to its final extent up front so nothing reflows while it animates.
  const width = wordmark && metrics ? WORDMARK_X + metrics.width : 256;
  return (
    <svg width={(size * width) / 256} height={size} viewBox={`0 0 ${width} 256`} className='overflow-visible shrink-0'>
      {composerRingPaths.map(({ transform, fill, d }, index) => (
        <g
          key={index}
          ref={(element) => {
            ringRefs.current[index] = element;
          }}
          style={{ opacity: 0, transformBox: 'view-box', transformOrigin: '128px 128px' }}
        >
          <path
            ref={(element) => {
              pathRefs.current[index] = element;
            }}
            transform={transform}
            d={d}
            style={{ fill }}
          />
        </g>
      ))}
      {wordmark && metrics && (
        <text
          ref={wordmarkRef}
          x={WORDMARK_X}
          y={metrics.baseline}
          fill='white'
          fontFamily={`"${FONT_FAMILY}", sans-serif`}
          fontSize={WORDMARK_SIZE}
          style={{ opacity: 0 }}
        >
          composer
        </text>
      )}
    </svg>
  );
};

type StoryArgs = ComposerIdentProps;

const DefaultStory = (props: StoryArgs) => {
  const [run, setRun] = useState(0);
  return (
    <div className='relative flex justify-center items-center w-full h-dvh overflow-hidden bg-black'>
      <ComposerIdent key={run} {...props} />
      <div className='absolute bottom-4 right-4'>
        <Button.Root onClick={() => setRun((value) => value + 1)}>Replay</Button.Root>
      </div>
    </div>
  );
};

const GridStory = ({ size = 72, ...props }: Omit<StoryArgs, 'variant'>) => {
  const [run, setRun] = useState(0);
  return (
    <div className='flex flex-col gap-12 p-12 w-full h-dvh overflow-hidden bg-black'>
      <div>
        <Button.Root onClick={() => setRun((value) => value + 1)}>Replay</Button.Root>
      </div>
      {VARIANT_NAMES.map((variant) => (
        <div key={variant} className='grid grid-cols-[8rem_1fr] items-center'>
          <span className={mx('text-sm text-fg-muted')}>{variants[variant].label}</span>
          <ComposerIdent key={run} {...props} variant={variant} size={size} />
        </div>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/brand/components/ComposerIdent',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    variant: { control: 'select', options: VARIANT_NAMES },
    size: { control: { type: 'range', min: 32, max: 320, step: 8 } },
    speed: { control: { type: 'range', min: 0.25, max: 4, step: 0.25 } },
    wordmarkDelay: { control: { type: 'range', min: 0, max: 2000, step: 50 } },
  },
  args: {
    variant: 'grow',
    size: 160,
    speed: 1,
    wordmarkDelay: 100,
    wordmark: true,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Grow: Story = {};

export const Ripple: Story = { args: { variant: 'ripple' } };

export const Focus: Story = { args: { variant: 'focus' } };

export const Spin: Story = { args: { variant: 'spin' } };

export const Sweep: Story = { args: { variant: 'sweep' } };

export const Fade: Story = { args: { variant: 'fade' } };

export const All: Story = {
  render: (args: StoryArgs) => <GridStory {...args} size={72} />,
};
