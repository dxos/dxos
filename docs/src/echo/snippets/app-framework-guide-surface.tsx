//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { DXN, Type } from '@dxos/echo';
import * as Panel from '@dxos/react-ui/Panel';

class Note extends Type.makeObject<Note>(
  DXN.make('com.example.type.note', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    body: Schema.optional(Schema.String),
  }),
) {}

const NoteArticle = ({
  role,
  subject,
}: AppSurface.ObjectArticleProps<Note>) => (
  <Panel.Root role={role}>
    <Panel.Body>{subject.body}</Panel.Body>
  </Panel.Root>
);

const NoteCard = ({ subject }: { subject: Note }) => (
  <span>{subject.title}</span>
);

// #region contribute
export const NoteArticleSurface = Surface.create({
  id: 'article',
  // Matches the article role when the data's subject is a Note.
  filter: AppSurface.object(AppSurface.Article, Note),
  component: NoteArticle,
  // Maps the surface's data onto the component's props; checked against the
  // filter's data type.
  props: ({ role, data: { subject, attendableId } }) => ({
    role,
    subject,
    attendableId,
  }),
});
// #endregion

// #region match
export const NoteCardSurface = Surface.create({
  id: 'card',
  filter: AppSurface.oneOf(
    AppSurface.object(AppSurface.CardContent, Note),
    AppSurface.object(AppSurface.Section, Note),
  ),
  component: NoteCard,
  props: ({ data: { subject } }) => ({ subject }),
});
// #endregion

// #region module
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      NoteArticleSurface,
      NoteCardSurface,
    ]),
  ),
);
// #endregion

// #region nested
// Renders whatever surface another plugin contributed for this object in the
// section role.
export const Embedded = ({ subject }: { subject: Note }) => (
  <Surface.Surface
    type={AppSurface.Section}
    data={{ subject, attendableId: subject.id }}
    limit={1}
  />
);
// #endregion
