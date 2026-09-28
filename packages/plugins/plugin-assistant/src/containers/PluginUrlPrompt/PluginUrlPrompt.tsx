//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useState } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';
import { RegistryOperation, describeLoadError } from '@dxos/plugin-registry/operations';
import { Button, Flex, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { useChatReportContext } from '../../components/Chat/context.ts';

const PLUGIN_URL_PROMPT_NAME = 'PluginUrlPrompt';

export type PluginUrlPromptProps = {
  /** URL of the plugin's `manifest.json`. */
  url?: string;
  /** Name the agent gives the plugin; only a label, the manifest decides what loads. */
  name?: string;
};

/**
 * Agent-facing prompt to load a plugin the host does not have, from the URL of its manifest.
 * Loading runs that code inside the app, so the agent may only ask: the URL is shown in full and the
 * button here is the only path that loads it.
 */
export const PluginUrlPrompt = ({ url, name }: PluginUrlPromptProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const { submit } = useChatReportContext(PLUGIN_URL_PROMPT_NAME);
  const { invokePromise } = useOperationInvoker();
  const enabled = useAtomValue(manager.enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  // Read from the loader's persisted entries rather than component state, so a remounted chat does
  // not offer to load a plugin that is already in.
  const loadedId = url ? UrlLoader.getRemoteEntries().find((entry) => entry.url === url)?.id : undefined;
  const isLoaded = loadedId !== undefined && enabled.includes(loadedId);

  const handleLoad = useCallback(async () => {
    if (!url) {
      return;
    }
    setPending(true);
    setError(undefined);
    // `invokePromise` reports a handler failure as `{ error }` rather than rejecting.
    const { data, error } = await invokePromise(RegistryOperation.LoadPlugin, { url });
    setPending(false);
    if (error || !data) {
      setError(describeLoadError(error));
    } else {
      // The agent is waiting on a click it cannot observe, so the outcome is reported as a turn.
      submit(`Loaded the plugin \`${data.id}\` from ${url} and enabled it. Continue.`);
    }
  }, [invokePromise, url, submit]);

  if (!url) {
    return null;
  }

  const label = name ?? t('plugin-url-prompt.default.name');

  return (
    <Flex
      role='group'
      column
      gap='sm'
      classNames='my-2 p-3 border border-subdued-separator rounded-sm'
      data-testid='assistant.pluginUrlPrompt'
    >
      <Flex gap='sm' align='center'>
        <Icon icon='ph--cloud-arrow-down--regular' size={5} classNames='shrink-0 text-subdued' />
        <Flex column classNames='min-w-0'>
          <p className='text-sm font-medium truncate'>{t('plugin-url-prompt.title', { plugin: label })}</p>
          <p className='text-sm text-subdued'>
            {isLoaded
              ? t('plugin-url-prompt.loaded', { plugin: label })
              : t('plugin-url-prompt.description', { plugin: label })}
          </p>
        </Flex>
      </Flex>
      <code className='text-xs text-subdued break-all'>{url}</code>
      {error && <p className='text-sm text-error-text'>{t('plugin-url-prompt.failed', { error })}</p>}
      {!isLoaded && (
        <Flex justify='end'>
          <Button
            variant='primary'
            disabled={pending}
            onClick={() => void handleLoad()}
            data-testid='assistant.pluginUrlPrompt.load'
          >
            {t('plugin-url-prompt.button')}
          </Button>
        </Flex>
      )}
    </Flex>
  );
};

PluginUrlPrompt.displayName = 'PluginUrlPrompt';
