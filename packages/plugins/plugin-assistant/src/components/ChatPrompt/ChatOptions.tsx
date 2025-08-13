//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { type AiContextBinder } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Filter, Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Icon, IconButton, Popover, Separator, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { Tabs } from '@dxos/react-ui-tabs';

import { useBlueprints } from '../../hooks';
import { meta } from '../../meta';

export type ChatOptionsProps = {
  space?: Space;
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  onUpdateBlueprint?: (key: string, isActive: boolean) => void;
};

/**
 * Manages the runtime context for the chat.
 */
export const ChatOptions = ({ context, blueprintRegistry, onUpdateBlueprint, space }: ChatOptionsProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Possibly constrain query as registry grows.
  const blueprints = useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);

  const activeBlueprints = useBlueprints({ context });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          icon='ph--plus--regular'
          variant='ghost'
          size={5}
          iconOnly
          label={t('context objects placeholder')}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='top'>
          <Tabs.Root
            orientation='horizontal'
            defaultValue='blueprints'
            defaultActivePart='list'
            classNames='min-is-min is-[calc(100dvw-.5rem)] sm:is-max max-is-[--text-content]'
          >
            <Tabs.Viewport classNames='max-bs-[--radix-popover-content-available-height] grid grid-rows-[1fr_min-content] [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:pli-cardSpacingChrome [&_[role="tabpanel"]]:overflow-y-auto'>
              <Tabs.Tabpanel value='blueprints'>
                <SearchList.Root>
                  <SearchList.Content classNames='plb-cardSpacingChrome'>
                    {blueprints.map((blueprint) => {
                      const isActive = activeBlueprints.has(blueprint.key);
                      return (
                        <SearchList.Item
                          classNames='flex gap-2 items-center'
                          key={blueprint.key}
                          value={blueprint.key}
                          onSelect={() => onUpdateBlueprint?.(blueprint.key, !isActive)}
                        >
                          <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
                          {blueprint.name}
                        </SearchList.Item>
                      );
                    })}
                  </SearchList.Content>
                  <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-cardSpacingChrome' />
                </SearchList.Root>
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='objects'>
                <SearchList.Root>
                  <SearchList.Content classNames='plb-cardSpacingChrome'>
                    {(space?.db.query(Filter.everything()).runSync() ?? []).map(({ object }) => {
                      const label = Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id;
                      const value = Obj.getDXN(object).toString();
                      return (
                        <SearchList.Item key={value} value={value} onSelect={() => {}}>
                          {label}
                        </SearchList.Item>
                      );
                    })}
                  </SearchList.Content>
                  <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-cardSpacingChrome' />
                </SearchList.Root>
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='model'>
                <ul>
                  {DEFAULT_OLLAMA_MODELS.map((model) => (
                    <li key={model}>{model}</li>
                  ))}
                </ul>
                <Separator />
                <ul>
                  {DEFAULT_EDGE_MODELS.map((model) => (
                    <li key={model}>{model}</li>
                  ))}
                </ul>
              </Tabs.Tabpanel>
              <Tabs.Tablist classNames='sm:overflow-x-hidden p-[--dx-cardSpacingChrome] border-bs border-subduedSeparator'>
                <Tabs.IconTab
                  value='blueprints'
                  icon='ph--blueprint--regular'
                  label={t('blueprints in context title')}
                />
                <Tabs.IconTab value='objects' label={t('objects in context title')} icon='ph--file--regular' />
                <Tabs.IconTab value='model' label={t('chat model title')} icon='ph--cpu--regular' />
              </Tabs.Tablist>
            </Tabs.Viewport>
          </Tabs.Root>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
