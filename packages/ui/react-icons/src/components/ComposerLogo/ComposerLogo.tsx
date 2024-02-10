//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React, {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useImperativeHandle,
  useMemo,
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

const getProps = (size: number, [a, b, c]: string[]): Props[] => {
  return [
    {
      inset: 0,
      spin: 'animate-spin-logo-1',
      style: {},
      className: a,
    },
    {
      inset: size / 6,
      spin: 'animate-spin-logo-2',
      style: {
        animationDirection: 'reverse',
      },
      className: b,
    },
    {
      inset: size / 3.6,
      spin: 'animate-spin-logo-3',
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
