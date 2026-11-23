//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Status from '@dxos/react-ui/Status';

import { type Goal } from '#types';

import { AgentNamespace } from '../../namespace.ts';

export type ProfileGoal = Pick<Goal.Goal, 'id' | 'title' | 'description' | 'horizon' | 'status'>;

/** A fact about the subject, as one line. */
export type ProfileFact = {
  id: string;
  /** Subject, predicate and object. */
  text: string;
  /** The predicate's label, which groups facts of one kind. */
  predicate: string;
  /** Whether the speaker said it or the agent concluded it, when recorded. */
  origin?: 'stated' | 'inferred';
  saidAt: string;
};

export type ProfileGraphProps = {
  goals: readonly ProfileGoal[];
  facts: readonly ProfileFact[];
};

/** Icon per goal status, shared with the agent state panel. */
export const GOAL_ICONS: Record<Goal.Status, string> = {
  proposed: 'ph--circle-dashed--regular',
  confirmed: 'ph--target--regular',
  active: 'ph--play-circle--regular',
  achieved: 'ph--check-circle--regular',
  dropped: 'ph--x-circle--regular',
};

/** What an agent knows about a person or team: their goals and the facts about them. */
export const ProfileGraph = ({ goals, facts }: ProfileGraphProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  if (goals.length === 0 && facts.length === 0) {
    return <Status.Empty>{t('profile-graph-empty.message')}</Status.Empty>;
  }

  return (
    <Layout.Flex column gap='sm'>
      {goals.length > 0 && (
        <Layout.Flex asChild column>
          <section aria-label={t('profile-graph-goals.heading')}>
            <h3 className='px-2 text-sm text-fg-muted'>{t('profile-graph-goals.heading')}</h3>
            <Listbox.Root
              items={goals.map((goal) => ({
                value: goal.id,
                label: goal.title,
                icon: GOAL_ICONS[goal.status],
                description: [t(`goal-horizon-${goal.horizon}.label`), t(`goal-status-${goal.status}.label`)].join(
                  ' · ',
                ),
              }))}
            >
              <Listbox.Viewport>
                <Listbox.Content>
                  {goals.map((goal) => (
                    <Listbox.Item key={goal.id} id={goal.id} />
                  ))}
                </Listbox.Content>
              </Listbox.Viewport>
            </Listbox.Root>
          </section>
        </Layout.Flex>
      )}
      {facts.length > 0 && (
        <Layout.Flex asChild column>
          <section aria-label={t('profile-graph-facts.heading')}>
            <h3 className='px-2 text-sm text-fg-muted'>{t('profile-graph-facts.heading')}</h3>
            <Listbox.Root
              items={facts.map((fact) => ({
                value: fact.id,
                label: fact.text,
                icon: 'ph--graph--regular',
                description: [
                  fact.predicate,
                  ...(fact.origin ? [t(`fact-origin-${fact.origin}.label`)] : []),
                  new Date(fact.saidAt).toLocaleDateString(),
                ].join(' · '),
              }))}
            >
              <Listbox.Viewport>
                <Listbox.Content>
                  {facts.map((fact) => (
                    <Listbox.Item key={fact.id} id={fact.id} />
                  ))}
                </Listbox.Content>
              </Listbox.Viewport>
            </Listbox.Root>
          </section>
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};

ProfileGraph.displayName = 'ProfileGraph';
