//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Mailbox } from '@dxos/plugin-inbox';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';

/**
 * The seeded mailbox's real article surface, beside a project.
 *
 * Present so a story can drive processing from the UI the app already ships rather than a
 * story-only button: with plugin-brain loaded the mailbox toolbar carries its `Analyze` action, so
 * running fact extraction over the seeded messages is a click, and the resulting facts show in the
 * mailbox's Facts companion.
 */
export const MailboxModule = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  if (!mailbox) {
    return <Loading data={{ mailbox: false }} />;
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: mailbox.id }} limit={1} />;
};
