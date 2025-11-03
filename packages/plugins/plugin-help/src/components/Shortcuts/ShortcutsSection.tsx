//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { descriptionText } from '@dxos/react-ui-theme';

import { ShortcutsList } from './ShortcutsList';

export const ShortcutsSection = () => (
  <section className={descriptionText}>
    <ShortcutsList />
  </section>
);
