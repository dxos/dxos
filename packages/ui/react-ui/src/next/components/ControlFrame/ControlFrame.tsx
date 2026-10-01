//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type ControlFrameVariant = 'default' | 'subdued' | 'mono';

export type ControlFrameProps = {
  'data-testid'?: string;
  /** Leading content inside the frame (an Icon, or short text such as a currency). */
  'start'?: ReactNode;
  /** Trailing content inside the frame (an Icon, a unit, or icon-only Buttons). */
  'end'?: ReactNode;
  /** `subdued` drops the well; `mono` sets the frame's text in the monospace font. */
  'variant'?: ControlFrameVariant;
  /** Dims the frame, for content (an editor) that has no `disabled` state of its own. */
  'disabled'?: boolean;
  /** The `data-scope` a control built on the frame reports for it (decision 10); `control-frame` otherwise. */
  'scope'?: string;
};

/**
 * The control-tall well of an Input with optional adornments either side of its content: an Input's `start`/`end`
 * render one around a bare input, and editors or custom controls use it directly around their own element. The focus
 * ring follows whatever inside it, other than an adornment, has focus.
 */
export const ControlFrame = composable<HTMLDivElement, ControlFrameProps>(
  ({ children, start, end, variant = 'default', disabled, scope = 'control-frame', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps<HTMLDivElement>(props, { classNames: recipes.controlFrame() });
    return (
      <div
        {...rest}
        data-scope={scope}
        data-part='root'
        data-variant={variant}
        data-disabled={disabled ? '' : undefined}
        className={className}
        ref={forwardedRef}
      >
        {start != null && (
          <span data-scope={scope} data-part='start' className={recipes.inputAdornment()}>
            {start}
          </span>
        )}
        {children}
        {end != null && (
          <span data-scope={scope} data-part='end' className={recipes.inputAdornment()}>
            {end}
          </span>
        )}
      </div>
    );
  },
);

ControlFrame.displayName = 'Next.ControlFrame';
