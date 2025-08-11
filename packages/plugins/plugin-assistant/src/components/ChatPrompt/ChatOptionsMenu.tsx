//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Blueprint } from '@dxos/blueprints';
import { DropdownMenu, IconButton, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ChatOptionsMenuProps = {
  registry?: Blueprint.Registry;
  active?: Set<string>;
  onChange?: (key: string, active: boolean) => void;
};

// TODO(burdon): Refactor this as a Dialog (and move the object selector here also).
export const ChatOptionsMenu = ({ registry, active, onChange }: ChatOptionsMenuProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plus--regular' variant='ghost' size={5} iconOnly label={t('button add blueprint')} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left'>
          <DropdownMenu.Viewport>
            {registry?.query().map((blueprint) => (
              <DropdownMenu.CheckboxItem key={blueprint.key}>
                <Input.Root>
                  <Input.Checkbox
                    checked={active?.has(blueprint.key)}
                    onCheckedChange={(checked) => onChange?.(blueprint.key, !!checked)}
                  />
                  {/* TODO(burdon): Remove need for custom margin. */}
                  {/* TODO(burdon): Clicking on label doesn't toggle checkbox. */}
                  <Input.Label classNames='m-0'>{blueprint.name}</Input.Label>
                </Input.Root>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
