//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { isStage } from './Contacts.tsx';
import { ContactsEmbed } from './ContactsEmbed.tsx';

/** Renders {@link ContactsEmbed} into `element` for the `stage` and `peers` in `params`, as `/embed/contacts/` does. */
export const mount = (element: HTMLElement, params: URLSearchParams) => {
  const stage = params.get('stage');
  if (!isStage(stage)) {
    throw new Error(`Unknown tutorial stage: ${stage}`);
  }

  createRoot(element).render(<ContactsEmbed stage={stage} peers={params.get('peers') === '2' ? 2 : 1} />);
};
