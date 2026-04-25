//
// Copyright 2024 DXOS.org
//

import { Octokit } from '@octokit/core';
import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { SettingsOperation } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { type Script } from '@dxos/compute';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Clipboard, Message, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { AccessToken } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';

export type FunctionPublishingProps = { object: Script.Script };

// TODO(burdon): Move to separate tab?
export const FunctionPublishing = ({ object }: FunctionPublishingProps) => {
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
    <div role='none' className='flex flex-col'>
      <Form.Section label={t('script-publish-settings.label')} description={t('script-publish-settings.description')} />

      {!githubToken && (
        <div role='none' className='flex flex-col py-form-gap'>
          <Message.Root valence='info'>
            <Message.Title>{t('no-github-token.label')}</Message.Title>
          </Message.Root>
          <div role='none' className='flex pt-form-gap'>
            <Button onClick={handleOpenTokenManager}>{t('open-token-manager.label')}</Button>
          </div>
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
