//
// Copyright 2026 DXOS.org
//

import React, {
  InputHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { AI_ACTION_ICON } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { IconButton, type IconButtonProps } from './IconButton';
import { ToggleIconButton, type ToggleIconButtonProps } from './ToggleIconButton';

// Static presets fix the icon and default the label; callers can still override `label`.
type StaticPresetProps = Omit<IconButtonProps, 'icon' | 'label'> & { label?: string };

// Stateful presets fix both icons so a call site cannot supply a conflicting glyph.
type TogglePresetProps = Omit<ToggleIconButtonProps, 'icon' | 'activeIcon' | 'label'> & { label?: string };

//
// Star
//

const StarIconButton = forwardRef<HTMLButtonElement, TogglePresetProps>(({ label, active, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <ToggleIconButton
      {...props}
      active={active}
      icon='ph--star--regular'
      activeIcon='ph--star--fill'
      label={label ?? t(active ? 'system-button.unstar.label' : 'system-button.star.label')}
      classNames={active && 'text-yellow-500'}
      ref={forwardedRef}
    />
  );
});

StarIconButton.displayName = 'SystemIconButton.Star';

//
// Bookmark
//

const BookmarkIconButton = forwardRef<HTMLButtonElement, TogglePresetProps>(
  ({ label, active, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <ToggleIconButton
        {...props}
        active={active}
        icon='ph--bookmark-simple--regular'
        activeIcon='ph--bookmark-simple--fill'
        label={label ?? t(active ? 'system-button.unbookmark.label' : 'system-button.bookmark.label')}
        ref={forwardedRef}
      />
    );
  },
);

BookmarkIconButton.displayName = 'SystemIconButton.Bookmark';

//
// Disclosure
//

/**
 * Shows and hides a region — the WAI-ARIA disclosure pattern, which is why it reports
 * `aria-expanded` rather than the `aria-pressed` a toggle button (Star, Bookmark) carries. Give it
 * `aria-controls` at the call site where the region has an id: this preset cannot know it.
 */
const DisclosureIconButton = forwardRef<HTMLButtonElement, TogglePresetProps>(
  ({ label, active, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <ToggleIconButton
        {...props}
        active={active}
        aria-expanded={active ?? false}
        icon='ph--caret-right--regular'
        label={label ?? t(active ? 'system-button.collapse.label' : 'system-button.expand.label')}
        ref={forwardedRef}
      />
    );
  },
);

DisclosureIconButton.displayName = 'SystemIconButton.Disclosure';

//
// Add
//

const AddIconButton = forwardRef<HTMLButtonElement, StaticPresetProps>(({ label, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <IconButton {...props} icon='ph--plus--regular' label={label ?? t('system-button.add.label')} ref={forwardedRef} />
  );
});

AddIconButton.displayName = 'SystemIconButton.Add';

//
// AI
//

/** The button form of {@link AI_ACTION_ICON}, which metadata call sites take as a string instead. */
const AiIconButton = forwardRef<HTMLButtonElement, StaticPresetProps>(({ label, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <IconButton {...props} icon={AI_ACTION_ICON} label={label ?? t('system-button.ai.label')} ref={forwardedRef} />
  );
});

AiIconButton.displayName = 'SystemIconButton.Ai';

//
// Delete
//

const DeleteIconButton = forwardRef<HTMLButtonElement, StaticPresetProps>(({ label, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <IconButton
      {...props}
      icon='ph--trash--regular'
      label={label ?? t('system-button.delete.label')}
      ref={forwardedRef}
    />
  );
});

DeleteIconButton.displayName = 'SystemIconButton.Delete';

//
// Edit
//

const EditIconButton = forwardRef<HTMLButtonElement, StaticPresetProps>(({ label, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <IconButton {...props} icon='ph--pen--regular' label={label ?? t('system-button.edit.label')} ref={forwardedRef} />
  );
});

EditIconButton.displayName = 'SystemIconButton.Edit';

//
// Close
//

const CloseIconButton = forwardRef<HTMLButtonElement, StaticPresetProps>(({ label, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <IconButton {...props} icon='ph--x--regular' label={label ?? t('system-button.close.label')} ref={forwardedRef} />
  );
});

CloseIconButton.displayName = 'SystemIconButton.Close';

//
// Clipboard
//

type ClipboardIconButtonProps = StaticPresetProps & {
  onCopy: () => string;
};

const ClipboardIconButton = forwardRef<HTMLButtonElement, ClipboardIconButtonProps>(
  ({ label, onCopy, classNames, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [copied, setCopied] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    // Confirmed only once the write resolves: `writeText` rejects when the document is not focused
    // or the permission is refused, and a checkmark shown before that reports a copy that never
    // happened — besides leaving the rejection unhandled.
    const handleCopy = useCallback(() => {
      const text = onCopy();
      if (!text) {
        return;
      }

      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setCopied(false), 1_000);
        })
        .catch(() => setCopied(false));
    }, [onCopy]);

    // The pending reset outlives an unmount otherwise, setting state on a gone component.
    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    return (
      <IconButton
        {...props}
        classNames={[copied && 'text-green-500', classNames]}
        icon={copied ? 'ph--check--regular' : 'ph--clipboard--regular'}
        label={label ?? t('system-button.clipboard.label')}
        onClick={handleCopy}
        ref={forwardedRef}
      />
    );
  },
);

ClipboardIconButton.displayName = 'SystemIconButton.Clipboard';

//
// Upload
//

type UploadIconButtonProps = StaticPresetProps &
  Pick<InputHTMLAttributes<HTMLInputElement>, 'accept'> & {
    onFileChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  };

const UploadIconButton = forwardRef<HTMLButtonElement, UploadIconButtonProps>(
  ({ accept, onFileChange, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
      <>
        <input className='sr-only' type='file' accept={accept} onChange={onFileChange} ref={fileInputRef} />
        <IconButton
          icon='ph--upload-simple--regular'
          label={label ?? t('system-button.upload.label')}
          {...props}
          onClick={() => fileInputRef.current?.click()}
          ref={forwardedRef}
        />
      </>
    );
  },
);

UploadIconButton.displayName = 'SystemIconButton.Upload';

//
// Download
//

type DownloadIconButtonProps = StaticPresetProps & {
  filename: string;
  // Blob may be produced asynchronously (e.g. serialized from a query) or synchronously.
  onDownload: () => Blob | null | Promise<Blob | null>;
};

const DownloadIconButton = forwardRef<HTMLButtonElement, DownloadIconButtonProps>(
  ({ filename, onDownload, label, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const handleDownload = useCallback(async () => {
      try {
        const blob = await onDownload();
        if (!blob) {
          return;
        }

        const url = URL.createObjectURL(blob);

        // TODO(burdon): Use Domino.
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
      } catch {
        // Best-effort: blob generation or the download click may fail; swallow to avoid an unhandled
        // promise rejection (the click handler discards the returned promise with `void`).
      }
    }, [onDownload, filename]);
    return (
      <IconButton
        icon='ph--download-simple--regular'
        label={label ?? t('system-button.download.label')}
        {...props}
        onClick={() => void handleDownload()}
        ref={forwardedRef}
      />
    );
  },
);

DownloadIconButton.displayName = 'SystemIconButton.Download';

//
// Mic
//

type MicButtonMode = 'toggle' | 'hold';

type MicIconButtonProps = Omit<IconButtonProps, 'icon' | 'onClick'> & {
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
const MicIconButton = forwardRef<HTMLButtonElement, MicIconButtonProps>(
  ({ classNames, mode = 'toggle', recording, onToggle, onPressStart, onPressEnd, ...props }, forwardedRef) => {
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
        // Primary button only: a right- or middle-click does not activate a button, so it must not
        // start recording either — and its release would not arrive as the `pointerup` that ends it.
        if (event.button !== 0) {
          return;
        }
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
    const recordingClassNames = recording ? 'bg-error-surface text-error-fg' : undefined;
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
        icon={recording ? 'ph--microphone--duotone' : 'ph--microphone--regular'}
        ref={forwardedRef}
      />
    );
  },
);

MicIconButton.displayName = 'SystemIconButton.Mic';

//
// Namespace
//

export const SystemIconButton = {
  Add: AddIconButton,
  Ai: AiIconButton,
  Bookmark: BookmarkIconButton,
  Clipboard: ClipboardIconButton,
  Close: CloseIconButton,
  Delete: DeleteIconButton,
  Disclosure: DisclosureIconButton,
  Download: DownloadIconButton,
  Edit: EditIconButton,
  Mic: MicIconButton,
  Star: StarIconButton,
  Upload: UploadIconButton,
};

export type {
  ClipboardIconButtonProps,
  DownloadIconButtonProps,
  MicButtonMode,
  MicIconButtonProps,
  StaticPresetProps,
  TogglePresetProps,
  UploadIconButtonProps,
};
