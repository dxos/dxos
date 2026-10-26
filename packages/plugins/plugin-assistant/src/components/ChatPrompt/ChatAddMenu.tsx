//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { AiContext } from '@dxos/assistant';
import { type Database } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type Connection } from '@dxos/link';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';

import { useConnectionStates, useMcpConnections } from '#hooks';
import { meta } from '#meta';

export type ChatAddMenuProps = {
  db: Database.Database;
  /** The conversation the connector switches apply to; without one they show but cannot change. */
  context?: AiContext.Binder;
  disabled?: boolean;
  onAddFiles?: () => void;
  onAddObject: () => void;
  onCommands: () => void;
  onManageConnections: () => void;
};

export const ChatAddMenu = ({
  db,
  context,
  disabled,
  onAddFiles,
  onAddObject,
  onCommands,
  onManageConnections,
}: ChatAddMenuProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const mcpConnections = useMcpConnections(db);
  const connectionStates = useConnectionStates(context);

  // Run once the menu has closed: Ark's menu returns focus to its trigger on close, which would take it
  // from an action that moves focus (the editor's completion list, a dialog).
  const pending = useRef<(() => void) | undefined>(undefined);
  const handleSelect = useCallback(
    ({ value }: { value: string }) => {
      switch (value) {
        case 'files':
          pending.current = onAddFiles;
          break;
        case 'object':
          pending.current = onAddObject;
          break;
        case 'commands':
          pending.current = onCommands;
          break;
        case 'manage-connections':
          pending.current = onManageConnections;
          break;
      }
    },
    [onAddFiles, onAddObject, onCommands, onManageConnections],
  );
  const handleExitComplete = useCallback(() => {
    const action = pending.current;
    pending.current = undefined;
    action?.();
  }, []);

  return (
    <Menu.Root onSelect={handleSelect} onExitComplete={handleExitComplete}>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          icon='ph--plus--regular'
          iconOnly
          label={t('add-menu.button')}
          disabled={disabled}
          data-testid='assistant.add-menu'
        />
      </Menu.Trigger>
      <Menu.Content>
        {onAddFiles && (
          <Menu.Item
            item={{ value: 'files', label: t('add-files.label'), icon: 'ph--paperclip--regular' }}
            data-testid='assistant.add-menu.files'
          />
        )}
        <Menu.Item
          item={{ value: 'object', label: t('add-object.menu'), icon: 'ph--magnifying-glass--regular' }}
          data-testid='assistant.add-menu.object'
        />
        <Menu.Separator />
        <Menu.Item
          item={{ value: 'commands', label: t('commands-and-skills.label'), icon: 'ph--terminal--regular' }}
          data-testid='assistant.add-menu.commands'
        />
        <Menu.Sub>
          <Menu.TriggerItem
            item={{ label: t('connectors.label'), icon: 'ph--plugs-connected--regular' }}
            data-testid='assistant.add-menu.connectors'
          />
          <Menu.Content>
            {mcpConnections.length === 0 && (
              <Menu.Item item={{ value: 'no-connectors', label: t('connectors-empty.label'), disabled: true }} />
            )}
            {mcpConnections.map(({ connection }) => (
              <ConnectionItem
                key={connection.id}
                connection={connection}
                checked={AiContext.isConnectionOn(connectionStates, connection)}
                onCheckedChange={
                  context
                    ? (enabled) => void context.setConnection(AiContext.connectionRef(connection), enabled)
                    : undefined
                }
              />
            ))}
            <Menu.Separator />
            <Menu.Item
              item={{ value: 'manage-connections', label: t('connections-manage.label'), icon: 'ph--gear--regular' }}
              data-testid='assistant.add-menu.manage-connections'
            />
          </Menu.Content>
        </Menu.Sub>
      </Menu.Content>
    </Menu.Root>
  );
};

type ConnectionItemProps = {
  connection: Connection.Connection;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/** A connection's MCP server, switched on or off for this chat only. */
const ConnectionItem = ({ connection, checked, onCheckedChange }: ConnectionItemProps) => {
  const [name] = useObject(connection, 'name');
  return (
    <Menu.CheckboxItem
      item={{ value: `connection-${connection.id}`, label: name ?? connection.id, disabled: !onCheckedChange }}
      checked={checked}
      onCheckedChange={(checked) => onCheckedChange?.(!!checked)}
      closeOnSelect={false}
      data-testid='assistant.add-menu.connection'
    />
  );
};
