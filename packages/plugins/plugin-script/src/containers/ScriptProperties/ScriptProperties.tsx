//
// Copyright 2024 DXOS.org
//

import { Octokit } from '@octokit/core';
import React, { type ChangeEvent, useCallback, useState } from 'react';

import { ToolId } from '@dxos/ai';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { SettingsOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Blueprint, Template } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { type Script, getUserFunctionIdInMetadata } from '@dxos/functions';
import { getInvocationUrl } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Clipboard, Input, useAsyncEffect, useControlledState, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { AccessToken } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';

export type ScriptPropertiesProps = AppSurface.ObjectPropertiesProps<Script.Script>;

type ScriptSubjectProps = Pick<ScriptPropertiesProps, 'subject'>;

export const ScriptProperties = (props: ScriptPropertiesProps) => {
  const { subject } = props;
  return (
    <>
      <Binding subject={subject} />
      <BlueprintEditor subject={subject} />
      <Publishing subject={subject} />
    </>
  );
};

const Binding = ({ subject: object }: ScriptSubjectProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const db = Obj.getDatabase(object);

  const [fn] = useQuery(db, Filter.type(Operation.PersistentOperation, { source: Ref.make(object) }));
  const functionId = fn && getUserFunctionIdInMetadata(Obj.getMeta(fn));
  const functionUrl =
    functionId &&
    getInvocationUrl(functionId, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: db?.spaceId,
    });

  const [binding, setBinding] = useControlledState(fn?.binding ?? '');
  const handleBindingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setBinding(event.target.value),
    [setBinding],
  );

  const handleBindingBlur = useCallback(() => {
    if (fn) {
      Obj.change(fn, (fn) => {
        fn.binding = binding;
      });
    }
  }, [fn, binding]);

  if (!fn) {
    return null;
  }

  // TODO(burdon): Form section.
  return (
    <div role='none' className='flex flex-col gap-2'>
      <Form.Section label={t('remote-function-settings.heading')} />

      {functionUrl && (
        <Input.Root>
          <Input.Label>{t('function-url.label')}</Input.Label>
          <Input.TextInput
            disabled
            value={functionUrl}
            onChange={(event) => {
              Obj.change(fn, (fn) => {
                fn.name = event.target.value;
              });
            }}
          />
          <Clipboard.IconButton value={functionUrl} />
        </Input.Root>
      )}

      <Input.Root>
        <Input.Label>{t('function-binding.label')}</Input.Label>
        <Input.TextInput
          placeholder={t('function-binding.placeholder')}
          value={binding}
          onChange={handleBindingChange}
          onBlur={handleBindingBlur}
        />
      </Input.Root>
    </div>
  );
};

const BlueprintEditor = ({ subject: object }: ScriptSubjectProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(object);
  const [fn] = useQuery(db, Filter.type(Operation.PersistentOperation, { source: Ref.make(object) }));
  const blueprints = useQuery(db, Filter.type(Blueprint.Blueprint));

  const [creating, setCreating] = useState(false);
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
    <div role='none' className='flex flex-col gap-4 my-form-padding'>
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

      <div role='none' className='flex justify-end gap-2'>
        <Button disabled={(!existingBlueprint && !fn?.key) || creating} onClick={handleSave}>
          {t('create-blueprint.label')}
        </Button>
      </div>
    </div>
  );
};

// TODO(burdon): Move to separate tab?
const Publishing = ({ subject: object }: ScriptSubjectProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(object);

  const [githubToken] = useQuery(db, Filter.type(AccessToken.AccessToken, { source: 'github.com' }));
  const gistKey = Obj.getMeta(object).keys.find(({ source }) => source === 'github.com');
  const [gistUrl, setGistUrl] = useState<string | undefined>();

  useAsyncEffect(async () => {
    const token = githubToken?.token;
    const gistId = gistKey?.id;
    if (!token || !gistId) {
      setGistUrl(undefined);
      return;
    }

    try {
      const octokit = new Octokit({ auth: githubToken.token });
      const response = await octokit.request('GET /gists/{gist_id}', {
        gist_id: gistId,
      });
      setGistUrl(response.data.html_url);
    } catch (err) {
      log.catch(err);
      setGistUrl(undefined);
    }
  }, [githubToken, gistKey]);

  const handleOpenTokenManager = useCallback(
    () =>
      invokePromise(SettingsOperation.Open, {
        plugin: 'org.dxos.plugin.token-manager',
      }),
    [invokePromise],
  );

  const [publishing, setPublishing] = useState(false);
  const handlePublish = useCallback(async () => {
    setPublishing(true);
    const octokit = new Octokit({ auth: githubToken.token });
    const source = await object.source.load();
    const filename = object.name ? kebabize(object.name) : 'composer-script';
    const files = { [`${filename}.ts`]: { content: source.content } };

    try {
      // TODO(wittjosiah): Factor out to intent.
      const meta = Obj.getMeta(object);
      const githubKey = meta.keys.find(({ source }) => source === 'github.com');
      const gistId = githubKey?.id;
      if (gistId) {
        await octokit.request('PATCH /gists/{gist_id}', {
          gist_id: gistId,
          files,
        });
      } else {
        const response = await octokit.request('POST /gists', {
          public: true,
          files,
        });
        const gistId = response.data.id;
        if (gistId) {
          Obj.change(object, (object) => {
            Obj.getMeta(object).keys.push({ source: 'github.com', id: gistId });
          });
        }
      }
    } finally {
      setPublishing(false);
    }
  }, [object, githubToken]);

  return (
    <div role='none' className='flex flex-col gap-4 my-form-padding'>
      <div role='none'>
        <h2>{t('script-publish-settings.label')}</h2>
        <p className='text-description text-sm'>{t('script-publish-settings.description')}</p>
      </div>
      {!githubToken && (
        <div role='none' className='flex flex-col gap-2'>
          <span>{t('no-github-token.label')}</span>
          <Button onClick={handleOpenTokenManager}>{t('open-token-manager.label')}</Button>
        </div>
      )}
      {githubToken && (
        <div role='none' className='flex justify-end gap-2'>
          {gistUrl && <Clipboard.IconButton value={gistUrl} />}
          <Button disabled={publishing} onClick={handlePublish}>
            {t('publish.label')}
          </Button>
        </div>
      )}
    </div>
  );
};
