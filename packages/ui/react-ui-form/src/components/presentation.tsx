//
// Copyright 2026 DXOS.org
//

import { type FormPresentation } from '#types';

/**
 * Resolved presentation strategy for a field — which parts render, derived from {@link FormPresentation}.
 * Visual chrome (borders, grid, spacing) is owned by the Form theme recipe, not here.
 */
export type FormFieldPresentation = {
  layout?: FormPresentation;
  /** Render the value as read-only plain DOM rather than an editable control. */
  isStatic: boolean;
  /** Render the field's label row. */
  showLabel: boolean;
  /** Render the inline validation/error block beneath the control. */
  showError: boolean;
};

/**
 * Derive the {@link FormFieldPresentation} for a layout.
 * - `static` renders read-only plain DOM.
 * - `inline`, `pill`, `title` and `plain` drop the label (the control stands alone, e.g. an array row, a pill naming
 *   its field, or a heading edited in place).
 * - `full` adds the inline error block.
 */
export const presentationFor = (layout?: FormPresentation): FormFieldPresentation => ({
  layout,
  isStatic: layout === 'static',
  showLabel: layout !== 'inline' && layout !== 'pill' && layout !== 'title' && layout !== 'plain',
  showError: layout === 'full',
});
