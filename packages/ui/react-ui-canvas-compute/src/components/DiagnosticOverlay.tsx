//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type { GraphDiagnostic } from '@dxos/conductor';

export type DiagnosticOverlayProps = {
  diagnostics: GraphDiagnostic[];
};

export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => (
  <div className='absolute inset-0 pointer-events-none'>
    {diagnostics.map((diagnostic, index) => (
      <div key={index} className='absolute inset-0 pointer-events-none'>
        {diagnostic.message}
      </div>
    ))}
  </div>
);
