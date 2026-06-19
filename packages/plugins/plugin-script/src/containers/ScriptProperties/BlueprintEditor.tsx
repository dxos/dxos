//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { ToolId } from '@dxos/ai';
import { Blueprint, Template } from '@dxos/compute';
import { type Script } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Input, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';

export type BlueprintEditorProps = { object: Script.Script };

export const BlueprintEditor = ({ object }: BlueprintEditorProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(object);
  const [fn] = useQuery(db, Filter.type(Operation.PersistentOperation, { source: Ref.make(object) }));
  const blueprints = useQuery(db, Filter.type(Blueprint.Blueprint));

  const [creating, setCreating] = useState(false);
  // TODO(burdon): Remove?
  const [instructions, setInstructions] = useState<string>(`You can run the script "${object.name ?? 'script'}".`);
  const blueprintKey = `org.dxos.blueprint.${kebabize(object.name ?? 'script')}`;
  const existingBlueprint = blueprints.find((bp) => Obj.getMeta(bp).key === blueprintKey);
  const fnKey = fn ? Obj.getMeta(fn).key : undefined;

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
        Obj.update(text, (text) => {
          text.content = instructions;
        });

        if (fnKey) {
          const toolId = ToolId.make(fnKey);
          if (!existingBlueprint.tools?.includes(toolId)) {
            Obj.update(existingBlueprint, (existingBlueprint) => {
              existingBlueprint.tools = [...(existingBlueprint.tools ?? []), toolId];
            });
          }
        }
      } else if (fnKey) {
        db.add(
          Blueprint.make({
            key: blueprintKey,
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
  }, [db, existingBlueprint, fnKey, blueprintKey, object.name, instructions]);

  return (
    <div className='flex flex-col'>
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

      <div className='pt-2'>
        <Button disabled={(!existingBlueprint && !fnKey) || creating} onClick={handleSave}>
          {t(existingBlueprint ? 'update-blueprint.label' : 'create-blueprint.label')}
        </Button>
      </div>
    </div>
  );
};
