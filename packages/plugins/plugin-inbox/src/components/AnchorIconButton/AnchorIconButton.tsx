//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type URI } from '@dxos/keys';
import { DxAnchorActivate, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Icon-only button that opens an ECHO object's preview card via `DxAnchorActivate`
 * (handled by the deck plugin / anchor preview surface). When `value` is missing the
 * button falls back to `onClick`, letting callers wire a "create"-style action for the
 * not-yet-existing case (e.g. `UserIconButton` uses this for the create-contact path).
 *
 * Generalized from `UserIconButton` — any noun that has a DXN can use this for the
 * "icon column" pattern in lists (sender row, extracted-relation rows, etc.).
 */
export type AnchorIconButtonProps = ThemedClassName<{
  /** Phosphor icon shown when `value` is present. */
  icon: string;
  /** Phosphor icon shown when `value` is absent. Defaults to `icon`. */
  fallbackIcon?: string;
  /** Accessible label when `value` is present. */
  label: string;
  /** Accessible label when `value` is absent. Defaults to `label`. */
  fallbackLabel?: string;
  /** DXN of the target object — opens the card preview on click via `DxAnchorActivate`. */
  value?: URI.URI;
  /** Optional title passed to the DxAnchorActivate event (shown in the preview header). */
  title?: string;
  /** Fallback action when no `value` is provided. */
  onClick?: () => void;
  /** IconButton size; defaults to 4 (matches UserIconButton). */
  size?: 4 | 5 | 6;
  /**
   * Render content-height (rail-width) rather than a full rail-height square — for dense, repeated
   * rows (e.g. event attendees) so the icon aligns with `IconBlock compact` decorative icons.
   */
  compact?: boolean;
}>;

export const AnchorIconButton = ({
  classNames,
  icon,
  fallbackIcon,
  label,
  fallbackLabel,
  value,
  title,
  onClick,
  size = 4,
  compact,
}: AnchorIconButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleClick = useCallback(() => {
    if (value) {
      buttonRef.current?.dispatchEvent(
        new DxAnchorActivate({
          trigger: buttonRef.current,
          dxn: value.toString(),
          label: 'never',
          kind: 'card',
          title,
        }),
      );
    } else {
      onClick?.();
    }
  }, [value, title, onClick]);

  return (
    <IconButton
      ref={buttonRef}
      variant='ghost'
      disabled={!value && !onClick}
      icon={value ? icon : (fallbackIcon ?? icon)}
      iconOnly
      size={size}
      label={value ? label : (fallbackLabel ?? label)}
      classNames={mx(compact && 'min-h-0 p-0 w-(--dx-rail-item)', classNames)}
      onClick={handleClick}
    />
  );
};
