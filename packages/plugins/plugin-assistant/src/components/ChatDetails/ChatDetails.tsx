//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo } from 'react';

import { type AiContext } from '@dxos/assistant';
import type * as Skill from '@dxos/compute/Skill';
import { type Database, Obj } from '@dxos/echo';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import type * as Util from '@dxos/react-ui/Util';

import { getSkillId, useActiveSkills, useContextObjects, useSkillHandlers } from '#hooks';
import { meta } from '#meta';

const DEFAULT_OBJECT_ICON = 'ph--cube--regular';

//
// Section
//

export type ChatDetailsSectionProps = Util.ThemedClassName<
  PropsWithChildren<{
    title: string;
    /** Shown beside the title, so a collapsed section still says how much it holds. */
    count?: string | number;
    defaultOpen?: boolean;
    testId?: string;
  }>
>;

/**
 * One collapsible section of the details tray. Plugins render their own contributed section with it,
 * so every section opens, closes and labels itself the same way.
 */
export const ChatDetailsSection = ({
  classNames,
  title,
  count,
  defaultOpen = true,
  testId,
  children,
}: ChatDetailsSectionProps) => (
  <Collapsible.Root defaultOpen={defaultOpen} classNames={classNames} data-testid={testId}>
    <Collapsible.Trigger classNames='text-sm text-fg-muted'>
      {title}
      {count !== undefined && <span className='text-fg-subtle'>{count}</span>}
    </Collapsible.Trigger>
    <Collapsible.Content>{children}</Collapsible.Content>
  </Collapsible.Root>
);

//
// Context
//

export type ChatContextSectionProps = {
  db: Database.Database;
  context: AiContext.Binder;
};

/**
 * What the conversation has in context: the objects mentioned into it, then the skills it has loaded in a
 * section of their own. MCP servers are not listed: their switch is the space's, shown in the "+" menu,
 * and listing it here would read as something this chat holds. Skills are collapsed by default: every chat
 * starts with several bound, and listed open they would push the tasks below the fold. Objects and
 * skills come out with their x; the message that mentioned an object stays as written.
 */
export const ChatContextSection = ({ db, context }: ChatContextSectionProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { objects, onUpdateObject } = useContextObjects({ db, context });
  const activeSkills = useActiveSkills({ context });
  const { onUpdateSkill } = useSkillHandlers({ context });
  const skills = useMemo(() => [...activeSkills.values()], [activeSkills]);

  const contextItems = useMemo(
    () => [
      ...objects.map((object) => ({
        value: `object:${object.id}`,
        label: Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id,
        icon: Obj.getIcon(object)?.icon ?? DEFAULT_OBJECT_ICON,
      })),
    ],
    [objects],
  );

  const skillItems = useMemo(
    () =>
      skills.map((skill) => ({ value: `skill:${getSkillId(skill)}`, label: skill.name, icon: 'ph--student--regular' })),
    [skills],
  );

  return (
    <>
      <ChatDetailsSection
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

type ContextRowProps = {
  id: string;
  removeLabel: Theme.Label;
  onRemove: () => void;
};

const ContextRow = ({ id, removeLabel, onRemove }: ContextRowProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
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
