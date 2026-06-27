//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

import { Domino } from '@dxos/ui';
import { hues } from '@dxos/ui-theme';
import { type ChromaticPalette } from '@dxos/ui-types';

/**
 * Reusable, hue-tinted text markers for CodeMirror decorations (shared by comments and pending-text).
 * The tint is driven by a `data-hue` attribute holding a standard ui-theme hue, mapped to the
 * `--color-<hue>-*` tokens — rather than hardcoded per-feature CSS variables.
 */
export type MarkerHue = ChromaticPalette;

const MARKED = ['.cm-marker > span', '.cm-marker-text'].join(', ');

// Map `data-hue` to the standard ui-theme surface/foreground tokens (one rule per hue).
const hueVars = Object.fromEntries(
  hues.flatMap((hue) =>
    ['.cm-marker', '.cm-marker-text'].map((selector) => [
      `${selector}[data-hue="${hue}"]`,
      {
        '--cm-marker-surface': `var(--color-${hue}-surface)`,
        '--cm-marker-text': `var(--color-${hue}-fg)`,
      },
    ]),
  ),
);

/**
 * Shared theme for hue-tinted markers and their inline button affordances. Include once per editor;
 * both `markerMark` (range marks) and `markerText` (widget spans) read from it.
 */
export const markerTheme = (): Extension =>
  EditorView.theme({
    ...hueVars,
    // The comment-style surface "padding" is a box-shadow of the same colour so adjacent lines join.
    [MARKED]: {
      boxDecorationBreak: 'clone',
      backgroundColor: 'var(--cm-marker-surface)',
      boxShadow: '0 0 0 3px var(--cm-marker-surface)',
      color: 'var(--cm-marker-text) !important',
      borderRadius: '0.25rem',
    },
    // `inline-block` (not flex) so the finalized + interim spans flow as one continuous block.
    '.cm-marker-text': {
      display: 'inline-block',
    },
    // Align a trailing icon (e.g. the recording spinner) with the text.
    '.cm-marker-text svg': {
      verticalAlign: '-0.15em',
      marginInlineStart: '0.25rem',
    },
    '.cm-marker-buttons': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
    },
    '.cm-marker-button': {
      display: 'inline-flex',
      padding: '4px',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    '.cm-marker-button:hover': {
      backgroundColor: 'var(--color-hover-bg)',
    },
    '.cm-marker-button-success:hover': {
      backgroundColor: 'var(--color-success-bg)',
    },
    '.cm-marker-button-error:hover': {
      backgroundColor: 'var(--color-error-bg)',
    },
  });

/** Range mark tinted by hue (used by comments to highlight a selection). */
export const markerMark = (hue: MarkerHue, options: { class?: string; attributes?: Record<string, string> } = {}) =>
  Decoration.mark({
    class: ['cm-marker', options.class].filter(Boolean).join(' '),
    attributes: { 'data-hue': hue, ...options.attributes },
  });

export type MarkerTextOptions = {
  hue: MarkerHue;
  className?: string;
  /** Optional trailing icon (e.g. a recording indicator). */
  icon?: string;
  /** Extra classes for the trailing icon (e.g. `animate-spin`). */
  iconClassNames?: string;
};

/** A hue-tinted text span for use inside widgets; optionally trailed by an icon. */
export const markerText = (
  text: string,
  { hue, className, icon, iconClassNames }: MarkerTextOptions,
): Domino<HTMLElement> => {
  const span = Domino.of('span')
    .classNames('cm-marker-text', className)
    .attributes({ 'data-hue': hue })
    .append(Domino.of('span').text(text));
  if (icon) {
    // Preserve the sprite sizing (`Domino.svg` sets `h-[1em] w-[1em]`) since `classNames` replaces.
    span.append(Domino.svg(icon).classNames('shrink-0 h-[1em] w-[1em]', iconClassNames));
  }

  return span;
};

export type MarkerButton = {
  icon: string;
  label: string;
  className?: string;
  testId?: string;
  onClick: () => void;
};

/** Inline group of icon buttons (e.g. confirm/cancel affordances). */
export const markerButtons = (buttons: MarkerButton[]): Domino<HTMLElement> =>
  Domino.of('span')
    .classNames('cm-marker-buttons')
    .append(
      ...buttons.map((button) =>
        Domino.of('button')
          .classNames('cm-marker-button', button.className)
          .attributes({
            type: 'button',
            'aria-label': button.label,
            ...(button.testId ? { 'data-testid': button.testId } : {}),
          })
          .append(Domino.svg(button.icon))
          // `mousedown` + preventDefault so clicking the affordance does not steal the editor selection.
          .on('mousedown', (event) => {
            event.preventDefault();
            button.onClick();
          }),
      ),
    );
