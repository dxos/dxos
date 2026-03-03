//
// Copyright 2022 DXOS.org
//

import { type TFunction } from 'i18next';

// TODO(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures.
export type Label = string | [string, { ns: string; count?: number; defaultValue?: string }];

export const isLabel = (o: any): o is Label =>
  typeof o === 'string' ||
  (Array.isArray(o) &&
    o.length === 2 &&
    typeof o[0] === 'string' &&
    !!o[1] &&
    typeof o[1] === 'object' &&
    'ns' in o[1] &&
    typeof o[1].ns === 'string');

export const toLocalizedString = (label: Label, t: TFunction) => (Array.isArray(label) ? t(...label) : label);
