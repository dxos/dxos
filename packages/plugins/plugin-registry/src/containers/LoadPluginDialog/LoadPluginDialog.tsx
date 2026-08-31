//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useRef, useState } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { Button, Dialog, Flex, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export const LoadPluginDialog = () => {
  const manager = usePluginManager();
  const { t } = useTranslation(meta.profile.key);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const handleLoad = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);

    void Effect.gen(function* () {
      const plugin = yield* manager.add(trimmed);
      yield* manager.enable(plugin.meta.profile.key);
      closeRef.current?.click();
    }).pipe(
      Effect.catch((err) =>
        Effect.sync(() => {
          setError(String(err));
        }),
      ),
      Effect.tap(() => Effect.sync(() => setLoading(false))),
      EffectEx.runAndForwardErrors,
    );
  }, [url, manager]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('load-by-url-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        {/* TODO(burdon): Form section. */}
        <Flex column gap='lg'>
          <Input.Root validationValence={error ? 'error' : undefined}>
            <Input.Label>{t('plugin-url.label')}</Input.Label>
            <Input.TextInput
              placeholder='https://example.com/manifest.json'
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
          <Flex justify='end'>
            <Button variant='primary' disabled={!url.trim() || loading} onClick={handleLoad}>
              {loading ? t('loading.label') : t('load-plugin.label')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Body>
    </Dialog.Content>
  );
};

LoadPluginDialog.displayName = 'LoadPluginDialog';
