//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { DxAnchor } from '@dxos/lit-ui/react';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { Icon } from '@dxos/react-ui';
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
      a: ({ children, href, ...props }) => {
        const all = resolvers.flat();
        if (!href || !PreviewCapabilities.isPreviewLink(all, href)) {
          return (
            <MarkdownLink href={href} {...props}>
              {children}
            </MarkdownLink>
          );
        }
        // The same leading icon the editor's chip carries, so a row and its edit pane agree.
        const icon = PreviewCapabilities.linkIcon(all, href);
        return (
          <DxAnchor eid={href} className='dx-tag--anchor'>
            {icon && (
              <Icon icon={icon.icon} size={4} classNames={['inline-block align-[-0.125em] me-1', icon.classNames]} />
            )}
            {/* A URL written bare autolinks with itself as its text; the resolver's short name reads better in a chip. */}
            {children === href ? (PreviewCapabilities.linkLabel(all, href) ?? children) : children}
          </DxAnchor>
        );
      },
    }),
    [resolvers],
  );
};
