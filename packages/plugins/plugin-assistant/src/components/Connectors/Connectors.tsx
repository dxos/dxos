//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { AiContext } from '@dxos/assistant';
import { type Database, Filter, Ref, type URI } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { Listbox } from '@dxos/react-ui-list';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

import { ConnectorAuthMenu } from '../ConnectorAuthMenu/index.ts';

/** The space's connections whose connector declares an MCP server: the only ones a chat connects. */
export const useMcpConnections = (db: Database.Database | undefined) => {
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector).flat();
  const connections = useQuery(db, Filter.type(Connection.Connection));
  return useMemo(
    () =>
      connections.flatMap((connection) => {
        const endpoint = ConnectorSpec.mcpEndpoint(connectors, connection);
        return endpoint ? [{ connection, endpoint }] : [];
      }),
    [connectors, connections],
  );
};

/** The conversation's per-connection MCP switches, live with the binder. */
export const useConnectionStates = (context: AiContext.Binder | undefined): ReadonlyMap<URI.URI, boolean> => {
  const [states, setStates] = useState<ReadonlyMap<URI.URI, boolean>>(() => context?.getConnections() ?? new Map());
  useEffect(() => {
    setStates(context?.getConnections() ?? new Map());
    return context?.subscribeConnections(setStates);
  }, [context]);
  return states;
};

export type ConnectorsDialogProps = ConnectorsPanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ConnectorsDialog = ({ open, onOpenChange, ...props }: ConnectorsDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)}>
      <Dialog.Content placement='start'>
        <Dialog.Header>
          <Dialog.Title>{t('connectors.title')}</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <ConnectorsPanel {...props} />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};

type ConnectorsPanelProps = {
  db: Database.Database;
  /** Absent when there is no conversation to turn a connection on or off for. */
  context?: AiContext.Binder;
};

/** The connections that give this chat MCP tools, each switched on or off for this chat only. */
export const ConnectorsPanel = ({ db, context }: ConnectorsPanelProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector).flat();
  const mcpConnections = useMcpConnections(db);
  // Every connector that declares an MCP server, so Connect offers the built-in servers alongside a custom
  // one. A connector that takes no credential is offered once: a second connection would add the same tools.
  const mcpConnectorIds = useMemo(
    () =>
      connectors
        .filter(
          (connector) =>
            connector.mcp &&
            !(
              connector.noCredential && mcpConnections.some(({ connection }) => connection.connectorId === connector.id)
            ),
        )
        .map((connector) => connector.id),
    [connectors, mcpConnections],
  );
  const connectionStates = useConnectionStates(context);

  return (
    <Layout.Flex column data-testid='assistant.connectors'>
      <Listbox.Root
        items={mcpConnections.map(({ connection }) => ({
          value: connection.id,
          label: connection.name ?? connection.id,
        }))}
      >
        <Listbox.Viewport>
          <Listbox.Content aria-label={t('connectors.title')} classNames='gap-1'>
            {mcpConnections.map(({ connection, endpoint }) => (
              <McpConnectionRow
                key={connection.id}
                connection={connection}
                endpoint={endpoint}
                enabled={AiContext.isConnectionOn(connectionStates, connection)}
                onEnabledChange={
                  context ? (enabled) => void context.setConnection(Ref.make(connection), enabled) : undefined
                }
              />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
      <Layout.Flex classNames='p-1'>
        <ConnectorAuthMenu connectorIds={mcpConnectorIds} db={db} />
      </Layout.Flex>
    </Layout.Flex>
  );
};

type McpConnectionRowProps = {
  connection: Connection.Connection;
  endpoint: Connection.McpEndpoint;
  enabled: boolean;
  onEnabledChange?: (enabled: boolean) => void;
};

const McpConnectionRow = ({ connection, endpoint, enabled, onEnabledChange }: McpConnectionRowProps) => {
  const [name] = useObject(connection, 'name');
  return (
    <Listbox.Item
      id={connection.id}
      classNames='flex-col items-stretch px-form-chrome'
      data-testid='assistant.mcp-connection'
    >
      <Layout.Flex align='center' gap='sm'>
        <Field.Root>
          <Field.Label srOnly>{name}</Field.Label>
          <Input.Switch
            checked={enabled}
            disabled={!onEnabledChange}
            onCheckedChange={({ checked }) => onEnabledChange?.(!!checked)}
          />
        </Field.Root>
        <Layout.Flex column grow classNames='min-w-0'>
          <span className='truncate text-sm'>{name}</span>
          <span className='truncate text-xs text-fg-muted'>{endpoint.url}</span>
        </Layout.Flex>
      </Layout.Flex>
    </Listbox.Item>
  );
};
