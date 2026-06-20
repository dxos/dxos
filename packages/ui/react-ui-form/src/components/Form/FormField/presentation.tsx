//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type FormPresentation } from '#types';

/**
 * Resolved presentation strategy for a field. Centralizes the questions every field's chrome asks
 * about a {@link FormPresentation} so the answers live in one place rather than scattered
 * `layout === 'inline' | 'full' | 'static'` checks across each field component.
 */
export type FieldPresentation = {
  layout?: FormPresentation;
  /** Render the field's label row. */
  showLabel: boolean;
  /** Render the inline validation/error block beneath the control. */
  showError: boolean;
  /** Render the value as read-only plain DOM rather than an editable control. */
  isStatic: boolean;
  /** Class applied to the field's outer wrapper element (the customization seam for the field row). */
  fieldClassName: string;
};

/**
 * Derive the {@link FieldPresentation} for a layout.
 * - `inline` drops the label (the control stands alone, e.g. an array row).
 * - `full` adds the inline error block.
 * - `static` renders read-only plain DOM.
 */
export const presentationFor = (layout?: FormPresentation): FieldPresentation => ({
  layout,
  showLabel: layout !== 'inline',
  showError: layout === 'full',
  isStatic: layout === 'static',
  // `contents` lets the parent grid own the field's rows; the seam for presentation-specific
  // wrappers (e.g. a future `table`/cell variant) lives here.
  fieldClassName: 'contents',
});

export type FieldRowProps = PropsWithChildren<{ presentation: FieldPresentation }>;

/**
 * Outer row element shared by every field's chrome. The single place the wrapping element and its
 * class are decided, so presentation variants don't fork the wrapper in each field component.
 */
export const FieldRow = ({ presentation, children }: FieldRowProps) => (
  <div className={presentation.fieldClassName}>{children}</div>
);
