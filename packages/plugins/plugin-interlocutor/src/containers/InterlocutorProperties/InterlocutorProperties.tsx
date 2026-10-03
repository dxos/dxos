//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { type SpaceId } from '@dxos/keys';
import { useInterval } from '@dxos/react-hooks';
import { useTranslation } from '@dxos/react-ui';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { DiscordBindingForm, DiscordBotStatus } from '#components';
import { meta } from '#meta';
import { DiscordBinding, DiscordOperation } from '#types';

/** How often the bot status is re-read; the gateway changes state on EDGE without notifying Composer. */
const STATUS_POLL_MS = 5_000;

export type InterlocutorPropertiesProps = AppSurface.ObjectPropertiesProps<Agent.Agent>;

/** The agent's Discord binding: edits it in place, or creates it on the first save. */
export const InterlocutorProperties = ({ subject: agent }: InterlocutorPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(agent);
  const bindings = useQuery(db, Filter.type(DiscordBinding.DiscordBinding));
  const binding = useMemo(
    () => bindings.find((candidate) => Obj.getParent(candidate)?.id === agent.id),
    [bindings, agent.id],
  );
  const [snapshot] = useObject(binding);

  const handleSave = useCallback(
    (values: DiscordBinding.Properties) => {
      if (binding) {
        Obj.update(binding, (binding) => {
          binding.accessToken = values.accessToken;
          binding.applicationId = values.applicationId;
          binding.guildId = values.guildId;
          binding.channels = [...values.channels];
        });
      } else {
        db?.add(DiscordBinding.make({ ...values, agent }));
      }
    },
    [db, binding, agent],
  );

  return (
    <>
      <DiscordBindingForm
        db={db}
        label={t('discord-binding.label')}
        description={t('discord-binding.description')}
        values={snapshot}
        autoSave={binding !== undefined}
        onSave={handleSave}
      />
      {binding && db && <DiscordBotControls binding={binding} spaceId={db.spaceId} />}
    </>
  );
};

InterlocutorProperties.displayName = 'InterlocutorProperties';

type DiscordBotControlsProps = {
  binding: DiscordBinding.DiscordBinding;
  spaceId: SpaceId;
};

/** Start/stop toolbar and gateway status for a saved binding. */
const DiscordBotControls = ({ binding, spaceId }: DiscordBotControlsProps) => {
  const { invokePromise } = useOperationInvoker();
  const [status, setStatus] = useState<DiscordOperation.BotStatus>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await invokePromise(
      DiscordOperation.GetBotStatus,
      { binding: Ref.make(binding) },
      { spaceId },
    );
    setError(error?.message);
    setStatus(data?.status);
  }, [invokePromise, binding, spaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useInterval(refresh, STATUS_POLL_MS, [refresh]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    const { data, error } = await invokePromise(DiscordOperation.StartBot, { binding: Ref.make(binding) }, { spaceId });
    setError(error?.message);
    setStatus(data?.status);
    setBusy(false);
  }, [invokePromise, binding, spaceId]);

  const handleStop = useCallback(async () => {
    setBusy(true);
    const { error } = await invokePromise(DiscordOperation.StopBot, { binding: Ref.make(binding) }, { spaceId });
    if (error) {
      setError(error.message);
    } else {
      await refresh();
    }
    setBusy(false);
  }, [invokePromise, binding, spaceId, refresh]);

  const running = status?.running ?? false;
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['discord-bot-actions.label', { ns: meta.profile.key }] })
        .action(
          'start',
          {
            // Reconfigures a running bot, so the label follows the state.
            label: [running ? 'discord-bot-restart.label' : 'discord-bot-start.label', { ns: meta.profile.key }],
            icon: running ? 'ph--arrow-clockwise--regular' : 'ph--play--regular',
            disabled: busy,
          },
          () => void handleStart(),
        )
        .action(
          'stop',
          {
            label: ['discord-bot-stop.label', { ns: meta.profile.key }],
            icon: 'ph--stop--regular',
            disabled: busy || !running,
          },
          () => void handleStop(),
        )
        .action(
          'refresh',
          {
            label: ['discord-bot-refresh.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-counter-clockwise--regular',
            disabled: busy,
          },
          () => void refresh(),
        )
        .build(),
    [running, busy, handleStart, handleStop, refresh],
  );

  return (
    <>
      <ActionToolbar {...menuActions} />
      <DiscordBotStatus status={status} error={error} />
    </>
  );
};
