//
// Copyright 2024 DXOS.org
//

import { Octokit } from '@octokit/core';
import React, { type ChangeEvent, useCallback, useState } from 'react';

import { ToolId } from '@dxos/ai';
import { SettingsAction, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Blueprint, Template } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { Function, type Script, getUserFunctionIdInMetadata } from '@dxos/functions';
import { getInvocationUrl } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Clipboard, Input, useAsyncEffect, useControlledState, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '../../meta';

export type ScriptObjectSettingsProps = {
  object: Script.Script;
};

export const ScriptObjectSettings = ({ object }: ScriptObjectSettingsProps) => {
  return (
    <>
      <Binding object={object} />
      <BlueprintEditor object={object} />
      <Publishing object={object} />
    </>
  );
};

export const ScriptProperties = ({ object }: ScriptObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Input.Root>
      <Input.Label>{t('description label')}</Input.Label>
      <Input.TextInput
        placeholder={t('description placeholder')}
        value={object.description ?? ''}
        onChange={(event) => {
          object.description = event.target.value;
        }}
      />
    </Input.Root>
  );
};

const BlueprintEditor = ({ object }: ScriptObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(object);
  const [fn] = useQuery(db, Filter.type(Function.Function, { source: Ref.make(object) }));
  const blueprints = useQuery(db, Filter.type(Blueprint.Blueprint));

  const [creating, setCreating] = useState(false);
  const [instructions, setInstructions] = useState<string>(`You can run the script "${object.name ?? 'script'}".`);
  const blueprintKey = `dxos.org/blueprint/${kebabize(object.name ?? 'script')}`;
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
        text.content = instructions;
        if (fn?.key) {
          const toolId = ToolId.make(fn.key);
          if (!existingBlueprint.tools?.includes(toolId)) {
            existingBlueprint.tools = [...(existingBlueprint.tools ?? []), toolId];
          }
        }
      } else if (fn?.key) {
        db.add(
          Blueprint.make({
            key: blueprintKey,
            name: object.name ?? 'Script',
            instructions: Template.make({
              source: instructions,
            }),
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
    <div className='flex flex-col gap-4 mlb-cardSpacingBlock'>
      <div>
        <h2>{t('blueprint editor label', { default: 'Blueprint' })}</h2>
        <p className='text-description text-sm'>
          {t('blueprint editor description', {
            default: 'Create a blueprint that exposes this script as a tool.',
          })}
        </p>
      </div>
      <Input.Root>
        <div role='none' className='flex flex-col gap-1'>
          <Input.Label>{t('blueprint instructions label', { default: 'Instructions' })}</Input.Label>
          <Input.TextArea
            placeholder={t('blueprint instructions placeholder', {
              default: 'Describe how this tool should be used.',
            })}
            rows={6}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            classNames='resize-y'
          />
        </div>
      </Input.Root>
      <div className='flex justify-end gap-2'>
        <Button disabled={(!existingBlueprint && !fn?.key) || creating} onClick={handleSave}>
          {t(creating ? 'creating label' : 'create blueprint label', {
            default: creating ? 'Creating…' : 'Create blueprint',
          })}
        </Button>
      </div>
    </div>
  );
};

const Binding = ({ object }: ScriptObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const db = Obj.getDatabase(object);
  const [fn] = useQuery(db, Filter.type(Function.Function, { source: Ref.make(object) }));

  const functionId = fn && getUserFunctionIdInMetadata(Obj.getMeta(fn));
  const functionUrl =
    functionId &&
    getInvocationUrl(functionId, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: db?.spaceId,
    });

  const [binding, setBinding] = useControlledState(fn?.binding ?? '');
  const handleBindingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setBinding(event.target.value);
    },
    [setBinding],
  );

  const handleBindingBlur = useCallback(() => {
    fn.binding = binding;
  }, [fn, binding]);

  if (!fn || !functionUrl) {
    return null;
  }

  // TODO(burdon): Use form.
  return (
    <div role='form' className='flex flex-col gap-2 mlb-cardSpacingBlock'>
      <h2>{t('remote function settings heading')}</h2>
      <Input.Root>
        <div role='none' className='flex flex-col gap-1'>
          <Input.Label>{t('function url label')}</Input.Label>
          <div role='none' className='flex gap-1'>
            <Input.TextInput
              disabled
              value={functionUrl}
              onChange={(event) => {
                fn.name = event.target.value;
              }}
            />
            <Clipboard.IconButton value={functionUrl} />
          </div>
        </div>
      </Input.Root>
      <Input.Root>
        <div role='none' className='flex flex-col gap-1'>
          <Input.Label>{t('function binding label')}</Input.Label>
          <Input.TextInput
            placeholder={t('function binding placeholder')}
            value={binding}
            onChange={handleBindingChange}
            onBlur={handleBindingBlur}
          />
        </div>
      </Input.Root>
    </div>
  );
};

// TODO(burdon): Move to separate tab?
const Publishing = ({ object }: ScriptObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
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
      dispatch(
        createIntent(SettingsAction.Open, {
          plugin: 'dxos.org/plugin/token-manager',
        }),
      ),
    [],
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
        if (response.data.id) {
          meta.keys.push({ source: 'github.com', id: response.data.id });
        }
      }
    } finally {
      setPublishing(false);
    }
  }, [object, githubToken]);

  return (
    <div className='flex flex-col gap-4 mlb-cardSpacingBlock'>
      <div>
        <h2>{t('script publish settings label')}</h2>
        <p className='text-description text-sm'>{t('script publish settings description')}</p>
      </div>
      {!githubToken && (
        <div className='flex flex-col gap-2'>
          <span>{t('no github token label')}</span>
          <Button onClick={handleOpenTokenManager}>{t('open token manager label')}</Button>
        </div>
      )}
      {githubToken && (
        <div className='flex justify-end gap-2'>
          {gistUrl && <Clipboard.IconButton value={gistUrl} />}
          <Button disabled={publishing} onClick={handlePublish}>
            {t(publishing ? 'publishing label' : 'publish label')}
          </Button>
        </div>
      )}
    </div>
  );
};
