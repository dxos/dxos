//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useState } from 'react';

import { DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { Button, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { AssistantCapabilities, type Ollama } from '#types';

/** Prefix shared by all Ollama model ids; stripped to recover the raw `ollama pull` name. */
const OLLAMA_MODEL_PREFIX = 'ai.ollama.model.';

/** Quick-pick model names sourced from the curated defaults. */
const QUICK_PICKS = DEFAULT_OLLAMA_MODELS.map((id) => id.slice(OLLAMA_MODEL_PREFIX.length));

/**
 * Manage locally-installed Ollama models. The {@link AssistantCapabilities.OllamaManager}
 * capability is only contributed by the native (desktop) runtime, so this renders nothing in the
 * browser/mobile. Split from the section body so hooks are never called conditionally.
 */
export const OllamaModels = () => {
  const manager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  if (!manager) {
    return null;
  }

  return <OllamaModelsSection manager={manager} />;
};

export const OllamaModelsSection = ({ manager }: { manager: Ollama.Manager }) => {
  const { t } = useTranslation(meta.profile.key);
  // Explicit subscription: the picker and rows must re-render as pulls/installs land.
  const state = useAtomValue(manager.state);
  const [name, setName] = useState('');
  // UI-level gate keyed by model name, guaranteeing a visible busy state across the click handler.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Ensure the sidecar is up and list installed models on mount.
  useEffect(() => {
    void manager.refresh();
  }, [manager]);

  const installed = new Set(state.models.map((model) => model.name));
  const pullingNames = Object.keys(state.pulls);

  const withPending = useCallback(
    (key: string, action: () => Promise<void>) => async () => {
      setPending((prev) => ({ ...prev, [key]: true }));
      try {
        await action();
      } finally {
        setPending((prev) => ({ ...prev, [key]: false }));
      }
    },
    [],
  );

  const handlePull = useCallback(
    (target: string) => {
      const trimmed = target.trim();
      if (trimmed.length === 0) {
        return;
      }
      setName('');
      void withPending(trimmed, () => manager.pull(trimmed))();
    },
    [manager, withPending],
  );

  return (
    <Form.Section title={t('settings.ollama.title')}>
      {state.kind === 'failed' && state.error && (
        <Form.Row
          label={t('settings.ollama.failed.label')}
          description={t('settings.ollama.failed.message', { error: state.error })}
        >
          <Button onClick={() => void manager.refresh()}>{t('settings.ollama.refresh.label')}</Button>
        </Form.Row>
      )}

      {state.models.map((model) => (
        <Form.Row
          key={model.name}
          label={model.name}
          description={model.size != null ? formatBytes(model.size) : undefined}
        >
          <IconButton
            icon='ph--trash--regular'
            iconOnly
            label={t('settings.ollama.remove.label')}
            disabled={pending[model.name]}
            onClick={() => void withPending(model.name, () => manager.remove(model.name))()}
          />
        </Form.Row>
      ))}

      {pullingNames
        .filter((pullName) => !installed.has(pullName))
        .map((pullName) => (
          <Form.Row
            key={pullName}
            label={pullName}
            description={t('settings.ollama.pulling.message', { percent: percentOf(state.pulls[pullName]) })}
          >
            <Button disabled>{t('settings.ollama.pulling.label')}</Button>
          </Form.Row>
        ))}

      {state.kind === 'ready' && state.models.length === 0 && pullingNames.length === 0 && (
        <Form.Row label={t('settings.ollama.installed.label')} description={t('settings.ollama.empty.message')} />
      )}

      <Form.Row label={t('settings.ollama.pull.label')}>
        <div role='none' className='flex gap-2'>
          <Input.Root>
            <Input.Label srOnly>{t('settings.ollama.pull.label')}</Input.Label>
            <Input.TextInput
              placeholder={t('settings.ollama.pull.placeholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handlePull(name)}
            />
          </Input.Root>
          <Button
            variant='primary'
            disabled={name.trim().length === 0 || pending[name.trim()]}
            onClick={() => handlePull(name)}
          >
            {t('settings.ollama.pull.label')}
          </Button>
        </div>
      </Form.Row>

      <Form.Row label={t('settings.ollama.quick-pick.label')}>
        <div role='none' className='flex flex-wrap gap-2'>
          {QUICK_PICKS.filter((pick) => !installed.has(pick)).map((pick) => (
            <Button
              key={pick}
              disabled={!!pending[pick] || pullingNames.includes(pick)}
              onClick={() => handlePull(pick)}
            >
              {pick}
            </Button>
          ))}
          <IconButton
            icon='ph--arrows-clockwise--regular'
            label={t('settings.ollama.refresh.label')}
            disabled={state.kind === 'loading'}
            onClick={() => void manager.refresh()}
          />
        </div>
      </Form.Row>
    </Form.Section>
  );
};

/** Percent complete for an in-flight pull, or 0 when totals are not yet known. */
const percentOf = (progress: Ollama.ModelsState['pulls'][string] | undefined): number =>
  progress && progress.total && progress.total > 0 ? Math.round(((progress.completed ?? 0) / progress.total) * 100) : 0;

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Human-readable byte size (binary units). */
const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${UNITS[unit]}`;
};
