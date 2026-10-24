//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import * as Position from '@dxos/util/Position';

import {
  DocumentArticle,
  PresentationArticle,
  PresentationProperties,
  SlideArticle,
  SlideEditorArticle,
  SlidePreviewArticle,
} from '#containers';
import { meta } from '#meta';
import { Presentation, SlideEditorViewState } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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
        id: 'presentation',
        position: Position.first,
        filter: AppSurface.object(AppSurface.Article, Presentation.Presentation),
        component: PresentationArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'slideEditor',
        // First, so an owned slide opens here rather than in the markdown plugin's general `Text` article.
        position: Position.first,
        filter: AppSurface.object(AppSurface.Article, Text.Text, ({ subject }) =>
          Obj.instanceOf(Presentation.Presentation, Obj.getParent(subject)),
        ),
        component: SlideEditorArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'slidePreview',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, SlideEditorViewState.COMPANION_VARIANT),
          AppSurface.companion(AppSurface.Article, Text.Text),
        ),
        component: SlidePreviewArticle,
        props: ({ role, data: { companionTo } }) => ({ role, subject: companionTo }),
      }),
      Surface.create({
        id: 'presentationProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Presentation.Presentation),
        component: PresentationProperties,
        props: ({ data: { subject } }) => ({ presentation: subject }),
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
