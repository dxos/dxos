//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { HasSubject, type Organization, type Person } from '@dxos/types';

import { ProfileGraph } from '#components';
import { Goal, Memory, Profile } from '#types';

export type ProfilePropertiesProps = AppSurface.ObjectPropertiesProps<Person.Person | Organization.Organization>;

/** The goals and active memories interlocutor agents hold about a person or organization. */
export const ProfileProperties = ({ subject }: ProfilePropertiesProps) => {
  const db = Obj.getDatabase(subject);
  const subjectQuery = useMemo(() => Query.select(Filter.id(subject.id)).targetOf(HasSubject.HasSubject), [subject.id]);
  const relations = useQuery(db, subjectQuery);
  // Queried by type too so a memory's status change (e.g. superseded) re-renders the list.
  const allMemories = useQuery(db, Filter.type(Memory.Memory));
  const allGoals = useQuery(db, Filter.type(Goal.Goal));

  const memories = useMemo(() => {
    const ids = new Set(relations.map((relation) => Relation.getSource(relation).id));
    return allMemories.filter((memory) => memory.status === 'active' && ids.has(memory.id)).sort(Profile.byNewest);
  }, [relations, allMemories]);

  const goals = useMemo(
    () =>
      allGoals.filter(
        (goal) => Profile.isLiveGoal(goal) && goal.owners.some((owner) => Profile.refersTo(owner, subject.id)),
      ),
    [allGoals, subject.id],
  );

  return <ProfileGraph goals={goals} memories={memories} />;
};

ProfileProperties.displayName = 'ProfileProperties';
