//
// Copyright 2026 DXOS.org
//

/**
 * Increment for a number field's stepper buttons and arrow keys. Here rather than in the form package so a
 * model schema can declare it without depending on React.
 */
export const StepAnnotationId = '@dxos/schema/annotation/Step';

/** How a number field lays out: its size, figures aligned to the row's end, and steppers shown only on hover or focus. */
export type NumberLayout = {
  align?: 'start' | 'end';
  stepperOnHover?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
};

/** A number field's {@link NumberLayout}; a vector's axes declare it so their figures line up in columns. */
export const NumberLayoutAnnotationId = '@dxos/schema/annotation/NumberLayout';

/** A vector's axes, in 2D and 3D alike: small, figures aligned in columns, steppers out of the way until hovered. */
export const VECTOR_AXIS_LAYOUT: NumberLayout = { align: 'end', stepperOnHover: true, size: 'sm' };
