//
// Copyright 2026 DXOS.org
//

import { format, intervalToDuration } from 'date-fns';
import React, { useCallback, useRef } from 'react';

import { Obj, type Database } from '@dxos/echo';
import { EID, type URI } from '@dxos/keys';
import { Card, DxAnchorActivate, IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { type Actor } from '@dxos/types';
import { toHue } from '@dxos/ui-theme';

import { useActorContact } from '#hooks';
import { meta } from '#meta';

//
// AnchorIconButton — internal helper, not exported on Header.
//

type AnchorIconButtonProps = {
  compact?: boolean;
  icon: string;
  fallbackIcon?: string;
  label: string;
  fallbackLabel?: string;
  title?: string;
  value?: URI.URI;
  size?: 4 | 5 | 6;
  onClick?: () => void;
};

/**
 * Icon-only button that opens an ECHO object's preview card via `DxAnchorActivate`.
 * Falls back to `onClick` when `value` is absent.
 */
const AnchorIconButton = ({
  compact,
  icon,
  fallbackIcon,
  label,
  fallbackLabel,
  title,
  value,
  size = 4,
  onClick,
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
      classNames={compact && 'min-h-0'}
      variant='ghost'
      disabled={!value && !onClick}
      icon={value ? icon : (fallbackIcon ?? icon)}
      iconOnly
      size={size}
      label={value ? label : (fallbackLabel ?? label)}
      onClick={handleClick}
      ref={buttonRef}
    />
  );
};

//
// DateRow
//

type HeaderDateRowProps = {
  start: Date;
  end?: Date;
};

/** A Card.Row rendering a date range with a calendar icon. */
const HeaderDateRow = ({ start, end }: HeaderDateRowProps) => {
  let { hours = 0, minutes = 0 } = (end && intervalToDuration({ start, end })) ?? {};
  // Prefer 90m over 1h 30m.
  if (hours === 1 && minutes !== 0) {
    hours = 0;
    minutes += 60;
  }
  const duration = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(' ');

  return (
    <Card.Row icon='ph--calendar--regular'>
      <div className='flex items-center gap-2 overflow-hidden whitespace-nowrap'>
        <div className='truncate text-description'>{format(start, 'PPp')}</div>
        {(hours || minutes) && <div className='text-description text-xs'>({duration})</div>}
      </div>
    </Card.Row>
  );
};

HeaderDateRow.displayName = 'Header.DateRow';

//
// ObjectRow
//

type HeaderObjectRowProps = {
  object: Obj.Any;
};

/** A Card.Row rendering an extracted ECHO object with a card-preview anchor icon. */
const HeaderObjectRow = ({ object }: HeaderObjectRowProps) => {
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EID.tryParse(Obj.getURI(object).toString());

  return (
    <Card.Row icon={<AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />}>
      <h3 className='truncate text-primary-text'>{label}</h3>
    </Card.Row>
  );
};

HeaderObjectRow.displayName = 'Header.ObjectRow';

//
// PersonRow
//

type HeaderPersonRowProps = {
  actor: Actor.Actor;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

/** A Card.Row rendering a person (sender, attendee) with a contact anchor icon. */
const HeaderPersonRow = ({ actor, db, onContactCreate }: HeaderPersonRowProps) => {
  const { t } = useTranslation(meta.id);
  const contactDXN = useActorContact(db, actor);

  const handleContactCreate = useCallback(() => onContactCreate?.(actor), [actor, onContactCreate]);

  // TODO(burdon): Reconcile with Avatar if space member.
  return (
    <Card.Row
      icon={
        <AnchorIconButton
          compact
          icon='ph--user--regular'
          fallbackIcon='ph--user-plus--regular'
          label={t('show-contact.label')}
          fallbackLabel={t('create-contact.label')}
          title={actor.name}
          value={contactDXN}
          onClick={onContactCreate ? handleContactCreate : undefined}
        />
      }
    >
      <h3 className='truncate'>{actor.name || actor.email}</h3>
    </Card.Row>
  );
};

HeaderPersonRow.displayName = 'Header.PersonRow';

//
// TagsRow
//

type TagItem = { id: string; label?: string; hue?: string };

type TagsRowProps = {
  tags: TagItem[];
  /** When provided, each chip renders as a clickable button invoking this callback. */
  onTagClick?: (label: string) => void;
};

/** A Card.Row rendering a set of label+hue tag chips, optionally clickable. */
const HeaderTagsRow = ({ tags, onTagClick }: TagsRowProps) =>
  tags.length > 0 ? (
    <Card.Row icon='ph--tag--regular'>
      <div className='flex flex-wrap gap-1 py-1 -mx-0.5' data-testid='extracted-tags'>
        {tags.map((tag) =>
          onTagClick ? (
            <button
              key={tag.id}
              type='button'
              className='dx-tag dx-focus-ring'
              data-hue={tag.hue}
              data-testid={`message-tag-${tag.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onTagClick(tag.label ?? tag.id);
              }}
            >
              {tag.label}
            </button>
          ) : (
            <Tag key={tag.id} palette={toHue(tag.hue)} data-testid={`message-tag-${tag.id}`}>
              {tag.label}
            </Tag>
          ),
        )}
      </div>
    </Card.Row>
  ) : null;

HeaderTagsRow.displayName = 'Header.TagsRow';

//
// Header
//

export const Header = {
  DateRow: HeaderDateRow,
  ObjectRow: HeaderObjectRow,
  PersonRow: HeaderPersonRow,
  TagsRow: HeaderTagsRow,
};
