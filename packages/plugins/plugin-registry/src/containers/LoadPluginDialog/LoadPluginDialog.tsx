//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useRef, useState } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';
import { Button, Dialog, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const LOAD_PLUGIN_DIALOG = `${meta.id}.LoadPluginDialog`;

export const LoadPluginDialog = () => {
  const manager = usePluginManager();
  const { t } = useTranslation(meta.id);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const handleLoad = useCallback(() => {
    if (!url.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    void Effect.gen(function* () {
      yield* manager.add(url.trim());
      closeRef.current?.click();
    }).pipe(
      Effect.catchAll((err) =>
        Effect.sync(() => {
          setError(String(err));
        }),
      ),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      runAndForwardErrors,
    );
  }, [url, manager]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('load-by-url-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <div className='flex flex-col gap-4'>
          <Input.Root validationValence={error ? 'error' : undefined}>
            <Input.Label>{t('plugin-url.label')}</Input.Label>
            <Input.TextInput
              placeholder='https://example.com/plugin.mjs'
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleLoad();
                }
              }}
              disabled={loading}
              autoFocus
            />
            {error && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
          </Input.Root>
          <div className='flex justify-end'>
            <Button variant='primary' disabled={!url.trim() || loading} onClick={handleLoad}>
              {loading ? t('loading.label') : t('load-plugin.label')}
            </Button>
          </div>
        </div>
      </Dialog.Body>
    </Dialog.Content>
  );
};
