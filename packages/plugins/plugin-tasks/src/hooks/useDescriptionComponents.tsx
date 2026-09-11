//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { DxAnchor } from '@dxos/lit-ui/react';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { MarkdownLink, type MarkdownViewProps } from '@dxos/react-ui-markdown';

/**
 * Renderers for a task's description at rest: a link some contributed preview resolver answers for
 * becomes the same anchor chip the editor makes of it, with the hover card; any other link stays a
 * link. The row is a React markdown renderer, so this is the read-only counterpart of the editor
 * extensions `useMarkdownExtensions` gathers.
 */
export const useDescriptionComponents = (): MarkdownViewProps['components'] => {
  const resolvers = useCapabilities(PreviewCapabilities.LinkResolver);
  return useMemo(
    () => ({
      a: ({ children, href, ...props }) =>
        href && PreviewCapabilities.isPreviewLink(resolvers.flat(), href) ? (
          <DxAnchor eid={href} className='dx-tag--anchor'>
            {/* A URL written bare autolinks with itself as its text; the resolver's short name reads better in a chip. */}
            {children === href ? (PreviewCapabilities.linkLabel(resolvers.flat(), href) ?? children) : children}
          </DxAnchor>
        ) : (
          <MarkdownLink href={href} {...props}>
            {children}
          </MarkdownLink>
        ),
    }),
    [resolvers],
  );
};
