//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type Database } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';

import { DiscordChannel } from '#types';

export type DiscordChannelFormProps = PropsWithChildren<{
  /** Database the bot-token picker queries. */
  db?: Database.Database;
  label?: string;
  description?: string;
  values?: Partial<DiscordChannel.Properties>;
  /** Saves on blur when editing an existing config; otherwise saves on explicit submit. */
  autoSave?: boolean;
  onSave?: (values: DiscordChannel.Properties) => void;
}>;

/** Edits the bot and Discord channel ids of a Discord-backed channel. */
export const DiscordChannelForm = ({
  db,
  label,
  description,
  values,
  autoSave,
  onSave,
  children,
}: DiscordChannelFormProps) => (
  <Form.Root<DiscordChannel.Properties>
    schema={DiscordChannel.Properties}
    db={db}
    values={values}
    autoSave={autoSave}
    onSave={onSave}
  >
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet label={label} description={description}>
          <Form.Fields />
        </Form.FieldSet>
        {!autoSave && <Form.Actions />}
        {/* Inside the form's content so status banners share its gutter and scroll. */}
        {children}
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);

DiscordChannelForm.displayName = 'DiscordChannelForm';
