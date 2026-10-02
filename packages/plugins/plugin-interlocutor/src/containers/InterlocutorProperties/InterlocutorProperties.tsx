//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';

import { DiscordBindingForm } from '#components';
import { meta } from '#meta';
import { DiscordBinding } from '#types';

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
    <DiscordBindingForm
      db={db}
      label={t('discord-binding.label')}
      description={t('discord-binding.description')}
      values={snapshot}
      autoSave={binding !== undefined}
      onSave={handleSave}
    />
  );
};

InterlocutorProperties.displayName = 'InterlocutorProperties';
