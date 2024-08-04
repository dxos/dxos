//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

/**
 * Selection range.
 */
// TODO(burdon): Show drag handles on corners.
export const Outline: FC<{ style?: CSSProperties; visible?: boolean }> = ({ style, visible }) => {
  if (!style) {
    return null;
  }

  const { width, height, ...rest } = style;
  const props = { width: (width as number) + 1, height: (height as number) + 1, ...rest };
  return (
    <div
      className={mx(
        'z-[10] relative border border-black dark:border-white opacity-50',
        'pointer-events-none',
        !visible && 'invisible',
      )}
      style={props}
    />
  );
};
