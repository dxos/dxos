//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectAvatar } from '@dxos/react-ui-card';
import { type Person } from '@dxos/types';

/**
 * A person's depiction in a card header: their photograph, else their initials.
 *
 * Contributed for `Person` alone rather than made the default for every object. A person IS the
 * identity the card is about, so a per-instance depiction carries information — whereas a Task or a
 * Document is better told apart by its type glyph, which is what every other type keeps.
 */
export const PersonCardIcon = ({ subject }: AppSurface.CardProps<Person.Person>) => (
  <ObjectAvatar object={subject} fallbackIcon='ph--user--regular' />
);

PersonCardIcon.displayName = 'PersonCardIcon';
