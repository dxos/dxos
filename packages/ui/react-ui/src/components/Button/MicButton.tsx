//
// Copyright 2026 DXOS.org
//

import React, { type PointerEvent, forwardRef, useCallback } from 'react';

import { IconButton, type IconButtonProps } from './IconButton';

export type MicButtonMode = 'toggle' | 'hold';

export type MicButtonProps = Omit<IconButtonProps, 'icon' | 'onClick'> & {
  /** Defaults to a microphone glyph. */
  icon?: IconButtonProps['icon'];
  /** Whether recording is active; drives the active (recording) styling. */
  recording?: boolean;
  /** `toggle`: click flips recording. `hold`: records only while held (push-to-talk). */
  mode?: MicButtonMode;
  /** Fired in `toggle` mode on click. */
  onToggle?: () => void;
  /** Fired in `hold` mode when the press begins. */
  onPressStart?: () => void;
  /** Fired in `hold` mode when the press ends (release, cancel, or lost capture). */
  onPressEnd?: () => void;
};

/**
 * Microphone record button. In `toggle` mode a click flips recording; in `hold` mode recording is
 * active only while the button is held (push-to-talk), using pointer capture so the release still
 * fires if the pointer leaves the button. Presentational — the caller owns recording state.
 */
export const MicButton = forwardRef<HTMLButtonElement, MicButtonProps>(
  (
    {
      classNames,
      icon = 'ph--microphone--regular',
      recording,
      mode = 'toggle',
      onToggle,
      onPressStart,
      onPressEnd,
      ...props
    },
    forwardedRef,
  ) => {
    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        // Capture so the matching release fires on this button even if the pointer leaves it.
        event.currentTarget.setPointerCapture(event.pointerId);
        onPressStart?.();
      },
      [onPressStart],
    );

    // Highlight with the error (rose) tone while recording.
    const recordingClassNames = recording ? 'bg-error-surface' : undefined;
    const holdHandlers =
      mode === 'hold'
        ? {
            onPointerDown: handlePointerDown,
            onPointerUp: onPressEnd,
            onPointerCancel: onPressEnd,
            onLostPointerCapture: onPressEnd,
          }
        : { onClick: onToggle };

    return (
      <IconButton
        {...props}
        {...holdHandlers}
        ref={forwardedRef}
        icon={icon}
        classNames={[recordingClassNames, classNames]}
      />
    );
  },
);
