//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PointerEvent } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import type * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type FeatureStatus } from './feature.ts';

export const FEATURE_STATUS_STYLE: Record<FeatureStatus, { icon: string; hue: Tag.TagHue }> = {
  planned: { icon: 'ph--circle-dashed--regular', hue: 'indigo' },
  prototype: { icon: 'ph--flask--regular', hue: 'amber' },
  operational: { icon: 'ph--seal-check--regular', hue: 'emerald' },
  failing: { icon: 'ph--warning-octagon--regular', hue: 'rose' },
};

/** In lifecycle order; failing sits last, beside the operational features that regressed. */
export const FEATURE_STATUSES: readonly FeatureStatus[] = ['planned', 'prototype', 'operational', 'failing'];

/** The marker of a feature someone is working on, beside whatever its status is. */
export const ACTIVE_STYLE = { icon: 'ph--hammer--regular', hue: 'sky' } as const;

export const stopPropagation = (event: MouseEvent | PointerEvent) => event.stopPropagation();

/** Presses on the card's own buttons and fields are theirs, not the card's. */
export const isControl = (target: EventTarget): boolean =>
  target instanceof Element && target.closest('button, input, textarea, [role="menu"]') !== null;

type StatusIconProps = {
  status: FeatureStatus;
  /** Row icons are muted, so the header's status icon stays the card's one strong glyph. */
  muted?: boolean;
};

/** The status glyph, labelled with the status for assistive technology and the tooltip. */
export const StatusIcon = ({ status, muted }: StatusIconProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const style = FEATURE_STATUS_STYLE[status];
  return (
    <Icon.Icon
      icon={style.icon}
      hue={muted ? undefined : style.hue}
      tone={muted ? 'muted' : undefined}
      label={t(`feature-status.${status}.label`)}
    />
  );
};

/** The requirement glyph, in one hue everywhere it appears so requirements read as one kind of row. */
export const REQUIREMENT_STYLE = { icon: 'ph--check-circle--regular', hue: 'teal' } as const;

/** A requirement row's icon, coloured unlike the muted row icons, since requirements are what a reader scans for. */
export const RequirementIcon = () => <Icon.Icon icon={REQUIREMENT_STYLE.icon} hue={REQUIREMENT_STYLE.hue} />;

/** A requirement's spec id (`F-3.1`), small and on one line, before the requirement's text. */
export const RequirementId = ({ id }: { id: string }) => (
  <span className='shrink-0 text-xs text-description tabular-nums whitespace-nowrap'>{id}</span>
);

/** Row icons sit a step below the text, so the header's status icon stays the card's one strong glyph. */
export const RowIcon = ({ icon }: { icon: string }) => <Icon.Icon icon={icon} tone='muted' />;
