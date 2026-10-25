//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Obj, type Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import * as Layout from '@dxos/react-ui/Layout';

export type CommentsModuleData = {
  /** Type of the object to show; the space's first object of that type is used. */
  type: Type.AnyEntity;
};

/**
 * An object beside its review comments companion: the comment-thread agent answers there, through the assistant,
 * with the object's own skills.
 */
export const CommentsModule = ({ data: { type } }: Surface.ComponentProps<CommentsModuleData>) => {
  const space = Hooks.useActiveSpace();
  const objects = useQuery(space?.db, Filter.type(type));
  const subject = objects.find(Obj.isObject);
  const attendableId = subject ? Obj.getURI(subject) : undefined;
  // The companion's comment toolbar resolves against the attended object, which a bare Surface does not establish.
  const attentionAttrs = useAttentionAttributes(attendableId);
  const articleData = useMemo(() => ({ subject, attendableId: attendableId ?? 'story' }), [subject, attendableId]);
  const commentsData = useMemo(
    () => ({ subject: 'comments', companionTo: subject, attendableId: attendableId ?? 'story' }),
    [subject, attendableId],
  );
  if (!subject) {
    return null;
  }

  return (
    <Layout.Grid grow cols={[3, 2]} {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
      <Surface.Surface type={AppSurface.Article} data={commentsData} limit={1} />
    </Layout.Grid>
  );
};
