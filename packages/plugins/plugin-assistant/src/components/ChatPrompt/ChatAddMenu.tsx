//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import * as McpServer from '@dxos/compute/McpServer';
import { type Database, Filter } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';

import { meta } from '#meta';

export type ChatAddMenuProps = {
  db: Database.Database;
  disabled?: boolean;
  /** Opens the file picker; the entry is withheld when no plugin can store a file. */
  onAddFiles?: () => void;
  onAddObject: () => void;
  onCommands: () => void;
  onManageMcpServers: () => void;
};

/**
 * The prompt's "+": the kinds of thing a message can carry, not the things themselves. Objects are
 * found by name with `@`; this is where a reader discovers that, and where the fuller pickers live.
 */
export const ChatAddMenu = ({
  db,
  disabled,
  onAddFiles,
  onAddObject,
  onCommands,
  onManageMcpServers,
}: ChatAddMenuProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const servers = useQuery(db, Filter.type(McpServer.McpServer));

  // Run once the menu has closed: an action that moves focus (the editor's completion list, a dialog)
  // would otherwise lose it to the menu returning focus to its trigger, and the completion list would
  // open under the pointer that is still finishing the click.
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
        case 'manage-mcp-servers':
          pending.current = onManageMcpServers;
          break;
      }
    },
    [onAddFiles, onAddObject, onCommands, onManageMcpServers],
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
            item={{ label: t('mcp-servers.label'), icon: 'ph--plugs-connected--regular' }}
            data-testid='assistant.add-menu.mcp-servers'
          />
          <Menu.Content>
            {servers.length === 0 && (
              <Menu.Item item={{ value: 'no-mcp-servers', label: t('mcp-servers-empty.label'), disabled: true }} />
            )}
            {servers.map((server) => (
              <McpServerItem key={server.id} server={server} />
            ))}
            <Menu.Separator />
            <Menu.Item
              item={{ value: 'manage-mcp-servers', label: t('mcp-servers-manage.label'), icon: 'ph--gear--regular' }}
              data-testid='assistant.add-menu.manage-mcp-servers'
            />
          </Menu.Content>
        </Menu.Sub>
      </Menu.Content>
    </Menu.Root>
  );
};

/** Subscribed per server: the query re-renders only when the set of servers changes, not their switches. */
const McpServerItem = ({ server }: { server: McpServer.McpServer }) => {
  const [enabled, setEnabled] = useObject(server, 'enabled');
  const [name] = useObject(server, 'name');
  return (
    <Menu.CheckboxItem
      item={{ value: `mcp-server-${server.id}`, label: name ?? server.id }}
      checked={enabled !== false}
      onCheckedChange={(checked) => setEnabled(!!checked)}
      // Toggling several servers in a row is the common case, so the menu stays open.
      closeOnSelect={false}
      data-testid='assistant.add-menu.mcp-server'
    />
  );
};
