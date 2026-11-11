//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { isStage } from './Contacts.tsx';
import { ContactsEmbed } from './ContactsEmbed.tsx';

/**
 * {@link ContactsEmbed} for the `stage` and `peers` in the page's query, as
 * `/embed/contacts/` renders it.
 */
export const ContactsEmbedPage = () => {
  const params = new URLSearchParams(window.location.search);
  const stage = params.get('stage');
  if (!isStage(stage)) {
    throw new Error(`Unknown tutorial stage: ${stage}`);
  }

  return (
    <ContactsEmbed stage={stage} peers={params.get('peers') === '2' ? 2 : 1} />
  );
};
