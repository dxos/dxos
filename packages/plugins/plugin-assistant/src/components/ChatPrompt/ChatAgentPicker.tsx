//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';

import { useChatAgent } from '#hooks';
import { meta } from '#meta';
import { type AssistantCapabilities, type AssistantPreset } from '#types';

import { type AgentOption, type AgentPlacement, optionForHarness } from '../../util/agent-options.ts';

const LOCATION_ICONS: Record<AssistantCapabilities.AgentLocation, string> = {
  local: 'ph--desktop--regular',
  edge: 'ph--cloud--regular',
};

/** The settings an agent may let a chat choose, in the order the picker shows them. */
const AGENT_SETTINGS: readonly AssistantCapabilities.AgentSetting[] = ['agentModel', 'agentEffort', 'agentMode'];

export type ChatAgentPickerProps = AssistantPreset.ChatPresetProps & {
  chat?: Chat.Chat;
  started?: boolean;
};

export const ChatAgentPicker = ({ chat, started, presets, preset, onPresetChange }: ChatAgentPickerProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { current: harness, options } = useChatAgent(chat);
  const option = optionForHarness(options, harness);
  const { placements, location, offered, select } = usePlacement(chat, option, harness);
  const model = presets?.find(({ id }) => id === preset);

  const handleAgentChange = useCallback(
    (value: string) => {
      const next = options.find((option) => option.value === value);
      const placement = next && choosePlacement(next, offered(next), location, model);
      if (next && placement) {
        select(next, placement);
      }
    },
    [options, location, offered, select, model],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      const placement =
        placements.find((placement) => placement.location === value && placement.harness === harness) ??
        placements.find((placement) => placement.location === value);
      if (option && placement) {
        select(option, placement);
      }
    },
    [placements, harness, option, select],
  );

  const [session] = useObject(chat, 'session');
  const choices = option?.choices ?? {};

  const handleChoiceChange = useCallback(
    (setting: AssistantCapabilities.AgentSetting, value: string) => {
      if (chat) {
        Obj.update(chat, (chat) => {
          chat.session = { ...chat.session, [setting]: value || undefined };
        });
      }
    },
    [chat],
  );

  const agentLabel = option?.label ?? harness;
  const agentModel = choices.agentModel?.find(({ id }) => id === session?.agentModel);
  const shownModel = option?.ownModel ? agentModel : model;
  const label = shownModel ? `${agentLabel} · ${shownModel.label}` : agentLabel;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          classNames='min-w-0 shrink'
          icon={LOCATION_ICONS[location]}
          caretDown
          disabled={!chat}
          data-testid='assistant.agent-picker'
          data-location={location}
        >
          <span className='truncate'>{label}</span>
        </Button.Root>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.RadioItemGroup value={option?.value ?? harness} onValueChange={({ value }) => handleAgentChange(value)}>
          <Menu.ItemGroupLabel>{started ? t('agent-locked.message') : t('agent-picker.label')}</Menu.ItemGroupLabel>
          {options.map(({ value, label, icon, disabled, description }) => (
            <Menu.RadioItem
              key={value}
              item={{
                value,
                label: description ? `${label} (${description})` : label,
                icon,
                disabled: disabled || started,
              }}
              data-testid={`assistant.agents.${value}`}
            />
          ))}
        </Menu.RadioItemGroup>

        {placements.length > 1 && (
          <>
            <Menu.Separator />
            <Menu.RadioItemGroup value={location} onValueChange={({ value }) => handleLocationChange(value)}>
              <Menu.ItemGroupLabel>{t('model-picker.environment.label')}</Menu.ItemGroupLabel>
              {placements.map((placement) => (
                <Menu.RadioItem
                  key={`${placement.harness}:${placement.location}`}
                  item={{
                    value: placement.location,
                    label: t(`chat-environment.${placement.location}.label`),
                    icon: LOCATION_ICONS[placement.location],
                    disabled:
                      !option ||
                      !runnable(option, placement, model) ||
                      (started === true && placement.harness !== harness),
                  }}
                  data-testid={`assistant.environment.${placement.location}`}
                />
              ))}
            </Menu.RadioItemGroup>
          </>
        )}

        {AGENT_SETTINGS.map((setting) => {
          const offered = choices[setting] ?? [];
          if (offered.length === 0) {
            return null;
          }
          const value = offered.find(({ id }) => id === session?.[setting])?.id ?? '';
          return (
            <Fragment key={setting}>
              <Menu.Separator />
              <Menu.RadioItemGroup value={value} onValueChange={({ value }) => handleChoiceChange(setting, value)}>
                <Menu.ItemGroupLabel>
                  {t(started ? `agent-setting.${setting}.locked.label` : `agent-setting.${setting}.label`)}
                </Menu.ItemGroupLabel>
                <Menu.RadioItem
                  item={{ value: '', label: t('agent-setting-default.label'), disabled: started }}
                  data-testid={`assistant.${setting}.unset`}
                />
                {offered.map(({ id, label }) => (
                  <Menu.RadioItem
                    key={id}
                    item={{ value: id, label, disabled: started }}
                    data-testid={`assistant.${setting}.${id}`}
                  />
                ))}
              </Menu.RadioItemGroup>
            </Fragment>
          );
        })}

        {!option?.ownModel && (presets?.length ?? 0) > 0 && (
          <>
            <Menu.Separator />
            <Menu.RadioItemGroup value={preset ?? ''} onValueChange={({ value }) => onPresetChange?.(value)}>
              <Menu.ItemGroupLabel>{t('model-picker.models.label')}</Menu.ItemGroupLabel>
              {presets?.map(({ id, label, local, icon }) => (
                <Menu.RadioItem
                  key={id}
                  item={{ value: id, label, icon, disabled: local === true && location === 'edge' }}
                  data-testid={`assistant.models.${id}`}
                />
              ))}
            </Menu.RadioItemGroup>
          </>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};

const runnable = (option: AgentOption, placement: AgentPlacement, model: AssistantPreset.AiPreset | undefined) =>
  placement.available && !(placement.location === 'edge' && !option.ownModel && model?.local === true);

export const choosePlacement = (
  option: AgentOption,
  placements: readonly AgentPlacement[],
  location: AssistantCapabilities.AgentLocation,
  model: AssistantPreset.AiPreset | undefined,
): AgentPlacement | undefined => {
  const candidates = placements.filter((placement) => runnable(option, placement, model));
  return candidates.find((placement) => placement.location === location) ?? candidates[0];
};

export const usePlacement = (chat: Chat.Chat | undefined, option: AgentOption | undefined, harness: string) => {
  const [remote] = useObject(chat, 'remote');
  const client = Hooks.useOptionalCapability(ClientCapabilities.Client);
  const edgeConfigured = Boolean(client?.config.values.runtime?.services?.edge?.url);
  const agentOnEdge = chat !== undefined && Agent.isAgentChat(chat) && chat.remote !== false;

  const offered = useCallback(
    (option: AgentOption | undefined): AgentPlacement[] => {
      const all = option?.placements ?? [];
      return all.filter((placement) => {
        if (!runsInSeveralPlaces(all, placement.harness)) {
          return true;
        }
        const edgeOffered = edgeConfigured || agentOnEdge;
        const localOffered = !(agentOnEdge && edgeConfigured);
        return placement.location === 'edge' ? edgeOffered : localOffered;
      });
    },
    [edgeConfigured, agentOnEdge],
  );
  const placements = useMemo(() => offered(option), [offered, option]);

  const own = placements.filter((placement) => placement.harness === harness);
  const location: AssistantCapabilities.AgentLocation =
    own.length === 1 ? own[0].location : remote || agentOnEdge ? 'edge' : 'local';

  const select = useCallback(
    (owner: AgentOption, placement: AgentPlacement) => {
      if (!chat) {
        return;
      }
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, harness: placement.harness };
        chat.remote = runsInSeveralPlaces(owner.placements, placement.harness) ? placement.location === 'edge' : false;
      });
    },
    [chat],
  );

  return { placements, location, offered, select };
};

const runsInSeveralPlaces = (placements: readonly AgentPlacement[], harness: string): boolean =>
  placements.filter((placement) => placement.harness === harness).length > 1;
