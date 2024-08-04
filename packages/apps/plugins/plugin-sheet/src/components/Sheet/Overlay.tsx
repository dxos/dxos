//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type Bounds } from './context';

/**
 * Selection range.
 */
export const Overlay: FC<{ bounds?: Bounds; visible?: boolean }> = ({ bounds, visible }) => {
  if (!bounds?.from) {
    return null;
  }

  const {
    style: { width, height, ...rest },
  } = bounds.from;
  const cursorProps = { width: (width as number) + 1, height: (height as number) + 1, ...rest };
  const boundsProps = bounds.to && getBounds(getRect(bounds.from.style), getRect(bounds.to.style));

  return (
    <>
      <div
        className={mx(
          'z-[10] relative border border-black dark:border-white opacity-50',
          'pointer-events-none',
          !visible && 'invisible',
        )}
        style={cursorProps}
      />
      {boundsProps && (
        <div
          className={mx(
            'z-[10] relative border bg-neutral-900 dark:bg-neutral-100 border-black dark:border-white opacity-10',
            'pointer-events-none',
            !visible && 'invisible',
          )}
          style={{ position: 'absolute', ...boundsProps }}
        />
      )}
    </>
  );
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const getRect = ({ left, top, width, height }: CSSProperties): Rect => ({
  left: left as number,
  top: top as number,
  width: width as number,
  height: height as number,
});

const getBounds = (style1: Rect, style2: Rect): Rect => {
  return {
    left: Math.min(style1.left, style2.left),
    top: Math.min(style1.top, style2.top),
    width: Math.abs(style1.left - style2.left) + (style1.left < style2.left ? style2.width : style1.width),
    height: Math.abs(style1.top - style2.top) + (style1.top < style2.top ? style2.height : style1.height),
  };
};
