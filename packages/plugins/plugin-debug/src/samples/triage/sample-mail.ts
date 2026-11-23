//
// Copyright 2026 DXOS.org
//

import type * as Mailbox from '@dxos/plugin-inbox/Mailbox';

/** The sample-mail connection's foreign key: one per mailbox, so the transport finds a mailbox's own. */
export const sampleMailKey = (mailbox: Pick<Mailbox.Mailbox, 'id'>) => ({
  source: 'org.dxos.plugin-debug.sampleMail',
  id: mailbox.id,
});
