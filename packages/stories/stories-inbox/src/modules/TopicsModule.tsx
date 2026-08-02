//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Space, useQuery } from '@dxos/react-client/echo';

/**
 * Renders the mailbox's topic-suggestions surface (the `/topics` node). Constructs the same surface
 * data the app-graph node carries (the mailbox as `subject` + a `/topics` attendable segment), so the
 * module renders `TopicSuggestionsArticle` exactly as clicking the nav node would. Accepted topics live
 * in the space-level Topics section (`@dxos/plugin-brain`).
 */
export const TopicsModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <TopicsModuleContainer space={space} attendableId={data?.attendableId} />;
};

const TopicsModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  if (!mailbox) {
    return null;
  }

  const id = attendableId ?? Obj.getURI(mailbox).toString();
  return (
    <Surface.Surface
      type={AppSurface.Article}
      data={{
        subject: mailbox,
        attendableId: `${id}/topics`,
      }}
      limit={1}
    />
  );
};
