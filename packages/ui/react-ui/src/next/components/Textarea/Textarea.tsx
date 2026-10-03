//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, { type TextareaHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import * as Fieldset from '../Fieldset/Fieldset.tsx';

/** Fewest lines a textarea shows, so it never reads as a single-line Input. */
const MIN_ROWS = 3;

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Grow with the content from `rows` lines (at least 3) instead of scrolling. */
  autoResize?: boolean;
  /** `subdued` drops the well, as Input's. */
  variant?: 'default' | 'subdued';
};

/** Multi-line text at control width; inside a `Field.Root` it takes the field's id, label and description wiring. */
export const Textarea = composable<HTMLTextAreaElement, TextareaProps>(
  ({ rows = MIN_ROWS, autoResize = false, variant = 'default', disabled, ...props }, forwardedRef) => {
    const fieldsetDisabled = Fieldset.useFieldsetDisabled(disabled);
    const { className, ...rest } = composableProps(props, { classNames: recipes.textarea() });
    return (
      <FieldPrimitive.Textarea
        {...rest}
        disabled={fieldsetDisabled}
        // Auto-resize measures from `height: auto`, where `rows` sets the intrinsic height, so rows stay the minimum.
        rows={Math.max(rows, MIN_ROWS)}
        autoresize={autoResize}
        data-scope='textarea'
        data-part='root'
        data-variant={variant}
        className={className}
        ref={forwardedRef}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
