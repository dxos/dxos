//
// Copyright 2026 DXOS.org
//

import { mx, textValence } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type FieldsetStyleProps = {};

/** A group of fields. The browser's box and inset are reset; a consumer lays the group out. */
const root: ComponentFunction<FieldsetStyleProps> = (_props, ...etc) => mx('min-w-0 border-0 m-0 p-0', ...etc);

/** Names the group: the same type as a field's label, so a legend and a label read alike. */
const legend: ComponentFunction<FieldsetStyleProps> = (_props, ...etc) =>
  mx('p-0 text-sm text-description data-[disabled]:opacity-50', ...etc);

const helperText: ComponentFunction<FieldsetStyleProps> = (_props, ...etc) => mx('text-sm text-description', ...etc);

const errorText: ComponentFunction<FieldsetStyleProps> = (_props, ...etc) =>
  mx('text-sm', textValence('error'), ...etc);

export const fieldsetTheme: Theme<FieldsetStyleProps> = {
  root,
  legend,
  helperText,
  errorText,
};
