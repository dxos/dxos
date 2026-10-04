//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { type CSSProperties } from 'react';

import { composableProps, slottable } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import type * as Container from '../Container/Container.tsx';

type TypographyTone = 'default' | 'muted' | 'subtle';

type TypographyProps = {
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
const Typography = slottable<HTMLParagraphElement, TypographyProps>(
  ({ children, asChild, truncate, lines, tone, mono, ...props }, forwardedRef) => {
    const { className, style, ...rest } = composableProps(props, { classNames: recipes.typography() });
    const linesStyle: CSSProperties & Container.CSSVariables = lines ? { '--dx-lines': String(lines) } : {};
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

Typography.displayName = 'Typography';

export { Typography as Text };
export type { TypographyProps as TextProps, TypographyTone as TextTone };
export { Link, type LinkProps, type LinkVariant } from '../Link/Link.tsx';
export { TextCrawl as Crawl, type TextCrawlProps as CrawlProps } from '../TextCrawl/TextCrawl.tsx';
export * from '../Timestamp/Timestamp.tsx';
