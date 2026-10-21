//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as McpServer from '@dxos/compute/McpServer';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { AccessToken } from '@dxos/link';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { mx } from '@dxos/ui-theme';

import { useMcpServerSignIn, useMcpServerStatus } from '#hooks';
import { meta } from '#meta';

export type McpServersDialogProps = McpServersPanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const McpServersDialog = ({ db, open, onOpenChange }: McpServersDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)}>
      <Dialog.Content placement='start'>
        <Dialog.Header>
          <Dialog.Title>{t('options.mcp.title')}</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <McpServersPanel db={db} />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
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

export const McpServersPanel = ({ db }: McpServersPanelProps) => {
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
        <Listbox.Viewport>
          <Listbox.Content aria-label={t('options.mcp.title')} classNames='gap-1'>
            {servers.map((server) => (
              <McpServerRow key={server.id} server={server} onRemove={handleRemove} />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
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
