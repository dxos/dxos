//
// Copyright 2026 DXOS.org
//

import React, {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { composeEventHandlers, useControllableState } from '@dxos/react-hooks';
import { AI_ACTION_ICON } from '@dxos/ui-types';
import { downloadBlob } from '@dxos/util';

import { translationKey } from '#translations';

import { composable } from '../../../util/index.ts';
import { Button, type ButtonContentProps, type ButtonVariantProps } from '../Button/index.ts';
import { RowContext } from '../Listbox/grid.ts';
import { Toggle } from '../Toggle/index.ts';
import { type TooltipSide } from '../Tooltip/index.ts';

/**
 * Every preset is a Button whose icon is fixed and whose label defaults from the `system-button.*` translations;
 * callers may still override `label`.
 */
export type SystemButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> &
  ButtonVariantProps & {
    label?: string;
    /** Only the icon, named by the label in a Tooltip (the default); `false` shows the label after the icon. */
    iconOnly?: boolean;
    /** Icon-only: opt out of the label Tooltip. */
    showTooltip?: boolean;
    /** Icon-only: the side the label Tooltip opens on. */
    tooltipSide?: TooltipSide;
  };

type PresetContent = Pick<SystemButtonProps, 'iconOnly' | 'showTooltip' | 'tooltipSide'> & {
  icon: string;
  label: string;
};

/** Button content for a preset: icon-only with its Tooltip unless `iconOnly` is false, when the label shows. */
const presetContent = ({
  icon,
  label,
  iconOnly = true,
  showTooltip,
  tooltipSide,
}: PresetContent): ButtonContentProps =>
  iconOnly ? { iconOnly: true, icon, label, showTooltip, tooltipSide } : { icon, label };

/** Star and Bookmark: a Toggle (`aria-pressed`) whose icon and label follow the pressed state. */
export type SystemTogglePresetProps = SystemButtonProps & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

type ToggleSpec = {
  icon: string;
  activeIcon: string;
  labelKey: string;
  activeLabelKey: string;
  iconValence?: 'warning';
};

const createTogglePreset = (
  displayName: string,
  { icon, activeIcon, labelKey, activeLabelKey, iconValence }: ToggleSpec,
) => {
  const Preset = composable<HTMLButtonElement, SystemTogglePresetProps>(
    (
      { label, iconOnly, showTooltip, tooltipSide, pressed: pressedProp, defaultPressed, onPressedChange, ...props },
      forwardedRef,
    ) => {
      const { t } = useTranslation(translationKey);
      // Owned here, not left to the toggle machine, because the label (not only the icon) follows the pressed state.
      const [pressed = false, setPressed] = useControllableState({
        prop: pressedProp,
        defaultProp: defaultPressed ?? false,
        onChange: onPressedChange,
      });
      return (
        <Toggle
          {...props}
          {...presetContent({
            icon,
            label: label ?? t(pressed ? activeLabelKey : labelKey),
            iconOnly,
            showTooltip,
            tooltipSide,
          })}
          activeIcon={activeIcon}
          pressed={pressed}
          onPressedChange={setPressed}
          data-icon-valence={pressed ? iconValence : undefined}
          ref={forwardedRef}
        />
      );
    },
  );
  Preset.displayName = displayName;
  return Preset;
};

const createStaticPreset = (
  displayName: string,
  icon: string,
  labelKey: string,
  defaults: Pick<SystemButtonProps, 'variant'> = {},
) => {
  const Preset = composable<HTMLButtonElement, SystemButtonProps>(
    ({ label, iconOnly, showTooltip, tooltipSide, ...props }, forwardedRef) => {
      const { t } = useTranslation(translationKey);
      return (
        <Button
          {...defaults}
          {...props}
          {...presetContent({ icon, label: label ?? t(labelKey), iconOnly, showTooltip, tooltipSide })}
          ref={forwardedRef}
        />
      );
    },
  );
  Preset.displayName = displayName;
  return Preset;
};

//
// Toggles
//

const Star = createTogglePreset('SystemButton.Star', {
  icon: 'ph--star--regular',
  activeIcon: 'ph--star--fill',
  labelKey: 'system-button.star.label',
  activeLabelKey: 'system-button.unstar.label',
  iconValence: 'warning',
});

const Bookmark = createTogglePreset('SystemButton.Bookmark', {
  icon: 'ph--bookmark-simple--regular',
  activeIcon: 'ph--bookmark-simple--fill',
  labelKey: 'system-button.bookmark.label',
  activeLabelKey: 'system-button.unbookmark.label',
});

//
// Disclosure
//

export type SystemDisclosureProps = SystemButtonProps & {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

/**
 * Shows and hides a region — the WAI-ARIA disclosure pattern, so it reports `aria-expanded` rather than the
 * `aria-pressed` of a toggle. Give it `aria-controls` at the call site, where the region's id is known. Its caret
 * turns a quarter while expanded (`theme/system-button.css`).
 */
const Disclosure = composable<HTMLButtonElement, SystemDisclosureProps>(
  (
    {
      label,
      iconOnly,
      showTooltip,
      tooltipSide,
      expanded: expandedProp,
      defaultExpanded,
      onExpandedChange,
      onClick,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const [expanded = false, setExpanded] = useControllableState({
      prop: expandedProp,
      defaultProp: defaultExpanded ?? false,
      onChange: onExpandedChange,
    });
    return (
      <Button
        {...props}
        {...presetContent({
          icon: 'ph--caret-right--regular',
          label: label ?? t(expanded ? 'system-button.close.label' : 'system-button.open.label'),
          iconOnly,
          showTooltip,
          tooltipSide,
        })}
        aria-expanded={expanded}
        data-disclosure=''
        onClick={composeEventHandlers(onClick, () => setExpanded(!expanded))}
        ref={forwardedRef}
      />
    );
  },
);

Disclosure.displayName = 'SystemButton.Disclosure';

//
// Static
//

const Add = createStaticPreset('SystemButton.Add', 'ph--plus--regular', 'system-button.add.label');

/** The button form of {@link AI_ACTION_ICON}, which metadata call sites take as a string instead. */
const Ai = createStaticPreset('SystemButton.Ai', AI_ACTION_ICON, 'system-button.ai.label');

const Close = createStaticPreset('SystemButton.Close', 'ph--x--regular', 'system-button.close.label');

/** Commits a form or dialog; `primary` by default, and usually labelled (`iconOnly={false}`) in a footer. */
const Save = createStaticPreset('SystemButton.Save', 'ph--check--regular', 'system-button.save.label', {
  variant: 'primary',
});

/** Abandons a form or dialog; the glyph is Close's, the label and intent differ. */
const Cancel = createStaticPreset('SystemButton.Cancel', 'ph--x--regular', 'system-button.cancel.label');

const Delete = createStaticPreset('SystemButton.Delete', 'ph--trash--regular', 'system-button.delete.label');

/**
 * Takes a row out of a list without destroying what it names; the glyph is Close's, the intent Delete's. In a list row
 * it is named by its label followed by the row's `ItemText` ("Delete Q3 budget"); a `label` replaces both.
 */
const Remove = composable<HTMLButtonElement, SystemButtonProps>(
  ({ label, iconOnly, showTooltip, tooltipSide, id, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const row = useContext(RowContext);
    const generatedId = useId();
    const ownId = id ?? generatedId;
    const labelledBy =
      label === undefined && row && props['aria-labelledby'] === undefined ? `${ownId} ${row.textId}` : undefined;
    return (
      <Button
        aria-labelledby={labelledBy}
        {...props}
        id={ownId}
        {...presetContent({
          icon: 'ph--x--regular',
          label: label ?? t('system-button.remove.label'),
          iconOnly,
          showTooltip,
          tooltipSide,
        })}
        ref={forwardedRef}
      />
    );
  },
);

Remove.displayName = 'SystemButton.Remove';

const Edit = createStaticPreset('SystemButton.Edit', 'ph--pen--regular', 'system-button.edit.label');

//
// Clipboard
//

/** Copy a fixed `value`, or text produced on click by `onCopy` when it is costly or changes. */
export type SystemClipboardProps = SystemButtonProps & {
  /** The glyph shown until a copy lands; the clipboard by default. */
  icon?: string;
} & ({ value: string; onCopy?: never } | { onCopy: () => string; value?: never });

const Clipboard = composable<HTMLButtonElement, SystemClipboardProps>(
  (
    { label, iconOnly, showTooltip, tooltipSide, value, onCopy, icon = 'ph--clipboard--regular', onClick, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Confirmed only once the write resolves: `writeText` rejects when the document is unfocused or permission is
    // refused, and feedback shown before that would report a copy that never happened.
    const handleCopy = useCallback(() => {
      const text = onCopy ? onCopy() : value;
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
    }, [onCopy, value]);

    // The pending reset would otherwise set state on an unmounted component.
    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    return (
      <Button
        {...props}
        {...presetContent({
          icon: copied ? 'ph--check--regular' : icon,
          label: copied ? t('system-button.copied.label') : (label ?? t('system-button.clipboard.label')),
          iconOnly,
          showTooltip,
          tooltipSide,
        })}
        data-icon-valence={copied ? 'success' : undefined}
        onClick={composeEventHandlers(onClick, handleCopy)}
        ref={forwardedRef}
      />
    );
  },
);

Clipboard.displayName = 'SystemButton.Clipboard';

//
// Upload
//

export type SystemUploadProps = SystemButtonProps &
  Pick<InputHTMLAttributes<HTMLInputElement>, 'accept' | 'multiple'> & {
    onFileChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  };

const Upload = composable<HTMLButtonElement, SystemUploadProps>(
  ({ accept, multiple, onFileChange, label, iconOnly, showTooltip, tooltipSide, onClick, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
      <>
        <input hidden type='file' accept={accept} multiple={multiple} onChange={onFileChange} ref={fileInputRef} />
        <Button
          {...props}
          {...presetContent({
            icon: 'ph--upload-simple--regular',
            label: label ?? t('system-button.upload.label'),
            iconOnly,
            showTooltip,
            tooltipSide,
          })}
          onClick={composeEventHandlers(onClick, () => fileInputRef.current?.click())}
          ref={forwardedRef}
        />
      </>
    );
  },
);

Upload.displayName = 'SystemButton.Upload';

//
// Download
//

export type SystemDownloadProps = SystemButtonProps & {
  filename: string;
  /** The blob may be produced asynchronously (e.g. serialized from a query) or synchronously. */
  onDownload: () => Blob | null | Promise<Blob | null>;
};

const Download = composable<HTMLButtonElement, SystemDownloadProps>(
  ({ filename, onDownload, label, iconOnly, showTooltip, tooltipSide, onClick, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const handleDownload = useCallback(async () => {
      try {
        const blob = await onDownload();
        if (!blob) {
          return;
        }

        await downloadBlob(blob, filename);
      } catch {
        // Best-effort: the click handler discards this promise, so a failure must not surface as unhandled.
      }
    }, [onDownload, filename]);
    return (
      <Button
        {...props}
        {...presetContent({
          icon: 'ph--download-simple--regular',
          label: label ?? t('system-button.download.label'),
          iconOnly,
          showTooltip,
          tooltipSide,
        })}
        onClick={composeEventHandlers(onClick, () => void handleDownload())}
        ref={forwardedRef}
      />
    );
  },
);

Download.displayName = 'SystemButton.Download';

//
// Mic
//

export type SystemMicMode = 'toggle' | 'hold';

export type SystemMicProps = Omit<SystemButtonProps, 'label' | 'onClick'> & {
  /** Required: there is no default, since the caller's recording state decides it (e.g. "Start"/"Stop recording"). */
  label: string;
  /** `toggle`: a click flips recording. `hold`: records only while held (push-to-talk). */
  mode?: SystemMicMode;
  /** Whether recording is active; fills the button with the error hue. */
  recording?: boolean;
  /** Fired in `toggle` mode on click. */
  onToggle?: () => void;
  /** Fired in `hold` mode when the press begins. */
  onPressStart?: () => void;
  /** Fired in `hold` mode when the press ends (release, cancel, or lost capture). */
  onPressEnd?: () => void;
};

/**
 * Microphone record button; presentational, the caller owns recording state. `hold` mode uses pointer capture so the
 * release still arrives if the pointer leaves the button.
 */
const Mic = composable<HTMLButtonElement, SystemMicProps>(
  (
    {
      label,
      iconOnly,
      showTooltip,
      tooltipSide,
      mode = 'toggle',
      recording,
      onToggle,
      onPressStart,
      onPressEnd,
      ...props
    },
    forwardedRef,
  ) => {
    // A press spans down→up; the guard fires start/end once though a release arrives as both `pointerup` and
    // `lostpointercapture`.
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
        // Primary button only: other buttons do not activate a button, and their release would not end the press.
        if (event.button !== 0) {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        beginPress();
      },
      [beginPress],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLButtonElement>) => {
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

    const handlers =
      mode === 'hold'
        ? {
            onPointerDown: handlePointerDown,
            onPointerUp: endPress,
            onPointerCancel: endPress,
            onLostPointerCapture: endPress,
            onKeyDown: handleKeyDown,
            onKeyUp: handleKeyUp,
            // Focus leaving mid-hold (e.g. tabbing away) must still end the press.
            onBlur: endPress,
          }
        : { onClick: onToggle };

    return (
      <Button
        {...props}
        {...handlers}
        {...presetContent({
          icon: recording ? 'ph--microphone--duotone' : 'ph--microphone--regular',
          label,
          iconOnly,
          showTooltip,
          tooltipSide,
        })}
        hue={recording ? 'error' : props.hue}
        ref={forwardedRef}
      />
    );
  },
);

Mic.displayName = 'SystemButton.Mic';

//
// Namespace
//

/** Button and Toggle presets with fixed icons, translated default labels and built-in behaviour; icon-only by default. */
export const SystemButton = {
  Add,
  Ai,
  Bookmark,
  Cancel,
  Clipboard,
  Close,
  Delete,
  Disclosure,
  Download,
  Edit,
  Mic,
  Remove,
  Save,
  Star,
  Upload,
};
