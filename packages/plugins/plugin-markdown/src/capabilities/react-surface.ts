//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Position } from '@dxos/util';

import { EditableMarkdownCard, MarkdownCard, MarkdownSettings } from '#containers';
import { meta } from '#meta';
import { Markdown } from '#types';

import { MarkdownContainer } from './MarkdownContainer';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.document',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Markdown.Document, (data) => !data.variant),
          AppSurface.object(AppSurface.Section, Markdown.Document),
          AppSurface.object(AppSurface.Tabpanel, Markdown.Document, (data) => !data.variant),
        ),
        component: MarkdownContainer,
        props: ({ role, ref, data: { subject, attendableId } }) => ({
          id: Obj.getURI(subject),
          attendableId,
          subject,
          role,
          ref,
        }),
      }),
      Surface.create({
        id: 'surface.text',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        // TODO(burdon): Why is attendableId required? See EventArticle.tsx
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Text.Text),
          AppSurface.object(AppSurface.Section, Text.Text),
          AppSurface.object(AppSurface.Tabpanel, Text.Text),
        ),
        component: MarkdownContainer,
        props: ({ role, ref, data: { subject, attendableId } }) => ({
          id: Obj.getURI(subject),
          attendableId,
          subject,
          role,
          ref,
        }),
      }),
      Surface.create({
        id: 'surface.pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: MarkdownSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'surface.editable',
        position: Position.first,
        filter: AppSurface.object(
          AppSurface.CardContent,
          [Markdown.Document, Text.Text],
          (data) => data.editable === true,
        ),
        component: EditableMarkdownCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'surface.preview',
        filter: AppSurface.object(
          AppSurface.CardContent,
          [Markdown.Document, Text.Text],
          (data) => data.editable !== true,
        ),
        component: MarkdownCard,
        props: ({ data }) => ({ ...data }),
      }),
    ]),
  ),
);
