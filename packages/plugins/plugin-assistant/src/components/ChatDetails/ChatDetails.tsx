//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { type AiContext } from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import type * as Skill from '@dxos/compute/Skill';
import { type Database, Obj } from '@dxos/echo';
import { Listbox } from '@dxos/react-ui-list';
import * as Accordion from '@dxos/react-ui/Accordion';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import type * as Util from '@dxos/react-ui/Util';

import { getSkillId, useActiveSkills, useContextObjects, useSkillHandlers } from '#hooks';

import { AssistantNamespace } from '../../namespace.ts';

const DEFAULT_OBJECT_ICON = 'ph--cube--regular';

export type ChatDetailsSectionProps = Util.ThemedClassName<
  PropsWithChildren<{
    title: string;
    icon?: string;
    count?: string | number;
    defaultOpen?: boolean;
    testId?: string;
  }>
>;

export const ChatDetailsSection = ({
  classNames,
  icon,
  title,
  count,
  defaultOpen = true,
  testId,
  children,
}: ChatDetailsSectionProps) => (
  <Accordion.Root border={false} defaultValue={defaultOpen ? [SECTION] : []} classNames={classNames}>
    <Accordion.Item value={SECTION} data-testid={testId}>
      <Accordion.ItemTrigger icon={icon} classNames='text-sm text-fg-muted'>
        {title}
        {count !== undefined && <span className='ms-2 text-fg-subtle'>{count}</span>}
      </Accordion.ItemTrigger>
      <Accordion.ItemContent>{children}</Accordion.ItemContent>
    </Accordion.Item>
  </Accordion.Root>
);

const SECTION = 'section';

export type ChatContextSectionProps = {
  db: Database.Database;
  context: AiContext.Binder;
};

export const ChatContextSection = ({ db, context }: ChatContextSectionProps) => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  const { objects, onUpdateObject } = useContextObjects({ db, context });
  const activeSkills = useActiveSkills({ context });
  const { onUpdateSkill } = useSkillHandlers({ context });
  const skills = useMemo(() => [...activeSkills.values()], [activeSkills]);

  const contextItems = useMemo(
    () => [
      ...objects.map((object) => ({
        value: `object:${object.id}`,
        label: ObjectCombobox.objectLabel(object, t),
        icon: Obj.getIcon(object)?.icon ?? DEFAULT_OBJECT_ICON,
      })),
    ],
    [objects, t],
  );

  const skillItems = useMemo(
    () =>
      skills.map((skill) => ({ value: `skill:${getSkillId(skill)}`, label: skill.name, icon: 'ph--student--regular' })),
    [skills],
  );

  return (
    <>
      <ChatDetailsSection
        icon='ph--cube--regular'
        title={t('details.context.title')}
        count={contextItems.length}
        testId='assistant.details.context'
      >
        <Listbox.Root items={contextItems}>
          <Listbox.Content gutter='none'>
            {objects.map((object) => (
              <ContextRow
                key={object.id}
                id={`object:${object.id}`}
                removeLabel={t('remove-object.label')}
                onRemove={() => onUpdateObject(Obj.getURI(object), false)}
              />
            ))}
          </Listbox.Content>
        </Listbox.Root>
      </ChatDetailsSection>
      <ChatDetailsSection
        icon='ph--student--regular'
        title={t('details.skills.label')}
        count={skillItems.length}
        defaultOpen={false}
        testId='assistant.details.skills'
      >
        <Listbox.Root items={skillItems}>
          <Listbox.Content gutter='none'>
            {skills.map((skill: Skill.Skill) => (
              <ContextRow
                key={getSkillId(skill)}
                id={`skill:${getSkillId(skill)}`}
                removeLabel={t('remove-skill.label')}
                onRemove={() => onUpdateSkill(skill, false)}
              />
            ))}
          </Listbox.Content>
        </Listbox.Root>
      </ChatDetailsSection>
    </>
  );
};

export type ChatContextPanelProps = {
  chat: Chat.Chat;
  db?: Database.Database;
  context?: AiContext.Binder;
};

export const ChatContextPanel = ({ chat, db = Obj.getDatabase(chat), context }: ChatContextPanelProps) =>
  db && context ? <ChatContextSection db={db} context={context} /> : null;

type ContextRowProps = {
  id: string;
  removeLabel: Theme.Label;
  onRemove: () => void;
};

const ContextRow = ({ id, removeLabel, onRemove }: ContextRowProps) => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  return (
    <Listbox.Item id={id} data-testid='assistant.details.context.item'>
      <Listbox.ItemIcon />
      <Listbox.ItemText />
      <Button.Root
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label={Theme.toLocalizedString(removeLabel, t)}
        onClick={onRemove}
      />
    </Listbox.Item>
  );
};
