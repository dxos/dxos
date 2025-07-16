//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type BlueprintRegistry } from '@dxos/assistant';
import { DropdownMenu, IconButton, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ChatOptionsMenuProps = {
  blueprints: string[];
  blueprintRegistry: BlueprintRegistry;
  onChange: (id: string, active: boolean) => void;
};

export const ChatOptionsMenu = ({ blueprints, blueprintRegistry, onChange }: ChatOptionsMenuProps) => {
  const { t } = useTranslation(meta.id);
  const items = useMemo(
    () => blueprintRegistry.query().map((blueprint) => ({ id: blueprint.id, label: blueprint.name })),
    [blueprintRegistry],
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton
          disabled
          icon='ph--plus--regular'
          variant='ghost'
          size={5}
          iconOnly
          label={t('button add blueprint')}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left'>
          <DropdownMenu.Viewport>
            {items.map((item) => (
              <DropdownMenu.Item key={item.id}>
                <Input.Root>
                  <Input.Checkbox
                    checked={blueprints.includes(item.id)}
                    onCheckedChange={(checked) => onChange(item.id, !!checked)}
                  />
                  {/* TODO(burdon): Input.Label? */}
                  <span>{item.label}</span>
                </Input.Root>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
