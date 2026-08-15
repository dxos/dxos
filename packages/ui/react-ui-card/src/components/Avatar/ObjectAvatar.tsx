//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Entity, Obj } from '@dxos/echo';
import { DxAvatar, type DxAvatarProps } from '@dxos/lit-ui/react';
import { Icon } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

import { nameToHue } from './avatar-name';

/**
 * Conventional field holding an object's picture, as a URL.
 *
 * A convention rather than an annotation because it is already one across the types that have a
 * picture at all: `Person.image` and `Organization.image` are both an optional URL string, written
 * by `CrmOperation.EnrichImages` (Gravatar / logo service, re-hosted). Promote it to an annotation
 * when a type needs to name a different field — nothing does yet, and an annotation nobody varies is
 * indirection without a payer.
 */
const IMAGE_PROPERTY = 'image';

/** The object's picture URL, or `undefined` when it has none. */
export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): string | undefined => {
  // Read through `unknown`: the property is a convention across unrelated types rather than part of
  // any shared interface, so there is no structural overlap for TypeScript to check against.
  const image = (entity as unknown as Record<string, unknown>)[IMAGE_PROPERTY];
  return typeof image === 'string' && image.length > 0 ? image : undefined;
};

export type ObjectAvatarProps = Pick<DxAvatarProps, 'variant' | 'size' | 'onClick'> & {
  /** Any ECHO object — the avatar is derived entirely from it. */
  object: Entity.Unknown | Entity.Snapshot;
  /** Fallback glyph when the object has neither a picture nor a label. */
  fallbackIcon?: string;
};

/**
 * An object's visual identity, resolved in one place: its picture, else its initials, else its type
 * icon.
 *
 * Generic over the object rather than special-cased per type, because every surface showing an
 * object faces the same three-way choice and each was making it separately — a card rendering the
 * bare type glyph next to a Person whose avatar had already been fetched is the visible symptom.
 * `Obj.getLabel` and `Obj.getIcon` already generalize the other two legs; this adds the first.
 */
export const ObjectAvatar = ({ object, variant = 'circle', size = 6, fallbackIcon, onClick }: ObjectAvatarProps) => {
  const image = getObjectImage(object);
  const label = Obj.getLabel(object as Obj.Unknown);
  const iconAnnotation = Entity.getIcon(object);

  // No picture and no label leaves initials with nothing to derive from, so the type's own glyph is
  // the only honest thing left — a blank disc would read as a failed image rather than as an object
  // that has never been named.
  if (!image && !label) {
    const icon = fallbackIcon ?? iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
    return <Icon icon={icon} classNames={iconAnnotation?.hue ? getStyles(iconAnnotation.hue).text : undefined} />;
  }

  return (
    <DxAvatar
      // The type's hue when it declares one, so a Person and an Organization stay visually distinct
      // even before either has a picture; otherwise derived from the label, which keeps one object
      // the same colour everywhere it appears.
      hue={iconAnnotation?.hue ?? nameToHue(label ?? '')}
      hueVariant='surface'
      variant={variant}
      size={size}
      imgSrc={image}
      fallback={label ?? ''}
      onClick={onClick}
    />
  );
};

ObjectAvatar.displayName = 'ObjectAvatar';
