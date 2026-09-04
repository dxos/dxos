//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Density } from '@dxos/ui-types';

export type EditableStyleProps = Partial<{
  density: Density;
}>;

/**
 * Preview and input must occupy the same box, or the text jumps the moment it becomes editable —
 * the defect this component exists to avoid. Every metric that decides where a glyph lands is
 * declared once here and worn by both: the control's height and leading, its inline pad, and the
 * type scale. Neither part may set these on its own.
 */
// `text-base` precedes the leading deliberately: it carries a line-height of its own, and
// tailwind-merge drops whichever comes first, so the control's leading has to have the last word.
const shared = 'min-h-(--dx-control) px-(--dx-control-pad) text-base leading-(--dx-control-leading)';

const root: ComponentFunction<EditableStyleProps> = (_props, ...etc) => mx('grid w-full min-w-0', ...etc);

// Emptiness and disabled state are the machine's to report, so they are read off the attributes it
// stamps rather than passed in: `data-[disabled]:hover:` outranks the plain `hover:` it overrides.
const preview: ComponentFunction<EditableStyleProps> = (_props, ...etc) =>
  mx(
    shared,
    // The preview centres its single line exactly as an `<input>` does, so the swap moves nothing.
    'group/editable flex items-center gap-1 w-full min-w-0 rounded-xs cursor-text',
    'border border-transparent',
    'data-[placeholder-shown]:text-placeholder',
    'hover:bg-focus-surface',
    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent',
    ...etc,
  );

// Wears the same surface as `Input`'s default variant rather than the browser's, which is white in
// any theme. The preview reserves a transparent border of the same width, so the box this draws
// appears without moving the text inside it.
const input: ComponentFunction<EditableStyleProps> = (_props, ...etc) =>
  mx(shared, 'py-0 w-full min-w-0 text-base-fg placeholder-placeholder dx-input', ...etc);

/** Shown only while the preview is hovered or focused, so a resting row is just its text. */
const previewIcon: ComponentFunction<EditableStyleProps> = (_props, ...etc) =>
  mx('shrink-0 text-subdued invisible', 'group-hover/editable:visible group-focus-visible/editable:visible', ...etc);

export const editableTheme = {
  root,
  preview,
  previewIcon,
  input,
};
