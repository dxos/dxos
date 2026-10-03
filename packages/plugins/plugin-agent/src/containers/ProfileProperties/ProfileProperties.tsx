//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { HasSubject, type Organization, type Person } from '@dxos/types';

import { ProfileGraph } from '#components';
import { Goal, Memory, Profile } from '#types';

export type ProfilePropertiesProps = AppSurface.ObjectPropertiesProps<Person.Person | Organization.Organization>;

/** The goals and active memories autonomous agents hold about a person or organization. */
export const ProfileProperties = ({ subject }: ProfilePropertiesProps) => {
  const db = Obj.getDatabase(subject);
  const subjectQuery = useMemo(() => Query.select(Filter.id(subject.id)).targetOf(HasSubject.HasSubject), [subject.id]);
  const relations = useQuery(db, subjectQuery);
  // All of each type, narrowed below to those about the subject.
  const allMemories = useQuery(db, Filter.type(Memory.Memory));
  const allGoals = useQuery(db, Filter.type(Goal.Goal));

  // A query re-emits on membership only, so status changes (confirmed, superseded) need per-object subscriptions.
  const profileAtom = useMemo(
    () =>
      Atom.make((get) => {
        allMemories.forEach((memory) => get(Obj.atom(memory)));
        allGoals.forEach((goal) => get(Obj.atom(goal)));
        const ids = new Set(relations.map((relation) => Relation.getSource(relation).id));
        return {
          memories: allMemories
            .filter((memory) => memory.status === 'active' && ids.has(memory.id))
            .sort(Profile.byNewest),
          goals: allGoals.filter(
            (goal) => Profile.isLiveGoal(goal) && goal.owners.some((owner) => Profile.refersTo(owner, subject.id)),
          ),
        };
      }),
    [relations, allMemories, allGoals, subject.id],
  );
  const { goals, memories } = useAtomValue(profileAtom);

  return <ProfileGraph goals={goals} memories={memories} />;
};

ProfileProperties.displayName = 'ProfileProperties';
