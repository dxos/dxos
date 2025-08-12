//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { DropdownMenu, Icon, IconButton, useTranslation } from '@dxos/react-ui';

import { useBlueprints } from '../../hooks';
import { meta } from '../../meta';

export type ChatOptionsProps = {
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  onUpdateBlueprint?: (key: string, isActive: boolean) => void;
};

/**
 * Manages the runtime context for the chat.
 */
// TODO(burdon): Refactor this as a Dialog (and move the object selector here also).
export const ChatOptions = ({ context, blueprintRegistry, onUpdateBlueprint }: ChatOptionsProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Possibly constrain query as registry grows.
  const blueprints = useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);

  const activeBlueprints = useBlueprints({ context });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plus--regular' variant='ghost' size={5} iconOnly label={t('button add blueprint')} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left'>
          <DropdownMenu.Viewport>
            {blueprints.map((blueprint) => (
              <DropdownMenu.CheckboxItem
                key={blueprint.key}
                checked={activeBlueprints?.get(blueprint.key) !== undefined}
                onCheckedChange={(checked) => onUpdateBlueprint?.(blueprint.key, !!checked)}
                classNames='gap-2'
              >
                <div className='flex-1 min-is-0'>{blueprint.name}</div>
                <DropdownMenu.ItemIndicator asChild>
                  <Icon icon='ph--check--regular' size={4} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
