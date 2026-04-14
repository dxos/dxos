//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { ToolId } from '@dxos/ai';
import { Blueprint, Template } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { type Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Input, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';

export type BlueprintEditorProps = { object: Script.Script };

export const BlueprintEditor = ({ object }: BlueprintEditorProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(object);
  const [fn] = useQuery(db, Filter.type(Operation.PersistentOperation, { source: Ref.make(object) }));
  const blueprints = useQuery(db, Filter.type(Blueprint.Blueprint));

  const [creating, setCreating] = useState(false);
  // TODO(burdon): Remove?
  const [instructions, setInstructions] = useState<string>(`You can run the script "${object.name ?? 'script'}".`);
  const blueprintKey = `org.dxos.blueprint.${kebabize(object.name ?? 'script')}`;
  const existingBlueprint = blueprints.find((bp) => bp.key === blueprintKey);

  useAsyncEffect(async () => {
    if (!existingBlueprint) {
      return;
    }

    const source = await existingBlueprint.instructions.source.load();
    setInstructions(source.content ?? '');
  }, [existingBlueprint]);

  const handleSave = useCallback(async () => {
    if (!db) {
      return;
    }

    setCreating(true);
    try {
      if (existingBlueprint) {
        const text = await existingBlueprint.instructions.source.load();
        Obj.change(text, (text) => {
          text.content = instructions;
        });

        if (fn?.key) {
          const toolId = ToolId.make(fn.key);
          if (!existingBlueprint.tools?.includes(toolId)) {
            Obj.change(existingBlueprint, (existingBlueprint) => {
              existingBlueprint.tools = [...(existingBlueprint.tools ?? []), toolId];
            });
          }
        }
      } else if (fn?.key) {
        db.add(
          Blueprint.make({
            key: blueprintKey,
            name: object.name ?? 'Script',
            instructions: Template.make({ source: instructions }),
            tools: [ToolId.make(fn.key)],
          }),
        );
      }
      await db.flush();
    } finally {
      setCreating(false);
    }
  }, [db, existingBlueprint, fn, blueprintKey, object.name, instructions]);

  return (
    <div role='none' className='flex flex-col'>
      <Form.Section label={t('blueprint-editor.label')} description={t('blueprint-editor.description')} />

      <Input.Root>
        <Input.Label>{t('blueprint-instructions.label')}</Input.Label>
        <Input.TextArea
          placeholder={t('blueprint-instructions.placeholder')}
          rows={6}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          classNames='resize-y'
        />
      </Input.Root>

      <div role='none' className='pt-2'>
        <Button disabled={(!existingBlueprint && !fn?.key) || creating} onClick={handleSave}>
          {t('create-blueprint.label')}
        </Button>
      </div>
    </div>
  );
};
