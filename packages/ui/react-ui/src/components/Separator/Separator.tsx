//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type SeparatorProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  orientation?: 'horizontal' | 'vertical';
  /** A purely visual rule, hidden from assistive tech. */
  decorative?: boolean;
  subdued?: boolean;
};

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ classNames, orientation = 'horizontal', decorative, subdued, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.div
        {...props}
        // `separator` is horizontal by default, so only the vertical case needs the orientation spelt out.
        {...(decorative
          ? { role: 'none' }
          : { role: 'separator', ...(orientation === 'vertical' && { 'aria-orientation': 'vertical' as const }) })}
        data-orientation={orientation}
        className={tx('separator.root', { orientation, subdued }, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

Separator.displayName = 'Separator';

export type { SeparatorProps };

export { Separator };
