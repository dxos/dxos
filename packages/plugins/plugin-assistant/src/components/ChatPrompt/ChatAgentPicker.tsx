//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

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

export type ChatAgentPickerProps = AssistantPreset.ChatPresetProps & {
  chat?: Chat.Chat;
  /** Whether the conversation has begun; its agent is fixed from then on. */
  started?: boolean;
};

/**
 * Who answers, where it runs, and on which model: one control, ordered by how fixed each choice is. The
 * agent is fixed at the first message; where it runs can change between turns (the next prompt restarts
 * it there); the model can change at any time. Each choice narrows the next, and an option the others
 * rule out is disabled rather than hidden. The trigger's icon says where the agent runs.
 */
export const ChatAgentPicker = ({ chat, started, presets, preset, onPresetChange }: ChatAgentPickerProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { current: harness, options } = useChatAgent(chat);
  const option = optionForHarness(options, harness);
  const { placements, location, select } = usePlacement(chat, option, harness);
  const model = presets?.find(({ id }) => id === preset);

  const handleAgentChange = useCallback(
    (value: string) => {
      const next = options.find((option) => option.value === value);
      const placement =
        next?.placements.find((placement) => placement.available && placement.location === location) ??
        next?.placements.find(({ available }) => available);
      if (next && placement) {
        select(placement, next);
      }
    },
    [options, location, select],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      const placement =
        placements.find((placement) => placement.location === value && placement.harness === harness) ??
        placements.find((placement) => placement.location === value);
      if (option && placement) {
        select(placement, option);
      }
    },
    [placements, harness, option, select],
  );

  const agentLabel = option?.label ?? harness;
  const label = option?.ownModel || !model ? agentLabel : `${agentLabel} · ${model.label}`;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          icon={LOCATION_ICONS[location]}
          label={label}
          caretDown
          disabled={!chat}
          data-testid='assistant.agent-picker'
          data-location={location}
        />
      </Menu.Trigger>
      <Menu.Content>
        <Menu.RadioItemGroup value={option?.value ?? harness} onValueChange={({ value }) => handleAgentChange(value)}>
          {/* Locked rather than hidden once the chat starts: the reader still sees who answers, and why. */}
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
                      !placement.available ||
                      // A different runtime is a different agent, and the agent is fixed once the chat starts.
                      (started === true && placement.harness !== harness) ||
                      // EDGE cannot reach a model served on this device.
                      (placement.location === 'edge' && !option?.ownModel && model?.local === true),
                  }}
                  data-testid={`assistant.environment.${placement.location}`}
                />
              ))}
            </Menu.RadioItemGroup>
          </>
        )}

        {!option?.ownModel && (presets?.length ?? 0) > 0 && (
          <>
            <Menu.Separator />
            <Menu.RadioItemGroup value={preset ?? ''} onValueChange={({ value }) => onPresetChange?.(value)}>
              <Menu.ItemGroupLabel>{t('model-picker.models.label')}</Menu.ItemGroupLabel>
              {presets?.map(({ id, label, local }) => (
                <Menu.RadioItem
                  key={id}
                  item={{ value: id, label, disabled: local === true && location === 'edge' }}
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

/**
 * Where the chat's agent runs, and the places it could run instead. A registration that runs in several
 * places runs where `chat.remote` says; one that runs in one place is chosen by picking its harness.
 *
 * EDGE is offered for a several-place agent only where an edge service is configured: against the noop
 * manager a spawn has nowhere to go, so `remote` would persist a flag the next prompt cannot honour. An
 * agent's own chat runs on EDGE unless explicitly kept local, so there local is no choice.
 */
const usePlacement = (chat: Chat.Chat | undefined, option: AgentOption | undefined, harness: string) => {
  const [remote] = useObject(chat, 'remote');
  const client = Hooks.useOptionalCapability(ClientCapabilities.Client);
  const edgeConfigured = Boolean(client?.config.values.runtime?.services?.edge?.url);
  const agentOnEdge = chat !== undefined && Agent.isAgentChat(chat) && chat.remote !== false;

  const placements = useMemo(() => {
    const all = option?.placements ?? [];
    return all.filter((placement) => {
      if (!runsInSeveralPlaces(all, placement.harness)) {
        return true;
      }
      return placement.location === 'edge' ? edgeConfigured || agentOnEdge : !(agentOnEdge && edgeConfigured);
    });
  }, [option, edgeConfigured, agentOnEdge]);

  const own = placements.filter((placement) => placement.harness === harness);
  const location: AssistantCapabilities.AgentLocation =
    own.length === 1 ? own[0].location : remote || agentOnEdge ? 'edge' : 'local';

  const select = useCallback(
    (placement: AgentPlacement, next: AgentOption) => {
      if (!chat) {
        return;
      }
      const several = runsInSeveralPlaces(next.placements, placement.harness);
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, harness: placement.harness };
        // Only an agent that runs in several places reads `remote`; a one-place registration runs where it is.
        if (several) {
          chat.remote = placement.location === 'edge';
        } else if (chat.remote) {
          chat.remote = false;
        }
      });
    },
    [chat],
  );

  return { placements, location, select };
};

const runsInSeveralPlaces = (placements: readonly AgentPlacement[], harness: string): boolean =>
  placements.filter((placement) => placement.harness === harness).length > 1;
