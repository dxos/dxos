//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectAvatar } from '@dxos/react-ui-card';
import { type Person } from '@dxos/types';

/**
 * A person's depiction in a card header: their photograph, else their initials in a hue derived from
 * their name.
 *
 * Contributed for `Person` alone rather than made the default for every object. A person IS the
 * identity the card is about, so initials carry information and a shared colour per-type carries
 * none — whereas a Task or a Document is better told apart by its type glyph. `Person` declares
 * `hue: 'neutral'`, which is right for that glyph and would render every person on the same grey
 * disc, hence `initialsHue='label'`.
 */
export const PersonCardIcon = ({ subject }: AppSurface.CardProps<Person.Person>) => (
  <ObjectAvatar object={subject} initialsHue='label' fallbackIcon='ph--user--regular' />
);

PersonCardIcon.displayName = 'PersonCardIcon';
