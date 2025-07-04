//
// Copyright 2024 DXOS.org
//

import { Octokit } from '@octokit/core';
import React, { type ChangeEvent, useCallback, useEffect, useState } from 'react';

import { createIntent, SettingsAction, useIntentDispatcher } from '@dxos/app-framework';
import { FunctionType, type ScriptType, getInvocationUrl, getUserFunctionUrlInMetadata } from '@dxos/functions';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Filter, getMeta, getSpace, Ref, useQuery } from '@dxos/react-client/echo';
import { Button, Clipboard, Input, useControlledState, useTranslation } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';

import { SCRIPT_PLUGIN } from '../../meta';

export type ScriptObjectSettingsProps = {
  object: ScriptType;
};

export const ScriptObjectSettings = ({ object }: ScriptObjectSettingsProps) => {
  return (
    <>
      <Binding object={object} />
      <Publishing object={object} />
    </>
  );
};

export const ScriptProperties = ({ object }: ScriptObjectSettingsProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
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

const Binding = ({ object }: ScriptObjectSettingsProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
  const space = getSpace(object);
  const [fn] = useQuery(space, Filter.type(FunctionType, { source: Ref.make(object) }));

  const functionPath = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  const functionUrl =
    functionPath &&
    getInvocationUrl(functionPath, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
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
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(object);
  const [githubToken] = useQuery(space, Filter.type(DataType.AccessToken, { source: 'github.com' }));
  const gistKey = getMeta(object).keys.find(({ source }) => source === 'github.com');
  const [gistUrl, setGistUrl] = useState<string | undefined>();

  useEffect(() => {
    const token = githubToken?.token;
    const gistId = gistKey?.id;
    if (!token || !gistId) {
      setGistUrl(undefined);
      return;
    }

    const timeout = setTimeout(async () => {
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
    });

    return () => clearTimeout(timeout);
  }, [githubToken, gistKey]);

  const handleOpenTokenManager = useCallback(
    () => dispatch(createIntent(SettingsAction.Open, { plugin: 'dxos.org/plugin/token-manager' })),
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
      const meta = getMeta(object);
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

// TODO(wittjosiah): Factor out.
// From https://stackoverflow.com/a/67243723/2804332
const kebabize = (str: string) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
