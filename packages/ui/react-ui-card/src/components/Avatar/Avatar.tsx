//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DxAvatar, type DxAvatarProps } from '@dxos/lit-ui/react';
import { type Actor } from '@dxos/types';
import { toHue } from '@dxos/util';

import { hashString } from '../../util';

/** Canonical display name for an actor — the avatar glyph fallback and the hue key are both derived from it. */
export const avatarName = (actor?: Actor.Actor): string =>
  actor?.contact?.target?.fullName ?? actor?.name ?? actor?.email ?? '';

/** Single source for a name→hue mapping, so the same sender is one color across every surface. */
export const nameToHue = (name?: string): string => toHue(hashString(name));

export type AvatarProps = Pick<DxAvatarProps, 'variant' | 'size' | 'onClick'> & {
  /** Sender/participant; supplies the display name and the hue. */
  actor?: Actor.Actor;
  /** Label override; defaults to the actor's {@link avatarName}. */
  name?: string;
};

/**
 * Sender/participant avatar with one shared name→hue derivation ({@link nameToHue}) so a given
 * person renders the same color across the mailbox list, the opened thread, and preview cards —
 * previously each site hand-rolled `DxAvatar` off a different input.
 */
export const Avatar = ({ actor, name, variant = 'circle', size = 6, onClick }: AvatarProps) => {
  const label = name ?? avatarName(actor);
  return (
    <DxAvatar
      hue={nameToHue(label)}
      hueVariant='surface'
      variant={variant}
      size={size}
      fallback={label}
      onClick={onClick}
    />
  );
};

Avatar.displayName = 'Avatar';
