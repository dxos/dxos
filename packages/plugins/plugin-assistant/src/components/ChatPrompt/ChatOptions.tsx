//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Icon, IconButton, Popover, useAsyncState, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { Tabs } from '@dxos/react-ui-tabs';
import { isNonNullable } from '@dxos/util';

import { useBlueprints } from '../../hooks';
import { meta } from '../../meta';

export type ChatOptionsProps = {
  space?: Space;
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  onBlueprintChange?: (key: string, isActive: boolean) => void;
  presets?: { id: string; label: string }[];
  preset?: string;
  onPresetChange?: (id: string) => void;
  onObjectChange?: (dxn: string, isActive: boolean) => void;
};

/**
 * Manages the runtime context for the chat.
 */
export const ChatOptions = ({
  context,
  blueprintRegistry,
  onBlueprintChange,
  space,
  presets,
  preset,
  onPresetChange,
  onObjectChange,
}: ChatOptionsProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Possibly constrain query as registry grows.
  const blueprints = useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);

  const activeBlueprints = useBlueprints({ context });

  const [activeDxns] = useAsyncState<string[]>(async () => {
    const objects = await Ref.Array.loadAll(context?.objects.value ?? []);
    return objects.filter(isNonNullable).map((obj) => Obj.getDXN(obj).toString());
  }, [context?.objects]);

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
            <Tabs.Viewport classNames='max-bs-[--radix-popover-content-available-height] grid grid-rows-[1fr_min-content] [&_[cmdk-root]]:contents [&_[role="tabpanel"]]:grid [&_[role="tabpanel"]]:grid-rows-[1fr_min-content] [&_[role="listbox"]]:min-bs-0 [&_[role="listbox"]]:overflow-y-auto [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:pli-cardSpacingChrome [&_[role="tabpanel"][data-state="active"]]:order-first [&_[role="tabpanel"][data-state="inactive"]]:order-1'>
              <Tabs.Tabpanel value='blueprints'>
                <SearchList.Root>
                  <SearchList.Content classNames='plb-cardSpacingChrome'>
                    {blueprints.map((blueprint) => {
                      const isActive = activeBlueprints.has(blueprint.key);
                      return (
                        <SearchList.Item
                          classNames='flex gap-2 items-center'
                          key={blueprint.key}
                          value={blueprint.name}
                          onSelect={() => onBlueprintChange?.(blueprint.key, !isActive)}
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
                      const isActive = activeDxns?.find((dxn) => dxn === value);
                      return (
                        <SearchList.Item
                          classNames='flex gap-2 items-center'
                          key={value}
                          value={label}
                          onSelect={() => onObjectChange?.(value, !isActive)}
                        >
                          <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
                          {label}
                        </SearchList.Item>
                      );
                    })}
                  </SearchList.Content>
                  <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-cardSpacingChrome' />
                </SearchList.Root>
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='model'>
                <ul role='listbox' className='plb-cardSpacingChrome'>
                  {presets?.map(({ id, label }) => {
                    const isActive = preset === id;
                    return (
                      <li
                        role='option'
                        key={id}
                        aria-selected={isActive}
                        tabIndex={0}
                        className='dx-focus-ring flex gap-2 items-center p-1 rounded-sm select-none cursor-pointer hover:bg-hoverOverlay'
                        onClick={() => onPresetChange?.(id)}
                      >
                        <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </Tabs.Tabpanel>
              <Tabs.Tablist classNames='sm:overflow-x-hidden p-[--dx-cardSpacingChrome] border-bs border-subduedSeparator order-last'>
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
