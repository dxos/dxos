//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';

import { Goal, Memory, MemoryOperation, Profile } from '#types';

const handler: Operation.WithHandler<typeof MemoryOperation.UpdateProfile> = MemoryOperation.UpdateProfile.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject: subjectRef }) {
      const subject = yield* Database.load(subjectRef);
      const memories = (yield* Database.query(Query.select(Filter.id(subject.id)).targetOf(HasSubject.HasSubject)).run)
        .map((relation) => Relation.getSource(relation))
        .filter(Obj.instanceOf(Memory.Memory));
      const goals = (yield* Database.query(Filter.type(Goal.Goal)).run).filter(
        (goal) => Profile.isLiveGoal(goal) && goal.owners.some((owner) => Profile.refersTo(owner, subject.id)),
      );

      const name = Profile.displayName(subject);
      const content = Profile.render({ name, goals, memories });
      const now = new Date().toISOString();

      const relation = (yield* Database.query(Query.select(Filter.id(subject.id)).targetOf(ProfileOf.ProfileOf))
        .run).at(0);
      const existing = relation ? Relation.getSource(relation) : undefined;
      if (relation && existing && Obj.instanceOf(Markdown.Document, existing)) {
        const text = yield* Database.load(existing.content);
        Obj.update(text, (text) => {
          text.content = content;
        });
        Relation.update(relation, (relation) => {
          relation.lastResearchedAt = now;
        });
        return { document: Ref.make<Obj.Unknown>(existing) };
      }

      // Parented to the subject so the profile shares its lifetime, as plugin-crm's profiles do.
      const document = yield* Database.add(
        Obj.make(Markdown.Document, {
          name,
          content: Ref.make(Text.make({ content })),
          [Obj.Parent]: subject,
        }),
      );
      yield* Database.add(
        ProfileOf.make({
          [Relation.Source]: document,
          [Relation.Target]: subject,
          sources: [],
          lastResearchedAt: now,
        }),
      );

      return { document: Ref.make<Obj.Unknown>(document) };
    }),
  ),
);

export default handler;
