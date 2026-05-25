//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

/**
 * A standalone context for the `tooltips` flag (Form.Root's only label
 * decoration today: a JSON-path hover tooltip rendered by
 * `FormFieldLabel`).
 *
 * Lives in its own module so that `FormFieldComponent.tsx` -- imported at
 * the top of `Form.tsx` -- can read the flag without re-importing from
 * `Form.tsx`. That round-trip used to create a circular module-eval
 * dependency that intermittently hit a TDZ ("Cannot access 'FormFieldLabel'
 * before initialization") in browser-mode storybook tests.
 *
 * Defaults to `true` both when `Form.Root` doesn't pass an explicit value
 * AND when there is no enclosing `Form.Root` (e.g. `FormFieldWrapper`
 * stories that render an input without a Form provider).
 */
export const FormTooltipsContext = createContext<boolean>(true);

/** Returns whether the enclosing `Form.Root` has field tooltips enabled. */
export const useFormTooltips = (): boolean => useContext(FormTooltipsContext);
