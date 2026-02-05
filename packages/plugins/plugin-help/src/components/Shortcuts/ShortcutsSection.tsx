//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { descriptionText } from '@dxos/ui-theme';

import { ShortcutsList } from './ShortcutsList';

export const ShortcutsSection = () => {
  return (
    <section className={descriptionText}>
      <ShortcutsList />
    </section>
  );
};
