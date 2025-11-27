//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { Surface, isSurfaceAvailable, usePluginManager } from '@dxos/app-framework/react';
import { type FormFieldComponentProps } from '@dxos/react-ui-form';

// TODO(ZaymonFC): Move this if you find yourself needing it elsewhere.
/**
 * Creates a surface input component based on plugin context.
 * @param baseData Additional data that will be merged with form data and passed to the surface.
 * This allows providing more context to the surface than what's available from the form itself.
 */
export const useInputSurfaceLookup = (baseData?: Record<string, any>) => {
  const pluginManager = usePluginManager();

  return useCallback(
    ({
      prop,
      schema,
      inputProps,
    }: {
      prop: string;
      schema: Schema.Schema<any>;
      inputProps: FormFieldComponentProps;
    }) => {
      const composedData = { prop, schema, ...baseData };
      if (
        !isSurfaceAvailable(pluginManager.context, {
          role: 'form-input',
          data: composedData,
        })
      ) {
        return undefined;
      }

      return <Surface role='form-input' data={composedData} {...inputProps} />;
    },
    [pluginManager, baseData],
  );
};
