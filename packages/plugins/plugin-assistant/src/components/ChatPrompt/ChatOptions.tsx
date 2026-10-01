//
// Copyright 2025 DXOS.org
//

import React, { type JSX, useCallback, useMemo, useState } from 'react';

import { Provider } from '@dxos/ai';
import { useAtomCapabilityState, useOptionalCapability } from '@dxos/app-framework/ui';
import { type AiContext } from '@dxos/assistant';
import type * as ChatModule from '@dxos/assistant/Chat';
import * as McpServer from '@dxos/compute/McpServer';
import { type Database, Filter, Obj, Ref, type Registry, Type, URI } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { AccessToken } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Flex, useTranslation } from '@dxos/react-ui';
import { type ChatView } from '@dxos/react-ui-assistant';
import { Listbox } from '@dxos/react-ui-list/next';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { Next } from '@dxos/react-ui/next';
import { getStyles, mx } from '@dxos/ui-theme';

import {
  getSkillId,
  useActiveSkills,
  useContextObjects,
  useFilteredTypes,
  useMcpServerSignIn,
  useMcpServerStatus,
  useSkillHandlers,
  useSkills,
} from '#hooks';
import { meta } from '#meta';
import { Assistant, AssistantCapabilities, AssistantPreset } from '#types';

import { resolveProvider } from '../../processor/index.ts';

const styles = {
  panel: 'w-[calc(100dvw-.5rem)] sm:w-max max-w-document-width',
  toolbar: 'p-0! gap-0! border-t border-separator',
};

export type ChatOptionsProps = AssistantPreset.ChatPresetProps & {
  db: Database.Database;
  chat?: ChatModule.Chat;
  context?: AiContext.Binder;
  registry?: Registry.Registry;
};

/**
 * Manages the runtime context for the chat.
 */
export const ChatOptions = ({ db, chat, context, registry, presets, preset, onPresetChange }: ChatOptionsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <div className='flex'>
      <Next.Popover.Root positioning={{ placement: 'top' }}>
        <Next.Popover.Trigger asChild>
          <Next.Button
            variant='ghost'
            icon='ph--plus--regular'
            iconOnly
            label={t('context-objects.button')}
            disabled={!context}
          />
        </Next.Popover.Trigger>
        <Next.Popover.Content classNames={styles.panel}>
          <Next.Popover.Body>{context && <ObjectsPanel db={db} context={context} />}</Next.Popover.Body>
        </Next.Popover.Content>
      </Next.Popover.Root>

      <Next.Popover.Root positioning={{ placement: 'top' }}>
        <Next.Popover.Trigger asChild>
          <Next.Button
            variant='ghost'
            icon='ph--sliders-horizontal--regular'
            iconOnly
            label={t('context-settings.button')}
            data-testid='assistant.options'
            disabled={!context}
          />
        </Next.Popover.Trigger>
        <Next.Popover.Content classNames={styles.panel}>
          <Next.Popover.Body>
            <Next.Tabs.Root asChild orientation='horizontal' defaultValue='view' defaultActivePart='list' tabIndex={-1}>
              <Next.Tabs.Viewport classNames={mx('grid grid-rows-[1fr_40px] w-full')}>
                <Next.Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='view'>
                  <ViewPanel chat={chat} />
                </Next.Tabs.Content>
                <Next.Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='skills'>
                  {context && <SkillsPanel registry={registry} db={db} context={context} />}
                </Next.Tabs.Content>
                <Next.Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='mcp-servers'>
                  <McpServersPanel db={db} />
                </Next.Tabs.Content>
                <Next.Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='model'>
                  <ModelsPanel presets={presets} preset={preset} onPresetChange={onPresetChange} />
                </Next.Tabs.Content>
                <Next.Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='environment'>
                  <EnvironmentPanel chat={chat} />
                </Next.Tabs.Content>
                <Next.Tabs.List classNames={[styles.toolbar]}>
                  <Next.Tabs.Trigger value='view' icon='ph--eye--regular' label={t('chat-view.title')} />
                  <Next.Tabs.Trigger value='skills' icon='ph--blueprint--regular' label={t('options.skills.title')} />
                  <Next.Tabs.Trigger
                    value='mcp-servers'
                    icon='ph--plugs-connected--regular'
                    label={t('options.mcp.title')}
                  />
                  <Next.Tabs.Trigger
                    value='model'
                    icon='ph--cpu--regular'
                    label={t('options.chat-model.title')}
                    data-testid='assistant.options.model'
                  />
                  <Next.Tabs.Trigger
                    value='environment'
                    icon='ph--hard-drives--regular'
                    label={t('options.environment.title')}
                  />
                </Next.Tabs.List>
              </Next.Tabs.Viewport>
            </Next.Tabs.Root>
          </Next.Popover.Body>
        </Next.Popover.Content>
      </Next.Popover.Root>
    </div>
  );
};

const SkillsPanel = ({ registry, db, context }: Pick<ChatOptionsProps, 'registry' | 'db' | 'context'>) => {
  const { t } = useTranslation(meta.profile.key);

  const skills = useSkills({ registry, db });
  const activeSkills = useActiveSkills({ context });
  const { onUpdateSkill } = useSkillHandlers({ context });
  const { results, handleSearch } = useSearchListResults({
    items: skills,
    extract: (skill) => skill.name,
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <SearchList.Content classNames='flex flex-col'>
        {/* Flush to the popover edge, like the sibling `Listbox` panels: this is a menu, not a
            centered search surface, so the scroll strip is not reserved on both sides. */}
        <SearchList.Viewport padding={false}>
          {results.map((skill) => {
            const skillId = getSkillId(skill);
            const isActive = activeSkills.has(skillId);
            return (
              <SearchList.Item
                classNames='flex items-center overflow-hidden'
                key={skillId}
                value={skillId}
                label={skill.name}
                checked={isActive}
                onSelect={() => onUpdateSkill?.(skill, !isActive)}
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
  const { t } = useTranslation(meta.profile.key);
  const [view, setView] = useObject(chat, 'viewType');
  const value = (view as ChatView | undefined) ?? 'normal';

  return (
    <Listbox.Root
      value={value}
      onValueChange={setView}
      autoFocus
      items={Assistant.ChatViews.map((view) => ({
        value: view,
        label: t(`chat-view.${view}.label`, { defaultValue: view }),
      }))}
    >
      <Listbox.Content aria-label={t('chat-view.title')}>
        {Assistant.ChatViews.map((view) => (
          <Listbox.Item key={view} id={view} classNames='px-2 py-1 dx-focus-ring rounded-xs'>
            <Listbox.ItemText>{t(`chat-view.${view}.label`, { defaultValue: view })}</Listbox.ItemText>
            <Listbox.ItemIndicator />
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

/**
 * Where this conversation's agent runs. A per-chat property rather than a setting, mirroring a
 * trigger's own `remote` flag: `edge` keeps the conversation running with the client closed.
 * `AgentService` reads the location at spawn, so switching tears the running process down and
 * respawns it on the other host.
 */
const EnvironmentPanel = ({ chat }: Pick<ChatOptionsProps, 'chat'>) => {
  const { t } = useTranslation(meta.profile.key);
  const [remote, setRemote] = useObject(chat, 'remote');
  const client = useOptionalCapability(ClientCapabilities.Client);
  // Offered only where an edge service is configured, which is the same condition that decides
  // whether `RemoteProcessManager` is the real manager or `layerNoop`: against the noop a spawn has
  // no `list` or `spawn`, so choosing `remote` would persist a flag the next prompt cannot honour.
  const environments = client?.config.values.runtime?.services?.edge?.url
    ? CHAT_ENVIRONMENTS
    : CHAT_ENVIRONMENTS.filter((environment) => environment !== 'remote');
  const value: ChatEnvironment = remote ? 'remote' : 'local';
  const handleChange = useCallback((value: string) => setRemote(value === 'remote'), [setRemote]);

  return (
    <Listbox.Root
      value={value}
      onValueChange={handleChange}
      autoFocus
      items={environments.map((environment) => ({
        value: environment,
        label: t(`chat-environment.${environment}.label`),
      }))}
    >
      <Listbox.Content aria-label={t('options.environment.title')}>
        {environments.map((environment) => (
          <Listbox.Item key={environment} id={environment} classNames='px-2 py-1 dx-focus-ring rounded-xs'>
            <Listbox.ItemText>{t(`chat-environment.${environment}.label`)}</Listbox.ItemText>
            <Listbox.ItemIndicator />
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type ChatEnvironment = (typeof CHAT_ENVIRONMENTS)[number];

const CHAT_ENVIRONMENTS = ['local', 'remote'] as const;

const ModelsPanel = ({
  presets,
  preset,
  onPresetChange,
}: Pick<ChatOptionsProps, 'presets' | 'preset' | 'onPresetChange'>) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div className='dx-expand flex flex-col'>
      <Listbox.Root
        value={preset}
        onValueChange={onPresetChange}
        autoFocus
        items={presets.map(({ id, label }) => ({ value: id, label: label }))}
      >
        <Listbox.Content aria-label={t('options.chat-model.title')} data-testid='assistant.models'>
          {presets?.map(({ id, label }) => (
            <Listbox.Item
              key={id}
              id={id}
              classNames='px-2 py-1 dx-focus-ring rounded-xs'
              data-testid={`assistant.models.${id}`}
            >
              <Listbox.ItemText>{label}</Listbox.ItemText>
              <Listbox.ItemIndicator />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Next.Toolbar.Root>
        <OnlineSwitch />
      </Next.Toolbar.Root>
    </div>
  );
};

/**
 * Online/offline as the control it looks like. It used to sit on the prompt row as a disabled
 * switch, which read as broken: the provider is one setting, so it belongs beside the model list
 * that setting chooses from.
 *
 * Off selects whichever local provider this build has — the bundled sidecar on desktop, an external
 * Ollama elsewhere — which is the same reconciliation `usePresets` does when it reads the setting.
 */
const OnlineSwitch = () => {
  const { t } = useTranslation(meta.profile.key);
  const [settings, setSettings] = useAtomCapabilityState(AssistantCapabilities.Settings);
  const hasBuiltIn = useOptionalCapability(AssistantCapabilities.OllamaManager) !== undefined;
  const online = resolveProvider(settings.modelProvider, hasBuiltIn) === Provider.edge.id;

  const handleChange = useCallback(
    (checked: boolean) => {
      const provider = checked ? Provider.edge.id : hasBuiltIn ? Provider.builtIn.id : Provider.ollama.id;
      setSettings((current) => ({ ...current, modelProvider: provider }));
    },
    [setSettings, hasBuiltIn],
  );

  return (
    <div className='px-1 flex items-center gap-2'>
      <Next.Switch
        checked={online}
        onCheckedChange={handleChange}
        data-testid='assistant.online'
        label={t('online-switch.label')}
      />
    </div>
  );
};

type McpServersPanelProps = {
  db: Database.Database;
};

type McpServerDraft = {
  name: string;
  url: string;
  protocol: McpServer.Spec['protocol'];
  apiKey?: string;
};

const McpServersPanel = ({ db }: McpServersPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const servers = useQuery(db, Filter.type(McpServer.McpServer));
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(
    ({ name, url, protocol, apiKey }: McpServerDraft) => {
      // The key goes in an `AccessToken` rather than on the server, so it resolves through the
      // credentials service like every other secret in the space.
      const accessToken = apiKey
        ? db.add(AccessToken.make({ source: new URL(url).hostname, account: name, token: apiKey }))
        : undefined;
      db.add(
        Obj.make(McpServer.McpServer, {
          name,
          url,
          protocol,
          enabled: true,
          ...(accessToken && { accessToken: Ref.make(accessToken) }),
        }),
      );
      setAdding(false);
    },
    [db],
  );

  const handleRemove = useCallback(
    (server: McpServer.McpServer) => {
      const accessToken = server.accessToken?.peek();
      db.remove(server);
      if (accessToken) {
        db.remove(accessToken);
      }
    },
    [db],
  );

  return (
    <Flex column gap='xs' classNames='p-form-chrome' data-testid='assistant.mcp-servers'>
      <Listbox.Root>
        <Listbox.Content aria-label={t('options.mcp.title')} classNames='gap-1'>
          {servers.map((server) => (
            <McpServerRow key={server.id} server={server} onRemove={handleRemove} />
          ))}
        </Listbox.Content>
      </Listbox.Root>
      {adding ? (
        <McpServerForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <Next.Button
          variant='ghost'
          icon='ph--plus--regular'
          label={t('mcp-server-add.label')}
          onClick={() => setAdding(true)}
          data-testid='assistant.mcp-server.add'
        />
      )}
    </Flex>
  );
};

type McpServerRowProps = {
  server: McpServer.McpServer;
  onRemove: (server: McpServer.McpServer) => void;
};

/**
 * `useQuery` returns live objects but only re-renders on result-identity changes,
 * so we must subscribe to the per-server `enabled`/`oauth`/`name`/`url` fields via `useObject`
 * to keep the row in sync with mutations made through the returned setters (or elsewhere).
 */
const McpServerRow = ({ server, onRemove }: McpServerRowProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [enabled, setEnabled] = useObject(server, 'enabled');
  // Subscribed so the status re-checks once a sign-in stores tokens.
  useObject(server, 'oauth');
  const [name] = useObject(server, 'name');
  const [url] = useObject(server, 'url');
  const [revision, setRevision] = useState(0);
  const status = useMcpServerStatus(server, { enabled: enabled !== false, revision });
  const { signIn, pending, error } = useMcpServerSignIn(server);
  const handleSignIn = useCallback(() => {
    void signIn().then(() => setRevision((revision) => revision + 1));
  }, [signIn]);

  const statusLabel =
    status.state === 'connected'
      ? t('mcp-server-status.connected', { count: status.tools.length })
      : status.state === 'error'
        ? status.message
        : t(`mcp-server-status.${status.state}`);

  return (
    <Listbox.Item id={server.id} classNames='flex-col items-stretch px-form-chrome' data-testid='assistant.mcp-server'>
      <Flex align='center' gap='sm'>
        <Next.Field.Root>
          <Next.Field.Label srOnly>{name}</Next.Field.Label>
          <Next.Switch checked={enabled !== false} onCheckedChange={(checked) => setEnabled(!!checked)} />
        </Next.Field.Root>
        <Flex column grow classNames='min-w-0'>
          <span className='truncate text-sm'>{name}</span>
          <span className='truncate text-xs text-description'>{url}</span>
        </Flex>
        {status.state === 'unauthorized' && (
          <Next.Button
            variant='primary'
            icon='ph--sign-in--regular'
            label={t('mcp-server-sign-in.label')}
            disabled={pending}
            onClick={handleSignIn}
            data-testid='assistant.mcp-server.sign-in'
          />
        )}
        {(status.state === 'error' || status.state === 'unauthorized') && (
          <Next.Button
            variant='ghost'
            icon='ph--arrow-clockwise--regular'
            iconOnly
            label={t('mcp-server-retry.label')}
            onClick={() => setRevision((revision) => revision + 1)}
          />
        )}
        <Next.Button
          variant='ghost'
          icon='ph--x--regular'
          iconOnly
          label={t('mcp-server-remove.label')}
          onClick={() => onRemove(server)}
        />
      </Flex>
      <span
        className={mx(
          'text-xs truncate',
          status.state === 'connected' && 'text-success-text',
          (status.state === 'error' || status.state === 'unauthorized' || error) && 'text-error-text',
        )}
        title={error ?? statusLabel}
        data-testid='assistant.mcp-server.status'
        data-state={status.state}
      >
        {error ?? statusLabel}
      </span>
    </Listbox.Item>
  );
};

type McpServerFormProps = {
  onSubmit: (draft: McpServerDraft) => void;
  onCancel: () => void;
};

const McpServerForm = ({ onSubmit, onCancel }: McpServerFormProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  // Streamable HTTP is the current transport; the client falls back to SSE when a server answers 405.
  const [protocol, setProtocol] = useState<McpServer.Spec['protocol']>('http');
  const [apiKey, setApiKey] = useState('');

  const validUrl = URL.canParse(url.trim());
  const canSubmit = name.trim().length > 0 && validUrl;
  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit({ name: name.trim(), url: url.trim(), protocol, apiKey: apiKey.trim() || undefined });
    }
  }, [canSubmit, name, url, protocol, apiKey, onSubmit]);

  return (
    <form
      className='space-y-2 px-form-chrome'
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <Next.Field.Root>
        <Next.Field.Label srOnly>{t('mcp-server-name.label')}</Next.Field.Label>
        <Next.Input
          placeholder={t('mcp-server-name.placeholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          data-testid='assistant.mcp-server.name'
        />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Label srOnly>{t('mcp-server-url.label')}</Next.Field.Label>
        <Next.Input
          type='url'
          placeholder={t('mcp-server-url.placeholder')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          data-testid='assistant.mcp-server.url'
        />
      </Next.Field.Root>
      <Next.Select.Root
        value={[protocol]}
        onValueChange={({ value: [value] }) => setProtocol(value === 'sse' ? 'sse' : 'http')}
        items={[
          { value: 'http', label: 'HTTP' },
          { value: 'sse', label: 'SSE' },
        ]}
      >
        <Next.Select.Trigger placeholder={t('mcp-server-protocol.label')} />
        <Next.Select.Content>
          <Next.Select.Item item={{ value: 'http', label: 'HTTP' }} />
          <Next.Select.Item item={{ value: 'sse', label: 'SSE' }} />
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Field.Root>
        <Next.Field.Label srOnly>{t('mcp-server-api-key.label')}</Next.Field.Label>
        <Next.PasswordInput
          autoComplete='off'
          placeholder={t('mcp-server-api-key.placeholder')}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          data-testid='assistant.mcp-server.api-key'
        />
      </Next.Field.Root>
      <div className='flex gap-2'>
        <Next.Button
          type='submit'
          variant='ghost'
          icon='ph--check--regular'
          iconOnly
          label={t('save.button')}
          disabled={!canSubmit}
          data-testid='assistant.mcp-server.save'
        />
        <Next.Button
          type='button'
          variant='ghost'
          icon='ph--x--regular'
          iconOnly
          label={t('cancel.button')}
          onClick={onCancel}
        />
      </div>
    </form>
  );
};

const ANY = '__any__' as const;

/** @private */
export const ObjectsPanel = ({ db, context }: Pick<ChatOptionsProps, 'db' | 'context'>): JSX.Element => {
  const { t } = useTranslation(meta.profile.key);

  // Item types sorted by label.
  const types = useFilteredTypes(db);
  const typeOptions = useMemo(() => {
    const options = types.map((type) => {
      const typename = Type.getTypename(type);
      return {
        uri: Type.getURI(type),
        label: t('typename.label', { ns: typename, defaultValue: typename }),
      };
    });

    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }, [types, t]);

  // Current type URI and filter.
  const [selectedUri, setSelectedUri] = useState<URI.URI | typeof ANY>(ANY);
  const anyFilter = useMemo(() => Filter.or(...typeOptions.map(({ uri }) => Filter.type(uri))), [typeOptions]);

  // Context objects.
  const objects = useQuery(db, selectedUri === ANY ? anyFilter : Filter.type(selectedUri));
  const { objects: contextObjects, onUpdateObject } = useContextObjects({ db, context });
  const { results, handleSearch } = useSearchListResults({
    items: objects,
    extract: (object) => Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id,
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      {/* No chrome padding: the rows align with the toolbar below, which is a sibling of
          `Content` and so sits flush against the panel edge. */}
      <SearchList.Content>
        <SearchList.Viewport padding={false}>
          {results.length ? (
            results.map((object) => {
              const isActive = contextObjects.findIndex((obj) => obj.id === object.id) !== -1;
              const { icon, hue } = Obj.getIcon(object) ?? { icon: 'ph--cube--regular', hue: undefined };
              const styles = hue ? getStyles(hue) : undefined;
              return (
                <SearchList.Item
                  classNames='flex items-center overflow-hidden'
                  key={object.id}
                  value={object.id}
                  icon={icon}
                  iconClassNames={styles?.text}
                  label={Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id}
                  checked={isActive}
                  onSelect={() => onUpdateObject?.(Obj.getURI(object), !isActive)}
                />
              );
            })
          ) : (
            <SearchList.Item value='__empty__' label={t('no-results.message')} />
          )}
        </SearchList.Viewport>
      </SearchList.Content>

      <div className={mx('flex flex-col', styles.toolbar)}>
        <Next.Select.Root
          value={[selectedUri === ANY ? undefined : selectedUri]}
          onValueChange={({ value: [val] }) => setSelectedUri(val as URI.URI | typeof ANY)}
        >
          <Next.Select.Trigger placeholder={t('type-filter.placeholder')} />
          <Next.Select.Content>
            <Next.Select.Item item={{ value: ANY, label: t('any-type-filter.label') }} />
            {typeOptions.map(({ uri, label }) => (
              <Next.Select.Item key={uri} item={{ value: uri, label: label }} />
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
        <SearchList.Input placeholder={t('search.placeholder')} autoFocus />
      </div>
    </SearchList.Root>
  );
};
