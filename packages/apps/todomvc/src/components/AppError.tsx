//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

/** Root route error element: shows a boot or render failure instead of a blank page. */
export const AppError = () => {
  const error = useRouteError();
  return (
    <section className='todoapp'>
      <pre data-testid='app-error'>
        {isRouteErrorResponse(error)
          ? `${error.status} ${error.statusText}`
          : error instanceof Error
            ? error.message
            : String(error)}
      </pre>
    </section>
  );
};
