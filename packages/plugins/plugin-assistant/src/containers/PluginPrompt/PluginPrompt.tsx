//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as Operations from '@dxos/plugin-registry/Operations';
import * as Button from '@dxos/react-ui/Button';
import * as Flex from '@dxos/react-ui/Flex';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { meta } from '#meta';

import { useChatReportContext } from '../../components/Chat/context.ts';

const PLUGIN_PROMPT_NAME = 'PluginPrompt';

export type PluginPromptProps = {
  /** Id of the plugin the agent needs, e.g. `org.dxos.plugin.markdown`. */
  plugin?: string;
};

/**
 * Agent-facing plugin prompt: rendered when the assistant needs a capability that an installed but
 * disabled plugin provides. Enabling changes the user's workspace, so the agent may only ask —
 * the button here is the only path that turns the plugin on.
 */
export const PluginPrompt = ({ plugin: pluginId }: PluginPromptProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const manager = PluginManagerProvider.usePluginManager();
  const { submit } = useChatReportContext(PLUGIN_PROMPT_NAME);
  const { invokePromise } = Hooks.useOperationInvoker();
  const enabled = useAtomValue(manager.enabled);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const plugin = useMemo(
    () => (pluginId ? manager.getPlugins().find(({ meta }) => meta.profile.key === pluginId) : undefined),
    [manager, pluginId],
  );

  const handleEnable = useCallback(async () => {
    if (!pluginId) {
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      // `invokePromise` turns a handler failure into `{ error }` rather than rejecting, and the
      // operation itself reports a plugin it could not enable in `rejected` — neither reaches a
      // `catch`, so both are read here.
      const { data, error } = await invokePromise(Operations.RegistryOperation.EnablePlugins, { ids: [pluginId] });
      if (error || data?.rejected.some(({ id }) => id === pluginId)) {
        setFailed(true);
      } else {
        // The agent is waiting on a click it cannot observe, so the outcome is reported as a turn.
        submit(`Enabled the plugin \`${pluginId}\`. Continue.`);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }, [invokePromise, pluginId, submit]);

  if (!pluginId) {
    return null;
  }

  const label = plugin?.meta.profile.name ?? pluginId;
  const isEnabled = enabled.includes(pluginId);

  return (
    <Flex.Flex role='group' column gap='sm' classNames='my-2 p-3 border border-separator-subtle rounded-sm'>
      <Flex.Flex gap='sm' align='center'>
        <Icon.Icon icon='ph--plugs--regular' size='lg' tone='subtle' />
        <Flex.Flex column classNames='min-w-0'>
          <p className='text-sm font-medium truncate'>{t('plugin-prompt.title', { plugin: label })}</p>
          {/* A plugin's own description runs to paragraphs and would dwarf the chat. */}
          <p className='text-sm text-fg-subtle'>
            {!plugin
              ? t('plugin-prompt.unavailable', { plugin: label })
              : isEnabled
                ? t('plugin-prompt.enabled', { plugin: label })
                : t('plugin-prompt.description', { plugin: label })}
          </p>
        </Flex.Flex>
      </Flex.Flex>
      {failed && <p className='text-sm text-error-text'>{t('plugin-prompt.failed', { plugin: label })}</p>}
      {plugin && !isEnabled && (
        <Flex.Flex justify='end'>
          <Button.Button variant='primary' disabled={pending} onClick={handleEnable}>
            {t('plugin-prompt.button')}
          </Button.Button>
        </Flex.Flex>
      )}
    </Flex.Flex>
  );
};

PluginPrompt.displayName = 'PluginPrompt';
