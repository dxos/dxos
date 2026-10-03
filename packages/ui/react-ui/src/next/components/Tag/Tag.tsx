//
// Copyright 2026 DXOS.org
//

import React, { type HTMLAttributes, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { composable, composableProps } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

export type TagHue = NeutralPalette | ChromaticPalette | MessageValence;

export type TagProps = HTMLAttributes<HTMLElement> & {
  /** Maps to ui-theme's `--color-<hue>-surface`/`-fg` tokens; valences use the same hues as the current `Tag`. */
  hue?: TagHue;
  /**
   * Adds a trailing × delete trigger (Ark TagsInput's "delete trigger") inside the pill; a clickable tag also calls it
   * on Backspace or Delete.
   */
  onDelete?: () => void;
  /** Overrides the delete trigger's translated `tag.delete.label` ("Remove <text>"). */
  deleteLabel?: string;
};

/** Keys that delete a focused clickable tag, as in a tags input. */
const DELETE_KEYS = ['Backspace', 'Delete'];

/**
 * A small pill one inset shorter than a control, so it sits inside a control or a block row. With neither `onClick`
 * nor `onDelete` it is a plain span. With `onClick` alone the root is a `<button>`. With `onDelete` the root is a span
 * holding the text (inside a `<button>` part `trigger` when `onClick` is also set) and a sibling `<button>` part
 * `delete-trigger`, so a button never nests inside another.
 */
export const Tag = composable<HTMLElement, TagProps>(
  ({ hue = 'neutral', onClick, onKeyDown, onDelete, deleteLabel, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const ref = useComposedRefs<HTMLElement>(forwardedRef);
    const { className, ...rest } = composableProps(props, { classNames: recipes.tag() });
    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event);
      if (onDelete && !event.defaultPrevented && DELETE_KEYS.includes(event.key)) {
        event.preventDefault();
        onDelete();
      }
    };

    if (!onDelete) {
      return onClick ? (
        <button
          type='button'
          {...rest}
          onClick={onClick}
          onKeyDown={onKeyDown}
          data-hue={hue}
          data-scope='tag'
          data-part='root'
          data-clickable=''
          className={mx(className, recipes.tagClickable())}
          ref={ref}
        >
          {children}
        </button>
      ) : (
        <span
          {...rest}
          onKeyDown={onKeyDown}
          data-hue={hue}
          data-scope='tag'
          data-part='root'
          className={className}
          ref={ref}
        >
          {children}
        </span>
      );
    }

    const label = deleteLabel ?? t('tag.delete.label', { label: typeof children === 'string' ? children : '' }).trim();
    return (
      <span
        {...rest}
        onKeyDown={onKeyDown}
        data-hue={hue}
        data-scope='tag'
        data-part='root'
        className={className}
        ref={ref}
      >
        {onClick ? (
          <button
            type='button'
            onClick={onClick}
            onKeyDown={handleKeyDown}
            data-scope='tag'
            data-part='trigger'
            className={recipes.tagTrigger()}
          >
            {children}
          </button>
        ) : (
          children
        )}
        <button
          type='button'
          aria-label={label}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            // A tag inside a clickable row or card must not activate it too.
            event.stopPropagation();
            onDelete();
          }}
          data-scope='tag'
          data-part='delete-trigger'
          className={recipes.tagDeleteTrigger()}
        >
          <Icon icon='ph--x--regular' />
        </button>
      </span>
    );
  },
);

Tag.displayName = 'Next.Tag';
