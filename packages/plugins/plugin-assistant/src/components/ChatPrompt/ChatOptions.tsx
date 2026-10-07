//
// Copyright 2025 DXOS.org
//

import React, { type JSX, useCallback, useMemo, useState } from 'react';

import { Provider } from '@dxos/ai';
import * as Hooks from '@dxos/app-framework/Hooks';
import { type AiContext } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import * as McpServer from '@dxos/compute/McpServer';
import { type Database, Filter, Obj, Ref, type Registry, Type, URI } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { AccessToken } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type ChatView } from '@dxos/react-ui-assistant';
import { Listbox } from '@dxos/react-ui-list';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import * as Select from '@dxos/react-ui/Select';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Toolbar from '@dxos/react-ui/Toolbar';
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
};

export type ChatOptionsProps = AssistantPreset.ChatPresetProps & {
  db: Database.Database;
  chat?: Chat.Chat;
  context?: AiContext.Binder;
  registry?: Registry.Registry;
};

/**
 * Manages the runtime context for the chat.
 */
export const ChatOptions = ({ db, chat, context, registry, presets, preset, onPresetChange }: ChatOptionsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  return (
    <Layout.Flex>
      <Popover.Root positioning={{ placement: 'top' }}>
        <Popover.Trigger asChild>
          <Button.Root
            variant='ghost'
            icon='ph--plus--regular'
            iconOnly
            label={t('context-objects.button')}
            disabled={!context}
          />
        </Popover.Trigger>
        <Popover.Content classNames={styles.panel}>
          {/* No Body: the list scrolls itself above its filter controls, in the popover's column. */}
          {context && <ObjectsPanel db={db} context={context} />}
        </Popover.Content>
      </Popover.Root>

      <Popover.Root positioning={{ placement: 'top' }}>
        <Popover.Trigger asChild>
          <Button.Root
            variant='ghost'
            icon='ph--sliders-horizontal--regular'
            iconOnly
            label={t('context-settings.button')}
            data-testid='assistant.options'
            disabled={!context}
          />
        </Popover.Trigger>
        <Popover.Content classNames={styles.panel}>
          {/* No Body: each tab's list and the tab bar share the popover's own padding. */}
          <Tabs.Root orientation='horizontal' defaultValue='view' classNames='grid grid-rows-[1fr_40px] w-full'>
            <Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='view'>
              <ViewPanel chat={chat} />
            </Tabs.Content>
            <Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='skills'>
              {context && <SkillsPanel registry={registry} db={db} context={context} />}
            </Tabs.Content>
            <Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='mcp-servers'>
              <McpServersPanel db={db} />
            </Tabs.Content>
            <Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='model'>
              <ModelsPanel presets={presets} preset={preset} onPresetChange={onPresetChange} />
            </Tabs.Content>
            <Tabs.Content tabIndex={-1} classNames='dx-focus-ring-inset overflow-hidden' value='environment'>
              <EnvironmentPanel chat={chat} />
            </Tabs.Content>
            <Tabs.List classNames='p-1 gap-1 border-t border-separator'>
              <Tabs.Trigger value='view' icon='ph--eye--regular' label={t('chat-view.title')} />
              <Tabs.Trigger value='skills' icon='ph--student--regular' label={t('options.skills.title')} />
              <Tabs.Trigger value='mcp-servers' icon='ph--plugs-connected--regular' label={t('options.mcp.title')} />
              <Tabs.Trigger
                value='model'
                icon='ph--cpu--regular'
                label={t('options.chat-model.title')}
                data-testid='assistant.options.model'
              />
              <Tabs.Trigger
                value='environment'
                icon='ph--hard-drives--regular'
                label={t('options.environment.title')}
              />
            </Tabs.List>
          </Tabs.Root>
        </Popover.Content>
      </Popover.Root>
    </Layout.Flex>
  );
};

const SkillsPanel = ({ registry, db, context }: Pick<ChatOptionsProps, 'registry' | 'db' | 'context'>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

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
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search.placeholder')} classNames='border-t border-separator' autoFocus />
        </Toolbar.Root>
      </SearchList.Content>
    </SearchList.Root>
  );
};

const ViewPanel = ({ chat }: Pick<ChatOptionsProps, 'chat'>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
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
      {/* No gutter: the popover's padding is the inset, shared with the tab bar below. */}
      <Listbox.Content gutter='none' aria-label={t('chat-view.title')}>
        {Assistant.ChatViews.map((view) => (
          <Listbox.Item key={view} id={view} classNames='dx-focus-ring rounded-xs'>
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const [remote, setRemote] = useObject(chat, 'remote');
  const client = Hooks.useOptionalCapability(ClientCapabilities.Client);
  // Offered only where an edge service is configured, which is the same condition that decides
  // whether `RemoteProcessManager` is the real manager or `layerNoop`: against the noop a spawn has
  // no `list` or `spawn`, so choosing `remote` would persist a flag the next prompt cannot honour.
  // An agent's chat always runs on EDGE (`Agent.chatLocation`), so local is not a choice there.
  const agentChat = chat !== undefined && Agent.isAgentChat(chat);
  const environments = agentChat
    ? CHAT_ENVIRONMENTS.filter((environment) => environment === 'remote')
    : client?.config.values.runtime?.services?.edge?.url
      ? CHAT_ENVIRONMENTS
      : CHAT_ENVIRONMENTS.filter((environment) => environment !== 'remote');
  const value: ChatEnvironment = remote || agentChat ? 'remote' : 'local';
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
      {/* No gutter: the popover's padding is the inset, shared with the tab bar below. */}
      <Listbox.Content gutter='none' aria-label={t('options.environment.title')}>
        {environments.map((environment) => (
          <Listbox.Item key={environment} id={environment} classNames='dx-focus-ring rounded-xs'>
            <Listbox.ItemText>{t(`chat-environment.${environment}.label`)}</Listbox.ItemText>
            <Listbox.ItemIndicator />
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

const CHAT_ENVIRONMENTS = ['local', 'remote'] as const;

type ChatEnvironment = (typeof CHAT_ENVIRONMENTS)[number];

const ModelsPanel = ({
  presets,
  preset,
  onPresetChange,
}: Pick<ChatOptionsProps, 'presets' | 'preset' | 'onPresetChange'>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  return (
    <Layout.Flex column classNames='dx-expand'>
      <Listbox.Root
        value={preset}
        onValueChange={onPresetChange}
        autoFocus
        items={(presets ?? []).map(({ id, label }) => ({ value: id, label: label }))}
      >
        <Listbox.Content gutter='none' aria-label={t('options.chat-model.title')} data-testid='assistant.models'>
          {presets?.map(({ id, label }) => (
            <Listbox.Item key={id} id={id} classNames='dx-focus-ring rounded-xs' data-testid={`assistant.models.${id}`}>
              <Listbox.ItemText>{label}</Listbox.ItemText>
              <Listbox.ItemIndicator />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Toolbar.Root>
        <OnlineSwitch />
      </Toolbar.Root>
    </Layout.Flex>
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const [settings, setSettings] = Hooks.useAtomCapabilityState(AssistantCapabilities.Settings);
  const hasBuiltIn = Hooks.useOptionalCapability(AssistantCapabilities.OllamaManager) !== undefined;
  const online = resolveProvider(settings.modelProvider, hasBuiltIn) === Provider.edge.id;

  const handleChange = useCallback(
    (checked: boolean) => {
      const provider = checked ? Provider.edge.id : hasBuiltIn ? Provider.builtIn.id : Provider.ollama.id;
      setSettings((current) => ({ ...current, modelProvider: provider }));
    },
    [setSettings, hasBuiltIn],
  );

  return (
    <Input.Switch
      checked={online}
      onCheckedChange={({ checked }) => handleChange(checked)}
      data-testid='assistant.online'
      label={t('online-switch.label')}
    />
  );
};

type McpServerDraft = {
  name: string;
  url: string;
  protocol: McpServer.Spec['protocol'];
  apiKey?: string;
};

type McpServersPanelProps = {
  db: Database.Database;
};

const McpServersPanel = ({ db }: McpServersPanelProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
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
    <Layout.Flex column data-testid='assistant.mcp-servers'>
      <Listbox.Root items={servers.map((server) => ({ value: server.id, label: server.name ?? server.id }))}>
        <Listbox.Content aria-label={t('options.mcp.title')} classNames='gap-1'>
          {servers.map((server) => (
            <McpServerRow key={server.id} server={server} onRemove={handleRemove} />
          ))}
        </Listbox.Content>
      </Listbox.Root>
      {adding ? (
        <McpForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <Layout.Flex classNames='p-1'>
          <Button.Root
            variant='ghost'
            icon='ph--plus--regular'
            label={t('mcp-server-add.label')}
            onClick={() => setAdding(true)}
            data-testid='assistant.mcp-server.add'
          />
        </Layout.Flex>
      )}
    </Layout.Flex>
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
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
      <Layout.Flex align='center' gap='sm'>
        <Field.Root>
          <Field.Label srOnly>{name}</Field.Label>
          <Input.Switch checked={enabled !== false} onCheckedChange={({ checked }) => setEnabled(!!checked)} />
        </Field.Root>
        <Layout.Flex column grow classNames='min-w-0'>
          <span className='truncate text-sm'>{name}</span>
          <span className='truncate text-xs text-fg-muted'>{url}</span>
        </Layout.Flex>
        {status.state === 'unauthorized' && (
          <Button.Root
            variant='primary'
            icon='ph--sign-in--regular'
            label={t('mcp-server-sign-in.label')}
            disabled={pending}
            onClick={handleSignIn}
            data-testid='assistant.mcp-server.sign-in'
          />
        )}
        {(status.state === 'error' || status.state === 'unauthorized') && (
          <Button.Root
            variant='ghost'
            icon='ph--arrow-clockwise--regular'
            iconOnly
            label={t('mcp-server-retry.label')}
            onClick={() => setRevision((revision) => revision + 1)}
          />
        )}
        <Button.Root
          variant='ghost'
          icon='ph--x--regular'
          iconOnly
          label={t('mcp-server-remove.label')}
          onClick={() => onRemove(server)}
        />
      </Layout.Flex>
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

type McpFormProps = {
  onSubmit: (draft: McpServerDraft) => void;
  onCancel: () => void;
};

const McpForm = ({ onSubmit, onCancel }: McpFormProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
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
      <Field.Root>
        <Field.Label srOnly>{t('mcp-server-name.label')}</Field.Label>
        <Input.Root
          placeholder={t('mcp-server-name.placeholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          data-testid='assistant.mcp-server.name'
        />
      </Field.Root>
      <Field.Root>
        <Field.Label srOnly>{t('mcp-server-url.label')}</Field.Label>
        <Input.Root
          type='url'
          placeholder={t('mcp-server-url.placeholder')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          data-testid='assistant.mcp-server.url'
        />
      </Field.Root>
      <Select.Root
        value={[protocol]}
        onValueChange={({ value: [value] }) => setProtocol(value === 'sse' ? 'sse' : 'http')}
        items={[
          { value: 'http', label: 'HTTP' },
          { value: 'sse', label: 'SSE' },
        ]}
      >
        <Select.Trigger placeholder={t('mcp-server-protocol.label')} />
        <Select.Content>
          <Select.Item item={{ value: 'http', label: 'HTTP' }} />
          <Select.Item item={{ value: 'sse', label: 'SSE' }} />
        </Select.Content>
      </Select.Root>
      <Field.Root>
        <Field.Label srOnly>{t('mcp-server-api-key.label')}</Field.Label>
        <Input.Password
          ignorePasswordManagers
          placeholder={t('mcp-server-api-key.placeholder')}
          value={apiKey}
          onValueChange={setApiKey}
          data-testid='assistant.mcp-server.api-key'
        />
      </Field.Root>
      <Layout.Flex justify='end'>
        <SystemButton.Save
          type='submit'
          variant='ghost'
          disabled={!canSubmit}
          data-testid='assistant.mcp-server.save'
        />
        <SystemButton.Cancel type='button' variant='ghost' onClick={onCancel} />
      </Layout.Flex>
    </form>
  );
};

const ANY = '__any__' as const;

/** @private */
export const ObjectsPanel = ({ db, context }: Pick<ChatOptionsProps, 'db' | 'context'>): JSX.Element => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

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

  const typeItems = useMemo(
    () => [
      { value: ANY, label: t('any-type-filter.label') },
      ...typeOptions.map(({ uri, label }) => ({ value: uri, label })),
    ],
    [typeOptions, t],
  );

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
    <Layout.Flex column classNames='min-h-0 divide-y divide-separator'>
      {/* Shrinks to the popover's height, so the list scrolls rather than pushing the filter out of it. */}
      <SearchList.Root onSearch={handleSearch}>
        {/* No chrome padding: the rows align with the toolbar below, which is a sibling of
          `Content` and so sits flush against the panel edge. */}
        <SearchList.Content classNames='flex flex-col'>
          <SearchList.Viewport padding={false} classNames='min-h-0 flex-auto'>
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

        <Toolbar.Root>
          <SearchList.Input placeholder={t('search.placeholder')} autoFocus />
          <Select.Root
            items={typeItems}
            value={selectedUri === ANY ? [] : [selectedUri]}
            onValueChange={({ value: [value] }) =>
              setSelectedUri(typeOptions.find(({ uri }) => uri === value)?.uri ?? ANY)
            }
          >
            <Select.Trigger fixed placeholder={t('type-filter.placeholder')} />
            <Select.Content>
              {typeItems.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>
        </Toolbar.Root>
      </SearchList.Root>
    </Layout.Flex>
  );
};
