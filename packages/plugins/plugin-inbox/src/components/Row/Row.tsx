//
// Copyright 2026 DXOS.org
//

import { format, intervalToDuration } from 'date-fns';
import React, { type MouseEvent, useCallback, useRef } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { EID, type URI } from '@dxos/keys';
import { DxAvatar } from '@dxos/lit-ui/react';
import {
  Card,
  DxAnchorActivate,
  Icon,
  IconButton,
  type IconButtonProps,
  SystemIconButton,
  Tag,
  useTranslation,
} from '@dxos/react-ui';
import { type Actor } from '@dxos/types';
import { toHue } from '@dxos/ui-theme';
import { toHue as hashToHue } from '@dxos/util';

import { useActorContact } from '#hooks';
import { meta } from '#meta';

import { hashString } from '../../util';

/**
 * Shared Card-row primitives rendered inside a `Card.Body`. These are the single source for the
 * person/date/tags/ref/star rows used across the inbox tiles (`EventStack`/`MessageStack`), the preview
 * cards (`EventCard`/`MessageCard`), and the article headers — so a row of each kind is defined exactly
 * once and every surface composes from it.
 */

//
// AnchorIconButton — internal helper, not exported on Row.
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
          label,
          kind: 'card',
          title,
        }),
      );
    } else {
      onClick?.();
    }
  }, [value, label, title, onClick]);

  return (
    <IconButton
      classNames={compact ? 'min-h-0' : 'aspect-square'}
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
// Date
//

type RowDateProps = {
  start: Date;
  end?: Date;
};

/** A Card.Row rendering a date or date range with a calendar icon. */
const RowDate = ({ start, end }: RowDateProps) => {
  let { hours = 0, minutes = 0 } = (end && intervalToDuration({ start, end })) ?? {};
  // Prefer 90m over 1h 30m.
  if (hours === 1 && minutes !== 0) {
    hours = 0;
    minutes += 60;
  }
  const duration = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(' ');

  return (
    <Card.Row>
      <Card.Block>
        <Icon icon='ph--calendar--regular' />
      </Card.Block>
      <div className='flex items-center gap-2 overflow-hidden whitespace-nowrap'>
        <div className='truncate text-description'>{format(start, 'PPp')}</div>
        {duration.length > 0 && <div className='text-description text-xs'>({duration})</div>}
      </div>
    </Card.Row>
  );
};

RowDate.displayName = 'Row.Date';

//
// Ref
//

type RowRefProps = {
  object: Obj.Any;
};

/** A Card.Row rendering an ECHO ref/relation with a card-preview anchor icon. */
const RowRef = ({ object }: RowRefProps) => {
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EID.tryParse(Obj.getURI(object).toString());

  return (
    <Card.Row>
      <Card.Block>
        <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      </Card.Block>
      <h3 className='truncate text-primary-text'>{label}</h3>
    </Card.Row>
  );
};

RowRef.displayName = 'Row.Ref';

//
// Person
//

/** Recipient/participant kind; drives the leading icon and accessible label. */
export type PersonRole = 'from' | 'to' | 'cc' | 'bcc' | 'attendee';

type RowPersonProps = {
  actor: Actor.Actor;
  /** Recipient/participant kind (icon + aria only; no visible prefix). */
  role?: PersonRole;
  /**
   * Render a static `DxAvatar` in the gutter (hook-free) instead of the interactive contact anchor.
   * Used by list tiles where resolving a contact per row (a hook) would be too costly.
   */
  avatar?: boolean;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
  /** Render a trailing remove button (e.g. attendee rows in the editable event header). */
  onRemove?: () => void;
  /** Click handler for the avatar (e.g. select the message); avatar variant only. */
  onClick?: (event: MouseEvent) => void;
};

const displayName = (actor: Actor.Actor): string => actor.contact?.target?.fullName ?? actor.name ?? actor.email ?? '';

/**
 * Static avatar variant — no contact resolution. Suitable for virtualized list tiles.
 */
const PersonAvatarRow = ({ actor, onClick }: Pick<RowPersonProps, 'actor' | 'onClick'>) => {
  const name = displayName(actor);
  return (
    <Card.Row>
      <Card.Block>
        <DxAvatar
          hue={hashToHue(hashString(name))}
          hueVariant='surface'
          variant='circle'
          size={6}
          fallback={name}
          onClick={onClick}
        />
      </Card.Block>
      <Card.Text>{name || actor.email}</Card.Text>
    </Card.Row>
  );
};

/**
 * Interactive variant — resolves the contact to a card-preview anchor, with a create-contact fallback.
 */
const PersonAnchorRow = ({
  actor,
  role,
  db,
  onContactCreate,
  onRemove,
}: Omit<RowPersonProps, 'avatar' | 'onClick'>) => {
  const { t } = useTranslation(meta.profile.key);
  const contactDXN = useActorContact(db, actor);
  const handleContactCreate = useCallback(() => onContactCreate?.(actor), [actor, onContactCreate]);

  // TODO(burdon): Reconcile with Avatar if space member.
  return (
    <Card.Row>
      <Card.Block>
        <AnchorIconButton
          icon='ph--user--regular'
          fallbackIcon='ph--user-plus--regular'
          label={t('show-contact.label')}
          fallbackLabel={t('create-contact.label')}
          title={role ? `${role}: ${actor.name}` : actor.name}
          value={contactDXN}
          onClick={onContactCreate ? handleContactCreate : undefined}
        />
      </Card.Block>
      <Card.Text>{actor.name || actor.email}</Card.Text>
      {onRemove && (
        <Card.Block end>
          <IconButton
            variant='ghost'
            iconOnly
            icon='ph--x--regular'
            label={t('remove-attendee.label')}
            onClick={onRemove}
          />
        </Card.Block>
      )}
    </Card.Row>
  );
};

/** A Card.Row rendering a person (sender, recipient, attendee). */
const RowPerson = ({ avatar, onClick, ...props }: RowPersonProps) =>
  avatar ? <PersonAvatarRow actor={props.actor} onClick={onClick} /> : <PersonAnchorRow {...props} />;

RowPerson.displayName = 'Row.Person';

//
// Tags
//

type TagItem = { id: string; label?: string; hue?: string };

type RowTagsProps = {
  /** Optional — callers may pass an undefined/empty list (e.g. a message with no tags). */
  tags?: TagItem[];
  /** When provided, each chip is clickable and stops event propagation. */
  onTagClick?: (label: string) => void;
};

/** A Card.Row rendering a set of label+hue tag chips, optionally clickable. */
const RowTags = ({ tags, onTagClick }: RowTagsProps) => {
  if (!tags?.length) {
    return null;
  }

  return (
    <Card.Row>
      <Card.Block>
        <Icon icon='ph--tag--regular' />
      </Card.Block>
      <div className='flex flex-wrap gap-1 py-1 -mx-0.5' data-testid='extracted-tags'>
        {tags.map((tag) => (
          <Tag
            key={tag.id}
            hue={toHue(tag.hue)}
            data-testid={`message-tag-${tag.id}`}
            onClick={
              onTagClick
                ? (event) => {
                    event.stopPropagation();
                    onTagClick(tag.label ?? tag.id);
                  }
                : undefined
            }
          >
            {tag.label ?? tag.id}
          </Tag>
        ))}
      </div>
    </Card.Row>
  );
};

RowTags.displayName = 'Row.Tags';

//
// Star
//

type RowStarProps = {
  starred?: boolean;
  /** Toggle handler; the button renders only when provided. */
  onToggle?: () => void;
};

/**
 * Star toggle for a `Card.Block` leading gutter (shared by event/message tiles and headers). Stops
 * the click from bubbling so starring doesn't also select/activate the surrounding tile or card.
 */
const RowStar = ({ starred, onToggle }: RowStarProps) => {
  const handleClick = useCallback<NonNullable<IconButtonProps['onClick']>>(
    (event) => {
      event.stopPropagation();
      onToggle?.();
    },
    [onToggle],
  );

  if (!onToggle) {
    return null;
  }

  return <SystemIconButton.Star iconOnly variant='ghost' active={starred} onClick={handleClick} />;
};

RowStar.displayName = 'Row.Star';

//
// Row
//

export const Row = {
  Date: RowDate,
  Ref: RowRef,
  Person: RowPerson,
  Tags: RowTags,
  Star: RowStar,
};

export type { RowDateProps, RowPersonProps, RowRefProps, RowStarProps, RowTagsProps };
