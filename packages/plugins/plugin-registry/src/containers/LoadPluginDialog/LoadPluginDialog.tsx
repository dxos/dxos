//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/Hooks';
import { Button, Dialog, Field, Flex, useTranslation } from '@dxos/react-ui';

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
          <Field.Root validationValence={error ? 'error' : undefined}>
            <Field.Label>{t('plugin-url.label')}</Field.Label>
            <Field.Input
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
            {error && <Field.HelperText>{error}</Field.HelperText>}
          </Field.Root>
          <Flex justify='end'>
            <Button variant='primary' disabled={!url.trim() || loading} onClick={() => void handleLoad()}>
              {loading ? t('loading.label') : t('load-plugin.label')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Body>
    </Dialog.Content>
  );
};

LoadPluginDialog.displayName = 'LoadPluginDialog';
