//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useState } from 'react';

import { DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Combobox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { AssistantCapabilities, type Ollama } from '#types';

/** Prefix shared by all Ollama model ids; stripped to recover the raw `ollama pull` name. */
const OLLAMA_MODEL_PREFIX = 'ai.ollama.model.';

/** Quick-pick model names sourced from the curated defaults. */
const QUICK_PICKS = DEFAULT_OLLAMA_MODELS.map((id) => id.slice(OLLAMA_MODEL_PREFIX.length));

/** Poll interval for the loaded-into-memory set while the settings panel is open. */
const LOADED_POLL_INTERVAL = 3_000;

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
  // Explicit subscription: the list and badges must re-render as pulls/installs/loads land.
  const state = useAtomValue(manager.state);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // UI-level gate keyed by model name, guaranteeing a visible busy state across the click handler.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Ensure the sidecar is up and list installed models on mount.
  useEffect(() => {
    void manager.refresh();
  }, [manager]);

  // Poll the loaded-into-memory set so the panel reflects which model is resident in real time.
  useEffect(() => {
    const interval = setInterval(() => void manager.refreshLoaded(), LOADED_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [manager]);

  const installed = new Set(state.models.map((model) => model.name));
  const loaded = new Map(state.loaded.map((model) => [model.name, model]));
  const pulling = Object.keys(state.pulls).filter((name) => !installed.has(name));

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
      setQuery('');
      setOpen(false);
      void withPending(trimmed, () => manager.pull(trimmed))();
    },
    [manager, withPending],
  );

  // Caller-driven filtering: curated picks not yet installed, matching the typed query.
  const filter = query.trim();
  const suggestions = QUICK_PICKS.filter((pick) => !installed.has(pick) && (filter === '' || pick.includes(filter)));
  const offerCustom = filter.length > 0 && !installed.has(filter) && !suggestions.includes(filter);
  const empty = state.models.length === 0 && pulling.length === 0;

  return (
    <Form.Section title={t('settings.ollama.title')}>
      {state.kind === 'failed' && state.error && (
        <Form.Row
          label={t('settings.ollama.failed.label')}
          description={t('settings.ollama.failed.message', { error: state.error })}
        />
      )}

      <Form.Row label={t('settings.ollama.installed.label')}>
        {empty ? (
          <p className='text-sm text-description'>{t('settings.ollama.empty.message')}</p>
        ) : (
          <div role='list' className='flex flex-col gap-1'>
            {state.models.map((model) => {
              const running = loaded.get(model.name);
              return (
                <div role='listitem' key={model.name} className='flex items-center gap-2'>
                  <span className='flex-1 truncate'>{model.name}</span>
                  {running && (
                    <span className='text-xs text-success-text'>
                      {running.sizeVram
                        ? t('settings.ollama.loaded.vram', { size: formatBytes(running.sizeVram) })
                        : t('settings.ollama.loaded.label')}
                    </span>
                  )}
                  {model.size != null && <span className='text-xs text-description'>{formatBytes(model.size)}</span>}
                  <IconButton
                    icon={running ? 'ph--eject--regular' : 'ph--play--regular'}
                    iconOnly
                    label={running ? t('settings.ollama.unload.label') : t('settings.ollama.load.label')}
                    disabled={pending[model.name]}
                    onClick={() =>
                      void withPending(model.name, () =>
                        running ? manager.unload(model.name) : manager.load(model.name),
                      )()
                    }
                  />
                  <IconButton
                    icon='ph--trash--regular'
                    iconOnly
                    label={t('settings.ollama.remove.label')}
                    disabled={pending[model.name]}
                    onClick={() => void withPending(model.name, () => manager.remove(model.name))()}
                  />
                </div>
              );
            })}
            {pulling.map((name) => {
              const progress = state.pulls[name];
              const status = progress?.total
                ? t('settings.ollama.pulling.message', { percent: percentOf(progress) })
                : (progress?.status ?? t('settings.ollama.pulling.label'));
              return (
                <div role='listitem' key={name} className='flex items-center gap-2'>
                  <span className='flex-1 truncate text-description'>{name}</span>
                  <span className='text-xs text-description'>{status}</span>
                  <IconButton
                    icon='ph--x--regular'
                    iconOnly
                    label={t('settings.ollama.cancel.label')}
                    onClick={() => manager.cancel(name)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Form.Row>

      <Form.Row label={t('settings.ollama.pull.label')}>
        {/* Root value is held empty so the trigger always shows the placeholder; the live text is
            the separate `query` driving the input and suggestion filter. */}
        <Combobox.Root
          open={open}
          onOpenChange={setOpen}
          value=''
          onValueChange={() => {}}
          placeholder={t('settings.ollama.pull.placeholder')}
        >
          <Combobox.Trigger classNames='is-full' />
          <Combobox.Portal>
            <Combobox.Content>
              <Combobox.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t('settings.ollama.pull.placeholder')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filter.length > 0) {
                    handlePull(filter);
                  }
                }}
              />
              <Combobox.List>
                {offerCustom && (
                  <Combobox.Item
                    value={filter}
                    label={t('settings.ollama.pull-custom.label', { name: filter })}
                    icon='ph--download-simple--regular'
                    onSelect={() => handlePull(filter)}
                  />
                )}
                {suggestions.map((pick) => (
                  <Combobox.Item key={pick} value={pick} label={pick} onSelect={() => handlePull(pick)} />
                ))}
              </Combobox.List>
              <Combobox.Arrow />
            </Combobox.Content>
          </Combobox.Portal>
        </Combobox.Root>
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
