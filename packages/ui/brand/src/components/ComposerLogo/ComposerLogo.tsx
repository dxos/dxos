//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, {
  type CSSProperties,
  type FC,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { mx } from '@dxos/react-ui-theme';

import { Composer } from '../../icons';

export interface AnimationController {
  spin: () => void;
}

// TODO(burdon): Get from theme?
export const colors = {
  gray: '#888888',
  purple: '#AA23D3',
  orange: '#CA6346',
  green: '#4DA676',
  blue: '#539ACD',
};

const defaultClassNames = ['[&>path]:fill-teal-400', '[&>path]:fill-teal-500', '[&>path]:fill-teal-600'];

type Props = {
  inset: number;
  spin: string;
  className: string;
  style: CSSProperties;
};

const getProps = (size: number, [a, b, c]: string[]): Props[] => {
  return [
    {
      inset: 0,
      spin: 'animate-[spin_2s_linear_infinite]',
      style: {},
      className: a,
    },
    {
      inset: size / 6,
      spin: 'animate-[spin_2s_linear_infinite]',
      style: {
        animationDirection: 'reverse',
      },
      className: b,
    },
    {
      inset: size / 3.6,
      spin: 'animate-[spin_1s_linear_infinite]',
      style: {},
      className: c,
    },
  ];
};

export type ComposerLogoProps = { size?: number; classNames?: string[] } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
>;

export const ComposerLogo = forwardRef<AnimationController, ComposerLogoProps>(
  ({ size = 32, classNames = defaultClassNames, ...props }: ComposerLogoProps, ref) => {
    const variants = useMemo(() => getProps(size, classNames), [size, classNames]);
    const [animate, setAnimate] = useState(false);
    useImperativeHandle(
      ref,
      () => ({
        spin: () => {
          setAnimate(true);
          setTimeout(() => {
            setAnimate(false);
          }, 2_000);
        },
      }),
      [],
    );

    return (
      <div
        {...props}
        className='flex relative'
        style={{
          width: size,
          height: size,
        }}
      >
        {variants.map(({ inset, spin, style, className }, i) => (
          <div key={i} className='absolute' style={{ inset: `${inset}px` }}>
            <Composer className={mx('w-full h-full', animate && spin, className)} style={style} />
          </div>
        ))}
      </div>
    );
  },
);

type Arc = {
  innerRadius: number;
  outerRadius: number;
  color: string;
  duration: number;
};

// TODO(burdon): 2 parts with separate start/end. Or allow end to drift at a different rate.
const createArcs = ({
  color,
  radius,
  width,
  gap = 0,
  t = 1,
}: {
  color: string;
  radius: number;
  width: number;
  gap?: number;
  t?: number;
}): Arc[] => {
  const parts: Pick<Arc, 'duration'>[] = [
    {
      duration: 1600,
    },
    {
      duration: 1400,
    },
    {
      duration: 1200,
    },
    {
      duration: 1000,
    },
    {
      duration: 800,
    },
  ];

  return parts.map(({ duration }, i) => ({
    outerRadius: radius - i * width,
    innerRadius: radius - (i + 1) * width + gap,
    color: color + (0xa0 - i * 0x15).toString(16),
    duration: duration * t,
  }));
};

/**
 * Spinning Composer "C" logo.
 */
// TODO(burdon): Configure stripes.
export const ComposerSpinner: FC<{
  spinning?: boolean;
  size?: number;
  gap?: number;
  color?: string;
  onClick?: () => void;
}> = ({ spinning, size = 200, gap = 1, color = pickOne(colors), onClick }) => {
  const ref = useRef<SVGSVGElement>(null);
  const triggerRef = useRef(() => {});
  const spinningRef = useRef(spinning);
  useEffect(() => {
    spinningRef.current = spinning;
    if (spinning) {
      triggerRef.current?.();
    }
  }, [spinning]);

  // TODO(burdon): Expose function to start/stop.
  useEffect(() => {
    const svg = d3
      .select(ref.current)
      .attr('width', size)
      .attr('height', size)
      .append('g')
      .attr('transform', `translate(${size / 2}, ${size / 2})`);

    const createArc = ({ innerRadius, outerRadius }: Arc): any => {
      const startAngle = (1 / 4) * Math.PI;
      const endAngle = -(5 / 4) * Math.PI;
      return d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).startAngle(startAngle).endAngle(endAngle);
    };

    // TODO(burdon): Extend line.
    const arcs = createArcs({ radius: size / 2, width: 18, gap, color });
    let count = 0;
    const done = () => {
      if (--count === 0) {
        svg
          .selectAll('path')
          .transition()
          .delay((_: any, i: any) => i * 200)
          .duration(2_000)
          .attr('opacity', 0);
      }
    };
    const trigger = arcs.map((arc) => {
      const { color, duration } = arc;
      const arcPath = svg.append('path').attr('d', createArc(arc)).attr('fill', color);
      const rotateArc = () => {
        arcPath
          .attr('opacity', 1)
          .transition()
          .duration(duration)
          .attrTween('transform', (() => d3.interpolateString('rotate(0)', 'rotate(360)')) as any)
          .on('end', (() => {
            if (spinningRef.current) {
              rotateArc();
            } else {
              done();
            }
          }) as any);
      };

      return rotateArc;
    });

    triggerRef.current = () => {
      count = trigger.length;
      trigger.forEach((rotate) => rotate());
    };

    return () => {
      d3.select(ref.current).selectChildren().remove();
    };
  }, []);

  return <svg ref={ref} onClick={onClick} />;
};

const pickOne = <T,>(obj: Record<string, T>) => Object.values(obj)[Math.floor(Math.random() * Object.keys(obj).length)];
