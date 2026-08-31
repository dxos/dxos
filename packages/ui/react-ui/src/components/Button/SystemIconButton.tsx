//
// Copyright 2026 DXOS.org
//

import React, { InputHTMLAttributes, forwardRef, useCallback, useRef, useState } from 'react';
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
  ({ label, onCopy, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [copied, setCopied] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const handleCopy = useCallback(() => {
      const text = onCopy();
      if (text) {
        setCopied(true);
        void navigator.clipboard.writeText(text);
      }

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1_000);

      return () => clearTimeout(timeoutRef.current);
    }, [onCopy, setCopied]);

    return (
      <IconButton
        {...props}
        classNames={copied && 'text-green-500'}
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
// Namespace
//

export const SystemIconButton = {
  Add: AddIconButton,
  Ai: AiIconButton,
  Bookmark: BookmarkIconButton,
  Close: CloseIconButton,
  Clipboard: ClipboardIconButton,
  Delete: DeleteIconButton,
  Download: DownloadIconButton,
  Edit: EditIconButton,
  Disclosure: DisclosureIconButton,
  Star: StarIconButton,
  Upload: UploadIconButton,
};

export type {
  ClipboardIconButtonProps,
  DownloadIconButtonProps,
  StaticPresetProps,
  TogglePresetProps,
  UploadIconButtonProps,
};
