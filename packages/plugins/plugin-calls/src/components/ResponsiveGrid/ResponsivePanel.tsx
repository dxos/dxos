//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import { mx } from '@dxos/ui-theme';

/**
 * A container component that maintains the child's aspect ratio while centering its content.
 * The container will scale to fit within its parent's bounds while preserving the aspect ratio.
 *
 * @example
 * <ResponsivePanel>
 *   <VideoObject />
 * </ResponsivePanel>
 */
export const ResponsivePanel = ({ children }: PropsWithChildren) => {
  return (
    // Outer container that takes full size of parent.
    <Layout.Flex classNames='dx-expand relative'>
      {/* Absolute positioning layer for centering content. */}
      <Layout.Flex center classNames='dx-cover'>
        {/* Content container that maintains given aspect ratio and proper scaling. */}
        <div className={mx('max-h-full max-w-full w-auto h-auto aspect-video')}>{children}</div>
      </Layout.Flex>
    </Layout.Flex>
  );
};
