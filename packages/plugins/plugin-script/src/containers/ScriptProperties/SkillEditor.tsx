//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { ToolId } from '@dxos/ai';
import { Skill, Template } from '@dxos/compute';
import { type Script } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Button, Input, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';

export type SkillEditorProps = { object: Script.Script };

export const SkillEditor = ({ object }: SkillEditorProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(object);
  const [fn] = useQuery(db, Filter.type(Operation.PersistentOperation, { source: Ref.make(object) }));
  const skills = useQuery(db, Filter.type(Skill.Skill));

  const [creating, setCreating] = useState(false);
  // TODO(burdon): Remove?
  const [instructions, setInstructions] = useState<string>(`You can run the script "${object.name ?? 'script'}".`);
  const skillKey = `org.dxos.skill.${kebabize(object.name ?? 'script')}`;
  const existingSkill = skills.find((bp) => Obj.getMeta(bp).key === skillKey);
  const fnKey = fn ? Obj.getMeta(fn).key : undefined;

  useAsyncEffect(async () => {
    if (!existingSkill) {
      return;
    }

    const source = await existingSkill.instructions.source.load();
    setInstructions(source.content ?? '');
  }, [existingSkill]);

  const handleSave = useCallback(async () => {
    if (!db) {
      return;
    }

    setCreating(true);
    try {
      if (existingSkill) {
        const text = await existingSkill.instructions.source.load();
        Obj.update(text, (text) => {
          text.content = instructions;
        });

        if (fnKey) {
          const toolId = ToolId.make(fnKey);
          if (!existingSkill.tools?.includes(toolId)) {
            Obj.update(existingSkill, (existingSkill) => {
              existingSkill.tools = [...(existingSkill.tools ?? []), toolId];
            });
          }
        }
      } else if (fnKey) {
        db.add(
          Skill.make({
            key: skillKey,
            name: object.name ?? 'Script',
            instructions: Template.make({ source: instructions }),
            tools: [ToolId.make(fnKey)],
          }),
        );
      }
      await db.flush();
    } finally {
      setCreating(false);
    }
  }, [db, existingSkill, fnKey, skillKey, object.name, instructions]);

  return (
    <div className='flex flex-col'>
      <Form.Section title={t('skill-editor.label')} description={t('skill-editor.description')} />

      <Input.Root>
        <Input.Label>{t('skill-instructions.label')}</Input.Label>
        <Input.TextArea
          placeholder={t('skill-instructions.placeholder')}
          rows={6}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          classNames='resize-y'
        />
      </Input.Root>

      <div className='pt-2'>
        <Button disabled={(!existingSkill && !fnKey) || creating} onClick={handleSave}>
          {t(existingSkill ? 'update-skill.label' : 'create-skill.label')}
        </Button>
      </div>
    </div>
  );
};

SkillEditor.displayName = 'SkillEditor';
