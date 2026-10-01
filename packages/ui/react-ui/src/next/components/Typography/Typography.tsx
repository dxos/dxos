//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties } from 'react';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type CSSVariables } from '../Container/index.ts';

export type TypographyTone = 'default' | 'description' | 'subdued';

export type TypographyProps = {
  /** One line, ending in an ellipsis when it overflows. */
  truncate?: boolean;
  /** At most this many lines, the last ending in an ellipsis. */
  lines?: number;
  /**
   * Emphasis below the default (DESIGN.md "Text emphasis"): `description` for secondary content, `subdued` for
   * interface text.
   */
  tone?: TypographyTone;
  /** Monospace, for keys, ids and code. */
  mono?: boolean;
};

/**
 * Text whose first line is centred in a block, so it lines up with a Block or control beside it however many lines
 * it wraps to. Renders a `<p>`; `asChild` puts the metrics on a heading or other text element instead.
 */
export const Typography = slottable<HTMLParagraphElement, TypographyProps>(
  ({ children, asChild, truncate, lines, tone, mono, ...props }, forwardedRef) => {
    const { className, style, ...rest } = composableProps(props, { classNames: recipes.typography() });
    const linesStyle: CSSProperties & CSSVariables = lines ? { '--nx-lines': String(lines) } : {};
    return (
      <ark.p
        asChild={asChild}
        {...rest}
        data-scope='typography'
        data-part='root'
        data-truncate={truncate ? '' : undefined}
        data-lines={lines ? '' : undefined}
        data-tone={tone === 'default' ? undefined : tone}
        data-mono={mono ? '' : undefined}
        style={{ ...linesStyle, ...style }}
        className={className}
        ref={forwardedRef}
      >
        {children}
      </ark.p>
    );
  },
);

Typography.displayName = 'Next.Typography';
