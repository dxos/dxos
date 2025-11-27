//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, isSurfaceAvailable, usePluginManager } from '@dxos/app-framework/react';
import { type FormFieldLookup } from '@dxos/react-ui-form';

/**
 * Creates a surface input component based on plugin context.
 * @param baseData Additional data that will be merged with form data and passed to the surface.
 * This allows providing more context to the surface than what's available from the form itself.
 */
// TODO(burdon): Factor out?
export const useInputSurfaceLookup = (baseData?: Record<string, any>): FormFieldLookup => {
  const pluginManager = usePluginManager();
  return useCallback<FormFieldLookup>(
    ({ schema, prop, fieldProps }) => {
      const data = { prop, schema, ...baseData };
      if (isSurfaceAvailable(pluginManager.context, { role: 'form-input', data })) {
        return <Surface role='form-input' data={data} {...fieldProps} />;
      }
    },
    [pluginManager, baseData],
  );
};
