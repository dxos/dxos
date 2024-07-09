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

const defaultClassNames = ['[&>path]:fill-teal-400', '[&>path]:fill-teal-500', '[&>path]:fill-teal-600'];

type Props = {
  inset: number;
  spin: string;
  className: string;
  style: CSSProperties;
};

const getLayers = (size: number, [a, b, c]: string[]): Props[] => {
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

export type ComposerLogoProps = { animate?: boolean; size?: number; classNames?: string[] } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
>;

export const ComposerLogo = forwardRef<AnimationController, ComposerLogoProps>(
  ({ animate: _animate = false, size = 32, classNames = defaultClassNames, ...props }: ComposerLogoProps, ref) => {
    const layers = useMemo(() => getLayers(size, classNames), [size, classNames]);
    const [animate, setAnimate] = useState(_animate);
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
        {layers.map(({ inset, spin, style, className }, i) => (
          <div key={i} className='absolute' style={{ inset: `${inset}px` }}>
            <Composer className={mx('w-full h-full', animate && spin, className)} style={style} />
          </div>
        ))}
      </div>
    );
  },
);

type Slice = {
  startAngle?: number;
  endAngle?: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  duration: number;
};

const createSlices = ({
  color,
  radius,
  gap = 0,
  t = 1,
}: {
  color: string;
  radius: number;
  gap?: number;
  t?: number;
}): Slice[] => {
  const n = radius < 50 ? 3 : radius < 100 ? 4 : 5;
  const parts: Pick<Slice, 'duration'>[] = [
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
  ].slice(0, n);

  const width = radius / (parts.length + 1);

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
  animate?: boolean;
  size?: number;
  gap?: number;
  color?: string;
  autoFade?: boolean;
  onClick?: () => void;
}> = ({ animate, size = 200, gap = 1, color = '#999999', autoFade, onClick }) => {
  const ref = useRef<SVGSVGElement>(null);
  const triggerRef = useRef(() => {});
  const animateRef = useRef(animate);
  useEffect(() => {
    animateRef.current = animate;
    if (animate) {
      triggerRef.current();
    }
  }, [animate]);

  useEffect(() => {
    const svg = d3
      .select(ref.current)
      .attr('width', size)
      .attr('height', size)
      .append('g')
      .attr('transform', `translate(${size / 2}, ${size / 2})`);

    // TODO(burdon): Pass in.
    const arcs = createSlices({ radius: size / 2, gap, color });

    let count = 0;
    const fadeOut = () => {
      if (--count === 0) {
        svg
          .selectAll('path')
          .transition()
          .delay((_: any, i: any) => i * 200)
          .duration(2_000)
          .attr('opacity', 0);
      }
    };

    // const createArc = ({
    //   innerRadius,
    //   outerRadius,
    //   startAngle = (1 / 4) * Math.PI,
    //   endAngle = -(5 / 4) * Math.PI,
    // }: Slice): ValueFn<SVGPathElement, d3.DefaultArcObject, string | null> =>
    //   d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).startAngle(startAngle).endAngle(endAngle);

    const trigger = arcs.map((arc) => {
      const { color, duration } = arc;
      const { innerRadius, outerRadius, startAngle = (1 / 4) * Math.PI, endAngle = -(5 / 4) * Math.PI } = arc;

      const arcPath = svg
        .append('path')
        .attr(
          'd',
          d3.arc().innerRadius(innerRadius).outerRadius(outerRadius).startAngle(startAngle).endAngle(endAngle) as any,
        )
        .attr('fill', color);
      const rotateArc = () => {
        arcPath
          .attr('opacity', 1)
          .transition()
          .duration(duration)
          .attrTween('transform', (() => d3.interpolateString('rotate(0)', 'rotate(360)')) as any)
          .on('end', ((_: any, i: number, nodes: Node[]) => {
            if (animateRef.current) {
              rotateArc();
            } else if (autoFade) {
              fadeOut();
              // d3.select(nodes[i])
              //   .transition()
              //   .duration(1000)
              //   .attrTween('d', () => {
              //     const interpolate = d3.interpolate(0, Math.PI);
              //     return (t: number) => createArc(arc);
              //   });
            }
          }) as any);
      };

      return rotateArc;
    });

    triggerRef.current = () => {
      count = trigger.length;
      trigger.forEach((rotate) => rotate());
    };

    if (animate) {
      triggerRef.current();
    }

    return () => {
      d3.select(ref.current).selectChildren().remove();
    };
  }, []);

  return <svg ref={ref} onClick={onClick} />;
};
