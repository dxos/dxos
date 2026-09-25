//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type { GraphDiagnostic } from '@dxos/conductor';
import { Banner } from '@dxos/react-ui';

export type DiagnosticOverlayProps = {
  diagnostics: GraphDiagnostic[];
};

/**
 * The graph's diagnostics over the canvas: centred along the bottom edge, clear of the toolbar and the
 * palette, and transparent to the pointer so a banner never takes a gesture meant for the diagram.
 */
export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div className='absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-2 pointer-events-none'>
      {diagnostics.map((diagnostic, index) => (
        <Banner.Root key={index} valence={diagnostic.severity}>
          <Banner.Content>
            <Banner.Title>{diagnostic.message}</Banner.Title>
          </Banner.Content>
        </Banner.Root>
      ))}
    </div>
  );
};
