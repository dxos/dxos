//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Flex, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { type Goal, type Memory } from '#types';

export type ProfileGoal = Pick<Goal.Goal, 'id' | 'title' | 'description' | 'horizon' | 'status'>;
export type ProfileMemory = Pick<Memory.Memory, 'id' | 'content' | 'kind' | 'origin' | 'observedAt'>;

export type ProfileGraphProps = {
  goals: readonly ProfileGoal[];
  memories: readonly ProfileMemory[];
};

const GOAL_ICONS: Record<Goal.Status, string> = {
  proposed: 'ph--circle-dashed--regular',
  confirmed: 'ph--target--regular',
  active: 'ph--play-circle--regular',
  achieved: 'ph--check-circle--regular',
  dropped: 'ph--x-circle--regular',
};

const MEMORY_ICONS: Record<Memory.Kind, string> = {
  fact: 'ph--info--regular',
  preference: 'ph--heart--regular',
  goal: 'ph--flag--regular',
  commitment: 'ph--handshake--regular',
  relationship: 'ph--users--regular',
  event: 'ph--calendar--regular',
};

/** What an agent knows about a person or team: their goals and the active memories about them. */
export const ProfileGraph = ({ goals, memories }: ProfileGraphProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (goals.length === 0 && memories.length === 0) {
    return (
      <Flex center classNames='p-2 text-description' role='status'>
        {t('profile-graph-empty.message')}
      </Flex>
    );
  }

  return (
    <Flex column gap='sm'>
      {goals.length > 0 && (
        <Flex asChild column>
          <section aria-label={t('profile-graph-goals.heading')}>
            <h3 className='px-2 text-sm text-description'>{t('profile-graph-goals.heading')}</h3>
            <Listbox.Root>
              <Listbox.Content>
                {goals.map((goal) => (
                  <Listbox.Item key={goal.id} id={goal.id}>
                    <Listbox.ItemContent
                      icon={GOAL_ICONS[goal.status]}
                      title={goal.title}
                      description={[
                        t(`goal-horizon-${goal.horizon}.label`),
                        t(`goal-status-${goal.status}.label`),
                      ].join(' · ')}
                    />
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          </section>
        </Flex>
      )}
      {memories.length > 0 && (
        <Flex asChild column>
          <section aria-label={t('profile-graph-memories.heading')}>
            <h3 className='px-2 text-sm text-description'>{t('profile-graph-memories.heading')}</h3>
            <Listbox.Root>
              <Listbox.Content>
                {memories.map((memory) => (
                  <Listbox.Item key={memory.id} id={memory.id}>
                    <Listbox.ItemContent
                      icon={MEMORY_ICONS[memory.kind]}
                      title={memory.content}
                      description={[
                        t(`memory-kind-${memory.kind}.label`),
                        t(`memory-origin-${memory.origin}.label`),
                        new Date(memory.observedAt).toLocaleDateString(),
                      ].join(' · ')}
                    />
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          </section>
        </Flex>
      )}
    </Flex>
  );
};

ProfileGraph.displayName = 'ProfileGraph';
