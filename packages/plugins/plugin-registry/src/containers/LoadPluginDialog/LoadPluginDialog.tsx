//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { RegistryOperation, describeLoadError } from '#operations';

export const LoadPluginDialog = () => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const handleLoad = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);
    // `invokePromise` reports a handler failure as `{ error }` rather than rejecting.
    const { error } = await invokePromise(RegistryOperation.LoadPlugin, { url: trimmed });
    setLoading(false);
    if (error) {
      setError(describeLoadError(error));
    } else {
      closeRef.current?.click();
    }
  }, [url, invokePromise]);

  return (
    <Next.Dialog.Content>
      <Next.Dialog.Header>
        <Next.Dialog.Title>{t('load-by-url-dialog.title')}</Next.Dialog.Title>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Close ref={closeRef} />
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        {/* TODO(burdon): Form section. */}
        <Flex column gap='lg'>
          <Next.Field.Root validationValence={error ? 'error' : undefined}>
            <Next.Field.Label>{t('plugin-url.label')}</Next.Field.Label>
            <Next.Input
              placeholder='https://example.com/manifest.json'
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleLoad();
                }
              }}
              disabled={loading}
              autoFocus
            />
            {error && <Next.Field.HelperText>{error}</Next.Field.HelperText>}
          </Next.Field.Root>
          <Flex justify='end'>
            <Next.Button variant='primary' disabled={!url.trim() || loading} onClick={() => void handleLoad()}>
              {loading ? t('loading.label') : t('load-plugin.label')}
            </Next.Button>
          </Flex>
        </Flex>
      </Next.Dialog.Body>
    </Next.Dialog.Content>
  );
};

LoadPluginDialog.displayName = 'LoadPluginDialog';
