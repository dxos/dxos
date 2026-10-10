//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren } from 'react';

import { type Database } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';
import { AgentChannels } from '#types';

//
// Root
//

type AgentActivityRootProps = PropsWithChildren<{
  role?: string;
}>;

/** The agent's activity panel: its channels, skills and conversations in one scrolling body. */
const AgentActivityRoot = ({ role, children }: AgentActivityRootProps) => (
  <Panel.Root role={role}>
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport asChild>
          <Layout.Container>{children}</Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);

AgentActivityRoot.displayName = 'AgentActivity.Root';

//
// Channels
//

type AgentActivityChannelsProps = PropsWithChildren<{
  /** Database the channel picker queries. */
  db?: Database.Database;
  values?: Partial<AgentChannels.Properties>;
  onSave?: (values: AgentChannels.Properties) => void;
}>;

/**
 * The channels the agent converses in; children render each channel's backend settings
 * (e.g. the Discord bot) below the picker.
 */
const AgentActivityChannels = ({ db, values, onSave, children }: AgentActivityChannelsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex asChild column gap='sm'>
      <section aria-label={t('channels.label')}>
        <Form.Root<AgentChannels.Properties>
          schema={AgentChannels.Properties}
          db={db}
          values={values}
          autoSave
          onSave={onSave}
        >
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet label={t('channels.label')} description={t('channels.description')}>
                <Form.Fields />
              </Form.FieldSet>
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
        {children}
      </section>
    </Layout.Flex>
  );
};

AgentActivityChannels.displayName = 'AgentActivity.Channels';

//
// Skills
//

type AgentActivitySkillsProps = PropsWithChildren<{
  /** The registry keys of the rows, in order. */
  ids: readonly string[];
}>;

/** The skills bound to the agent's conversation; children are {@link AgentActivitySkill} rows. */
const AgentActivitySkills = ({ ids, children }: AgentActivitySkillsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Container asChild>
      <section aria-label={t('skills.heading')}>
        <h3 className='px-2 text-sm text-fg-muted'>{t('skills.heading')}</h3>
        {ids.length === 0 ? (
          <Layout.Flex center classNames='p-2 text-fg-muted' role='status'>
            {t('skills-empty.message')}
          </Layout.Flex>
        ) : (
          <Listbox.Root items={toOptions(ids)}>
            <Listbox.Content scroll={false}>{children}</Listbox.Content>
          </Listbox.Root>
        )}
      </section>
    </Layout.Container>
  );
};

AgentActivitySkills.displayName = 'AgentActivity.Skills';

// Rows render their own text (a conversation's name is read by its row), so an option carries only the id Ark keys it by.
const toOptions = (ids: readonly string[]) => ids.map((id) => ({ value: id, label: id }));

//
// Skill
//

type AgentActivitySkillProps = {
  /** The skill's registry key. */
  id: string;
  name: string;
  /** Whether the agent runs an editable space copy rather than the built-in skill. */
  customized?: boolean;
  /** Disables the row's action while a customize/reset is in flight. */
  busy?: boolean;
  onOpen?: (id: string) => void;
  onCustomize?: (id: string) => void;
  onReset?: (id: string) => void;
};

/** One skill the agent runs: a built-in one can be customized; a customized one opens for editing or resets. */
const AgentActivitySkill = ({
  id,
  name,
  customized = false,
  busy = false,
  onOpen,
  onCustomize,
  onReset,
}: AgentActivitySkillProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Listbox.Item id={id} onClick={customized ? () => onOpen?.(id) : undefined}>
      <Listbox.ItemIcon icon='ph--blueprint--regular' />
      <Listbox.ItemText>{name}</Listbox.ItemText>
      <Listbox.ItemDescription>
        {t(customized ? 'skill-customized.label' : 'skill-compiled.label')}
      </Listbox.ItemDescription>
      <Button.Root
        iconOnly
        variant='ghost'
        disabled={busy}
        icon={customized ? 'ph--arrow-counter-clockwise--regular' : 'ph--pencil-simple--regular'}
        label={t(customized ? 'skill-reset.label' : 'skill-customize.label')}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          // The row itself opens the skill; the button must not also trigger that.
          event.stopPropagation();
          (customized ? onReset : onCustomize)?.(id);
        }}
      />
    </Listbox.Item>
  );
};

AgentActivitySkill.displayName = 'AgentActivity.Skill';

//
// Conversations
//

type AgentActivityConversationsProps = PropsWithChildren<{
  /** The ids of the rows, in order. */
  ids: readonly string[];
}>;

/** The agent's conversations bridged from its channels; children are {@link AgentActivityConversation} rows. */
const AgentActivityConversations = ({ ids, children }: AgentActivityConversationsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Container asChild>
      <section aria-label={t('conversations.heading')}>
        <h3 className='px-2 text-sm text-fg-muted'>{t('conversations.heading')}</h3>
        {ids.length === 0 ? (
          <Layout.Flex center classNames='p-2 text-fg-muted' role='status'>
            {t('conversations-empty.message')}
          </Layout.Flex>
        ) : (
          <Listbox.Root items={toOptions(ids)}>
            <Listbox.Content scroll={false}>{children}</Listbox.Content>
          </Listbox.Root>
        )}
      </section>
    </Layout.Container>
  );
};

AgentActivityConversations.displayName = 'AgentActivity.Conversations';

//
// Conversation
//

type AgentActivityConversationProps = {
  id: string;
  title?: string;
  /** When the conversation last had a message; absent before its first. */
  lastActivity?: Typography.TimestampProps['date'];
  /** Fixes the instant timestamps are measured against, so stories and tests do not drift. */
  now?: Date;
  onSelect?: (id: string) => void;
};

/** One channel conversation (a channel, thread or DM) the agent converses in. */
const AgentActivityConversation = ({ id, title, lastActivity, now, onSelect }: AgentActivityConversationProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Listbox.Item id={id} onClick={() => onSelect?.(id)}>
      <Listbox.ItemIcon icon='ph--chat-circle-dots--regular' />
      <Listbox.ItemText>{title || t('conversation-untitled.label')}</Listbox.ItemText>
      {lastActivity !== undefined && (
        <Listbox.ItemDescription>
          <Typography.Timestamp date={lastActivity} now={now} />
        </Listbox.ItemDescription>
      )}
    </Listbox.Item>
  );
};

AgentActivityConversation.displayName = 'AgentActivity.Conversation';

//
// AgentActivity
//

export const AgentActivity = {
  Root: AgentActivityRoot,
  Channels: AgentActivityChannels,
  Skills: AgentActivitySkills,
  Skill: AgentActivitySkill,
  Conversations: AgentActivityConversations,
  Conversation: AgentActivityConversation,
};

export type {
  AgentActivityChannelsProps,
  AgentActivityConversationProps,
  AgentActivityConversationsProps,
  AgentActivityRootProps,
  AgentActivitySkillProps,
  AgentActivitySkillsProps,
};
