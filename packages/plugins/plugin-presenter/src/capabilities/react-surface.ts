//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
import { Position } from '@dxos/util';

import { CollectionArticle, DocumentArticle, SlideArticle } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'document',
        position: Position.first,
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data): data is AppSurface.ArticleData<{ type: typeof meta.profile.key; object: Markdown.Document }> =>
            !!data.subject &&
            typeof data.subject === 'object' &&
            'type' in data.subject &&
            'object' in data.subject &&
            data.subject.type === meta.profile.key &&
            Obj.instanceOf(Markdown.Document, data.subject.object),
        ),
        component: DocumentArticle,
        props: ({ role, data: { subject } }) => ({ role, subject: subject.object }),
      }),
      Surface.create({
        id: 'collection',
        position: Position.first,
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data): data is AppSurface.ArticleData<{ type: typeof meta.profile.key; object: Collection.Collection }> =>
            !!data.subject &&
            typeof data.subject === 'object' &&
            'type' in data.subject &&
            'object' in data.subject &&
            data.subject.type === meta.profile.key &&
            Obj.instanceOf(Collection.Collection, data.subject.object),
        ),
        component: CollectionArticle,
        props: ({ role, data: { subject } }) => ({ role, subject: subject.object }),
      }),
      Surface.create({
        id: 'slide',
        filter: AppSurface.object(AppSurface.Slide, Markdown.Document),
        component: SlideArticle,
        props: ({ data }) => ({ ...data }),
      }),
    ]),
  ),
);
