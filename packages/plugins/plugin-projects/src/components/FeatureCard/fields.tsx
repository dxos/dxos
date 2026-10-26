//
// Copyright 2026 DXOS.org
//

import React, {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
} from 'react';

import { useMasonryTileRevealed } from '@dxos/react-ui-masonry';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type FeatureStatus } from './feature.ts';

export const FEATURE_STATUS_STYLE: Record<FeatureStatus, { icon: string; hue: Tag.TagHue }> = {
  'planned': { icon: 'ph--circle-dashed--regular', hue: 'neutral' },
  'in-progress': { icon: 'ph--circle-half--regular', hue: 'sky' },
  'prototype': { icon: 'ph--flask--regular', hue: 'amber' },
  'operational': { icon: 'ph--seal-check--regular', hue: 'emerald' },
  'failing': { icon: 'ph--warning-octagon--regular', hue: 'rose' },
};

const STATUSES: FeatureStatus[] = ['planned', 'in-progress', 'prototype', 'operational', 'failing'];

export type EditFieldProps = {
  value: string;
  placeholder: string;
  label: string;
  testId: string;
  autoFocus?: boolean;
  /** Wraps and grows with its text; Enter still commits, Shift+Enter breaks the line. */
  multiline?: boolean;
  /** No well, for a field that should read as the row's text until it is focused. */
  subdued?: boolean;
  onCommit: (value: string) => void;
};

export const stopPropagation = (event: MouseEvent | PointerEvent) => event.stopPropagation();

/** Presses on the card's own buttons and fields are theirs, not the card's. */
export const isControl = (target: EventTarget): boolean =>
  target instanceof Element && target.closest('button, input, textarea, [role="menu"]') !== null;

type StatusItemsProps = {
  value: FeatureStatus;
  onChange: (status: FeatureStatus) => void;
  testId: string;
};

/** The five statuses as radio items, shared by the card menu and the status icon's own menu. */
export const StatusItems = ({ value, onChange, testId }: StatusItemsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Menu.RadioItemGroup
      value={value}
      onValueChange={({ value: selected }) => {
        const next = STATUSES.find((candidate) => candidate === selected);
        if (next && next !== value) {
          onChange(next);
        }
      }}
    >
      <Menu.ItemGroupLabel>{t('feature-card.status.label')}</Menu.ItemGroupLabel>
      {STATUSES.map((candidate) => (
        <Menu.RadioItem
          key={candidate}
          item={{
            value: candidate,
            label: t(`feature-status.${candidate}.label`),
            icon: FEATURE_STATUS_STYLE[candidate].icon,
          }}
          data-testid={`${testId}.${candidate}`}
        />
      ))}
    </Menu.RadioItemGroup>
  );
};

type StatusIconProps = {
  status: FeatureStatus;
  /** Without it the icon is a plain glyph. */
  onChange?: (status: FeatureStatus) => void;
  /** Row icons are muted, so the header's status icon stays the card's one strong glyph. */
  muted?: boolean;
  testId: string;
};

/** A status glyph that, given `onChange`, opens a menu of the statuses; neither press selects the card. */
export const StatusIcon = ({ status, onChange, muted, testId }: StatusIconProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const style = FEATURE_STATUS_STYLE[status];
  const glyph = (
    <Icon.Icon
      icon={style.icon}
      hue={muted ? undefined : style.hue}
      tone={muted ? 'muted' : undefined}
      label={t(`feature-status.${status}.label`)}
    />
  );
  if (!onChange) {
    return glyph;
  }
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          compact
          data-testid={testId}
          // Takes the press itself, so it neither selects the card nor drags a canvas box.
          onPointerDown={stopPropagation}
          onClick={stopPropagation}
        >
          {glyph}
        </Button.Root>
      </Menu.Trigger>
      <Menu.Content onClick={stopPropagation}>
        <StatusItems value={status} onChange={onChange} testId={testId} />
      </Menu.Content>
    </Menu.Root>
  );
};

/**
 * A field of a card in edit mode, committed when it loses focus (Enter does that). Keys and presses stay in the field:
 * the card would toggle its selection, and a canvas would delete the box on Backspace.
 */
export const EditField = ({
  value,
  placeholder,
  label,
  testId,
  autoFocus,
  multiline,
  subdued,
  onCommit,
}: EditFieldProps) => {
  // Uncontrolled, so typing never re-renders the card; a newer model value (another peer's edit) still replaces the
  // field's text while the user has not changed it, so blur cannot commit the stale text over it.
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const shownRef = useRef(value);
  useEffect(() => {
    const field = fieldRef.current;
    if (field && field.value === shownRef.current) {
      field.value = value;
    }
    shownRef.current = value;
  }, [value]);

  // A new card's tile stays hidden until the board has measured it, so focus waits for the reveal.
  const revealed = useMasonryTileRevealed();
  useEffect(() => {
    if (autoFocus && revealed) {
      fieldRef.current?.focus();
    }
  }, [autoFocus, revealed]);

  const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = event.currentTarget.value.trim();
    if (next !== value) {
      onCommit(next);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.stopPropagation();
    // An IME's Enter confirms a composition candidate, not the field.
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };
  const props = {
    'ref': fieldRef,
    'defaultValue': value,
    placeholder,
    'aria-label': label,
    'data-testid': testId,
    'onBlur': handleBlur,
    'onKeyDown': handleKeyDown,
    'onPointerDown': stopPropagation,
    'onClick': stopPropagation,
  };
  // A narrow inline padding, pulled out by the same amount at the start, so the text stays where it was read and the
  // box ends at the column's edge (a canvas card's scroll area would clip anything past it).
  return multiline ? (
    // Sized by its content rather than `rows`, so a one-line description keeps the card's size.
    <Input.Textarea
      {...props}
      classNames='-ms-1 my-1 px-1 py-0 w-[calc(100%+0.25rem)] min-h-0 [field-sizing:content] resize-none'
    />
  ) : (
    <Input.Root
      {...props}
      variant={subdued ? 'subdued' : undefined}
      classNames='-ms-1 px-1 -my-0.5 w-[calc(100%+0.25rem)]'
    />
  );
};

/** Row icons sit a step below the text, so the header's status icon stays the card's one strong glyph. */
export const RowIcon = ({ icon }: { icon: string }) => <Icon.Icon icon={icon} tone='muted' />;
