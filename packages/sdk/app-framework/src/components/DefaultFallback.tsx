//
// Copyright 2025 DXOS.org
//

import React from 'react';

/**
 * NOTE: Default fallback should not use tailwind or theme.
 */
export const DefaultFallback = ({ error }: { error: Error }) => (
  <div
    style={{
      margin: '1rem',
      padding: '1rem',
      overflow: 'hidden',
      border: '4px solid teal',
      borderRadius: '1rem',
    }}
  >
    {/* TODO(wittjosiah): Link to docs for replacing default. */}
    <h1 style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>ERROR: {error.message}</h1>
    <pre style={{ overflow: 'auto', fontSize: '1rem', whiteSpace: 'pre-wrap', color: '#888888' }}>{error.stack}</pre>
  </div>
);
