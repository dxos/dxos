//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type { GraphDiagnostic } from '@dxos/conductor';

export type DiagnosticOverlayProps = {
  diagnostics: GraphDiagnostic[];
};

export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {
  return (
    <div className='dx-fullscreen pointer-events-none'>
      {diagnostics.map((diagnostic, index) => (
        <div key={index} className='dx-fullscreen pointer-events-none'>
          {diagnostic.message}
        </div>
      ))}
    </div>
  );
};
