//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';

/**
 * Lists the mailbox's topics via the plugin-inbox Topics article surface. Constructs the same surface
 * data the Topics app-graph node carries (the mailbox as `subject` + a `/topics` attendable segment),
 * so the module renders `TopicsArticle` exactly as clicking the nav node would.
 */
export const TopicsModule = ({ space, attendableId }: ModuleProps) => {
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
