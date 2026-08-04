//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Surface, useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';

import { Connector } from '#types';

/** The form renderer's own props ride alongside `data` on the surface envelope; `type` comes from the field AST. */
export type ConnectorSelectorFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

/**
 * Form field offering every registered connector. It consumes the whole surface envelope, so it
 * takes no `props` mapper.
 */
export const ConnectorSelectorField = ({ data, ...inputProps }: ConnectorSelectorFieldProps) => {
  const connectors = useCapabilities(Connector).flat();
  const options = useMemo(
    () => connectors.map((connector) => ({ value: connector.id, label: connector.label ?? connector.id })),
    [connectors],
  );

  const { fieldPropertyAst } = data;
  if (!fieldPropertyAst) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: fieldPropertyAst };

  return <SelectField {...props} options={options} />;
};
