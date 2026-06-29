//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { translationKey } from '#translations';

import { type IconButtonProps, IconButton } from './IconButton';
import { type ToggleIconButtonProps, ToggleIconButton } from './ToggleIconButton';

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
// Expander
//

const ExpanderIconButton = forwardRef<HTMLButtonElement, TogglePresetProps>(
  ({ label, active, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <ToggleIconButton
        {...props}
        active={active}
        icon='ph--caret-right--regular'
        label={label ?? t(active ? 'system-button.collapse.label' : 'system-button.expand.label')}
        ref={forwardedRef}
      />
    );
  },
);

ExpanderIconButton.displayName = 'SystemIconButton.Expander';

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
// Namespace
//

export const SystemIconButton = {
  Star: StarIconButton,
  Bookmark: BookmarkIconButton,
  Expander: ExpanderIconButton,
  Add: AddIconButton,
  Delete: DeleteIconButton,
  Edit: EditIconButton,
  Close: CloseIconButton,
};

export type { StaticPresetProps, TogglePresetProps };
