//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Str from 'effect/String';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useMemo } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type DeviceOverridesProps = {
  subject: AppCapabilities.Settings;
};

/** Stable fallback so the atom hook keeps a constant identity while the sync is unavailable. */
const emptyOverrides = Atom.make<Record<string, Record<string, any>>>({});

/** Field names paired with the label the form renders for them. */
const getFields = (schema: AppCapabilities.Settings['schema']) =>
  SchemaEx.getProperties(schema.ast).map((property) => {
    const name = property.name.toString();
    return {
      name,
      label: SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(property.type) ?? Str.capitalize(name),
    };
  });

/**
 * Per-field control over which of a plugin's settings this device keeps to itself.
 *
 * Settings are shared across the user's devices by default, so this section is the opt-out: a
 * switched-on field is pinned to the value in effect here and stops following the other devices.
 * Renders nothing when the sync is unavailable (no client, or the settings space has not opened),
 * because there is then no device to pin to.
 */
export const DeviceOverrides = ({ subject }: DeviceOverridesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const overrides = useAtomValue(sync?.overrides ?? emptyOverrides);
  const fields = useMemo(() => getFields(subject.schema), [subject.schema]);

  if (!sync || fields.length === 0) {
    return null;
  }

  const pinned = overrides[subject.prefix] ?? {};

  return (
    <Form.Section title={t('device overrides label')} description={t('device overrides description')}>
      {fields.map(({ name, label }) => (
        <Form.Row key={name} label={label}>
          <Input.Root>
            <Input.Switch
              checked={name in pinned}
              onCheckedChange={(checked) =>
                checked ? sync.pin(subject.prefix, name) : sync.unpin(subject.prefix, name)
              }
            />
          </Input.Root>
        </Form.Row>
      ))}
    </Form.Section>
  );
};

DeviceOverrides.displayName = 'DeviceOverrides';
