//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Database } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';

import { DiscordBinding } from '#types';

export type DiscordBindingFormProps = {
  /** Database the bot-token picker queries. */
  db?: Database.Database;
  label?: string;
  description?: string;
  values?: Partial<DiscordBinding.Properties>;
  /** Saves on blur when editing an existing binding; otherwise saves on explicit submit. */
  autoSave?: boolean;
  onSave?: (values: DiscordBinding.Properties) => void;
};

/** Edits the connection settings of an agent's Discord binding. */
export const DiscordBindingForm = ({ db, label, description, values, autoSave, onSave }: DiscordBindingFormProps) => (
  <Form.Root<DiscordBinding.Properties>
    schema={DiscordBinding.Properties}
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
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);

DiscordBindingForm.displayName = 'DiscordBindingForm';
