//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type PointerEvent, forwardRef, useCallback, useRef } from 'react';

import { IconButton, type IconButtonProps } from './IconButton';

export type MicButtonMode = 'toggle' | 'hold';

export type MicButtonProps = Omit<IconButtonProps, 'icon' | 'onClick'> & {
  /** Defaults to a microphone glyph. */
  icon?: IconButtonProps['icon'];
  /** `toggle`: click flips recording. `hold`: records only while held (push-to-talk). */
  mode?: MicButtonMode;
  /** Whether recording is active; drives the active (recording) styling. */
  recording?: boolean;
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
      mode = 'toggle',
      recording,
      onToggle,
      onPressStart,
      onPressEnd,
      ...props
    },
    forwardedRef,
  ) => {
    // A press spans pointer down→up (or key down→up). The guard makes start/end fire exactly once
    // even though release surfaces as both `pointerup` and `lostpointercapture`.
    const pressedRef = useRef(false);
    const beginPress = useCallback(() => {
      if (!pressedRef.current) {
        pressedRef.current = true;
        onPressStart?.();
      }
    }, [onPressStart]);

    const endPress = useCallback(() => {
      if (pressedRef.current) {
        pressedRef.current = false;
        onPressEnd?.();
      }
    }, [onPressEnd]);
    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        // Capture so the matching release fires on this button even if the pointer leaves it.
        event.currentTarget.setPointerCapture(event.pointerId);
        beginPress();
      },
      [beginPress],
    );
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLButtonElement>) => {
        // Keyboard push-to-talk: hold Space/Enter to record. Ignore auto-repeat.
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          beginPress();
        }
      },
      [beginPress],
    );
    const handleKeyUp = useCallback(
      (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          endPress();
        }
      },
      [endPress],
    );

    // Highlight with the error (rose) tone while recording.
    const recordingClassNames = recording ? 'bg-error-surface' : undefined;
    const holdHandlers =
      mode === 'hold'
        ? {
            onPointerDown: handlePointerDown,
            onPointerUp: endPress,
            onPointerCancel: endPress,
            onLostPointerCapture: endPress,
            onKeyDown: handleKeyDown,
            onKeyUp: handleKeyUp,
            // Releasing focus mid-hold (e.g. tabbing away) must still end the press.
            onBlur: endPress,
          }
        : {
            onClick: onToggle,
          };

    return (
      <IconButton
        {...props}
        {...holdHandlers}
        classNames={[recordingClassNames, classNames]}
        icon={icon}
        ref={forwardedRef}
      />
    );
  },
);
