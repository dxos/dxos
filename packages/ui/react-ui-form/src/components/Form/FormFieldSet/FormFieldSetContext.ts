//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

// Kept out of `FormFieldSet.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context exported beside them forces a full page reload on every edit.

/** How many field sets enclose the current one; the theme keys its chrome on it. */
export const FormFieldSetDepthContext = createContext(0);

export const useFormFieldSetDepth = () => useContext(FormFieldSetDepthContext);
