//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type JSX, useCallback, useMemo, useState } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type Chat as ChatModule, McpServer } from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/compute';
import { Annotation, type Database, Filter, Obj, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, Popover, Select, useTranslation } from '@dxos/react-ui';
import { Listbox, SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { Tabs } from '@dxos/react-ui-tabs';
import { getStyles, mx } from '@dxos/ui-theme';

import { useActiveBlueprints, useBlueprintHandlers, useBlueprints, useContextObjects, useFilteredTypes } from '#hooks';
import { meta } from '#meta';
import { Assistant } from '#types';

const styles = {
  panel: 'w-[calc(100dvw-.5rem)] sm:w-max max-w-document-width',
  toolbar: 'p-0! gap-0! border-t border-separator',
};

export type ChatOptionsProps = {
  chat?: ChatModule.Chat;
  db: Database.Database;
  context: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  presets?: { id: string; label: string }[];
  preset?: string;
  onPresetChange?: (id: string) => void;
};

/**
 * Manages the runtime context for the chat.
 */
export const ChatOptions = ({
  chat,
  db,
  context,
  blueprintRegistry,
  presets,
  preset,
  onPresetChange,
}: ChatOptionsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div role='none' className='flex'>
      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton variant='ghost' icon='ph--plus--regular' iconOnly label={t('context-objects.button')} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side='top' classNames={styles.panel}>
            <Popover.Viewport>
              <ObjectsPanel db={db} context={context} />
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--sliders-horizontal--regular'
            iconOnly
            label={t('context-settings.button')}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side='top' classNames={styles.panel}>
            <Popover.Viewport>
              <Tabs.Root
                classNames='flex'
                orientation='horizontal'
                defaultValue='view'
                defaultActivePart='list'
                tabIndex={-1}
              >
                <Tabs.Viewport classNames={mx('grid grid-rows-[1fr_40px] w-full')}>
                  <Tabs.Panel tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='view'>
                    <ViewPanel chat={chat} />
                  </Tabs.Panel>
                  <Tabs.Panel tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='blueprints'>
                    <BlueprintsPanel blueprintRegistry={blueprintRegistry} db={db} context={context} />
                  </Tabs.Panel>
                  <Tabs.Panel tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='mcp-servers'>
                    <McpServersPanel db={db} />
                  </Tabs.Panel>
                  <Tabs.Panel tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='model'>
                    <ModelsPanel presets={presets} preset={preset} onPresetChange={onPresetChange} />
                  </Tabs.Panel>
                  <Tabs.Tablist classNames={[styles.toolbar]}>
                    <Tabs.IconTab value='view' icon='ph--eye--regular' label={t('chat-view.title')} />
                    <Tabs.IconTab
                      value='blueprints'
                      icon='ph--blueprint--regular'
                      label={t('options.blueprints.title')}
                    />
                    <Tabs.IconTab
                      value='mcp-servers'
                      icon='ph--plugs-connected--regular'
                      label={t('options.mcp.title')}
                    />
                    <Tabs.IconTab value='model' icon='ph--cpu--regular' label={t('options.chat-model.title')} />
                  </Tabs.Tablist>
                </Tabs.Viewport>
              </Tabs.Root>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

const BlueprintsPanel = ({
  blueprintRegistry,
  db,
  context,
}: Pick<ChatOptionsProps, 'blueprintRegistry' | 'db' | 'context'>) => {
  const { t } = useTranslation(meta.id);

  const blueprints = useBlueprints({ blueprintRegistry, db });
  const activeBlueprints = useActiveBlueprints({ context });
  const { onUpdateBlueprint } = useBlueprintHandlers({ db, context, blueprintRegistry });
  const { results, handleSearch } = useSearchListResults({
    items: blueprints,
    extract: (blueprint) => blueprint.name,
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Content classNames='flex flex-col'>
        <SearchList.Viewport>
          {results.map((blueprint) => {
            const isActive = activeBlueprints.has(blueprint.key);
            return (
              <SearchList.Item
                classNames='flex items-center overflow-hidden'
                key={blueprint.key}
                value={blueprint.key}
                label={blueprint.name}
                checked={isActive}
                onSelect={() => onUpdateBlueprint?.(blueprint.key, !isActive)}
              />
            );
          })}
        </SearchList.Viewport>
        <SearchList.Input placeholder={t('search.placeholder')} classNames='border-t border-separator' autoFocus />
      </SearchList.Content>
    </SearchList.Root>
  );
};

const ViewPanel = ({ chat }: Pick<ChatOptionsProps, 'chat'>) => {
  const { t } = useTranslation(meta.id);
  const [view, setView] = useObject(chat, 'view');
  const value = (view as Assistant.ChatView | undefined) ?? 'normal';

  return (
    <Listbox.Root value={value} onValueChange={setView} autoFocus>
      {Assistant.ChatViews.map((view) => (
        <Listbox.Option key={view} value={view}>
          <Listbox.OptionLabel>{t(`chat-view.${view}.label`, { defaultValue: view })}</Listbox.OptionLabel>
          <Listbox.OptionIndicator />
        </Listbox.Option>
      ))}
    </Listbox.Root>
  );
};

const ModelsPanel = ({
  presets,
  preset,
  onPresetChange,
}: Pick<ChatOptionsProps, 'presets' | 'preset' | 'onPresetChange'>) => {
  return (
    <Listbox.Root value={preset} onValueChange={onPresetChange} autoFocus>
      {presets?.map(({ id, label }) => {
        return (
          <Listbox.Option key={id} value={id}>
            <Listbox.OptionLabel>{label}</Listbox.OptionLabel>
            <Listbox.OptionIndicator />
          </Listbox.Option>
        );
      })}
    </Listbox.Root>
  );
};

type McpServersPanelProps = {
  db: Database.Database;
};

const McpServersPanel = ({ db }: McpServersPanelProps) => {
  const { t } = useTranslation(meta.id);
  const servers = useQuery(db, Filter.type(McpServer.McpServer));
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(
    (name: string, url: string, protocol: 'sse' | 'http', apiKey?: string) => {
      db.add(Obj.make(McpServer.McpServer, { name, url, protocol, apiKey, enabled: true }));
      setAdding(false);
    },
    [db],
  );

  const handleToggle = useCallback((server: McpServer.McpServer, enabled: boolean) => {
    Obj.change(server, (server) => {
      server.enabled = enabled;
    });
  }, []);

  const handleRemove = useCallback(
    (server: McpServer.McpServer) => {
      db.remove(server);
    },
    [db],
  );

  return (
    <div className='p-form-chrome'>
      {servers.map((server) => (
        <div key={server.id} className='flex items-center gap-2 px-form-chrome'>
          <Input.Root>
            <Input.Label srOnly>{server.name}</Input.Label>
            <Input.Switch
              checked={server.enabled !== false}
              onCheckedChange={(checked) => handleToggle(server, !!checked)}
            />
          </Input.Root>
          <span className='flex-1 truncate text-sm'>{server.name}</span>
          <span className='truncate text-xs text-description'>{server.url}</span>
          <IconButton
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('mcp-server-remove.label')}
            onClick={() => handleRemove(server)}
          />
        </div>
      ))}
      {adding ? (
        <McpServerForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <div role='none'>
          <IconButton
            variant='ghost'
            icon='ph--plus--regular'
            label={t('mcp-server-add.label')}
            onClick={() => setAdding(true)}
          />
        </div>
      )}
    </div>
  );
};

type McpServerFormProps = {
  onSubmit: (name: string, url: string, protocol: 'sse' | 'http', apiKey?: string) => void;
  onCancel: () => void;
};

const McpServerForm = ({ onSubmit, onCancel }: McpServerFormProps) => {
  const { t } = useTranslation(meta.id);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [protocol, setProtocol] = useState<'sse' | 'http'>('sse');
  const [apiKey, setApiKey] = useState('');

  const canSubmit = name.trim().length > 0 && url.trim().length > 0;
  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit(name.trim(), url.trim(), protocol, apiKey.trim() || undefined);
    }
  }, [canSubmit, name, url, protocol, apiKey, onSubmit]);

  return (
    <div className='space-y-2 px-form-chrome'>
      <Input.Root>
        <Input.Label srOnly>{t('mcp-server-name.label')}</Input.Label>
        <Input.TextInput
          placeholder={t('mcp-server-name.placeholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </Input.Root>
      <Input.Root>
        <Input.Label srOnly>{t('mcp-server-url.label')}</Input.Label>
        <Input.TextInput
          placeholder={t('mcp-server-url.placeholder')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </Input.Root>
      <Select.Root value={protocol} onValueChange={(value) => setProtocol(value as 'sse' | 'http')}>
        <Select.TriggerButton placeholder={t('mcp-server-protocol.label')} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              <Select.Option value='sse'>SSE</Select.Option>
              <Select.Option value='http'>HTTP</Select.Option>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <Input.Root>
        <Input.Label srOnly>{t('mcp-server-api-key.label')}</Input.Label>
        <Input.TextInput
          type='password'
          placeholder={t('mcp-server-api-key.placeholder')}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </Input.Root>
      <div role='none' className='flex gap-2'>
        <IconButton
          variant='ghost'
          icon='ph--check--regular'
          iconOnly
          label={t('save.button')}
          onClick={handleSubmit}
          disabled={!canSubmit}
        />
        <IconButton variant='ghost' icon='ph--x--regular' iconOnly label={t('cancel.button')} onClick={onCancel} />
      </div>
    </div>
  );
};

const ANY = '__any__';

/** @private */
export const ObjectsPanel = ({ db, context }: Pick<ChatOptionsProps, 'db' | 'context'>): JSX.Element => {
  const { t } = useTranslation(meta.id);

  // Item types sorted by label.
  const types = useFilteredTypes(db);
  const typenames = useMemo(() => {
    const typenames = types.map((type) => {
      const typename = Type.getTypename(type);
      return {
        typename,
        label: t('typename.label', { ns: typename, defaultValue: typename }),
      };
    });

    typenames.sort((a, b) => a.label.localeCompare(b.label));
    return typenames;
  }, [types]);

  // Current type and filter.
  const [typename, setTypename] = useState<string>(ANY);
  const anyFilter = useMemo(
    () => Filter.or(...typenames.map(({ typename }) => Filter.typename(typename))),
    [typenames],
  );

  // Context objects.
  const objects = useQuery(db, typename === ANY ? anyFilter : Filter.typename(typename));
  const { objects: contextObjects, onUpdateObject } = useContextObjects({ db, context });
  const { results, handleSearch } = useSearchListResults({
    items: objects,
    extract: (object) => Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id,
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Content classNames='p-form-chrome [&:has([cmdk-list-sizer]:empty)]:py-0'>
        <SearchList.Viewport>
          {results.length ? (
            results.map((object) => {
              const isActive = contextObjects.findIndex((obj) => obj.id === object.id) !== -1;
              const { icon, hue } = Option.fromNullable(Obj.getSchema(object)).pipe(
                Option.flatMap(Annotation.IconAnnotation.get),
                Option.getOrElse(() => ({
                  icon: 'ph--cube--regular',
                  hue: undefined as string | undefined,
                })),
              );
              const styles = hue ? getStyles(hue) : undefined;
              return (
                <SearchList.Item
                  classNames='flex items-center overflow-hidden'
                  key={object.id}
                  value={object.id}
                  icon={icon}
                  iconClassNames={styles?.surfaceText}
                  label={Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id}
                  checked={isActive}
                  onSelect={() => onUpdateObject?.(Obj.getDXN(object), !isActive)}
                />
              );
            })
          ) : (
            <SearchList.Item value='__empty__' label={t('no-results.message')} />
          )}
        </SearchList.Viewport>
      </SearchList.Content>

      <div role='none' className={mx('flex flex-col', styles.toolbar)}>
        <Select.Root value={typename === ANY ? undefined : typename} onValueChange={setTypename}>
          <Select.TriggerButton placeholder={t('type-filter.placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                <Select.Option value={ANY}>{t('any-type-filter.label')}</Select.Option>
                {typenames.map(({ typename, label }) => (
                  <Select.Option key={typename} value={typename}>
                    {label}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <SearchList.Input placeholder={t('search.placeholder')} autoFocus />
      </div>
    </SearchList.Root>
  );
};
