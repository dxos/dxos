//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useAtomCapabilityState, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSpace, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-ui';
import { type FormFieldMap, Form } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';

import { meta } from '#meta';
import { NativeFilesystemOperation } from '#types';
import { type FilesystemWorkspace, NativeFilesystemCapabilities } from '#types';

import { writeComposerConfig } from '../util';

const WorkspaceSettingsSchema = Schema.Struct({
  icon: Schema.optional(Schema.String).annotations({ title: 'Icon' }),
  hue: Schema.optional(Schema.String).annotations({ title: 'Color' }),
});

export type WorkspaceSettingsContainerProps = {
  workspace: FilesystemWorkspace;
};

export const WorkspaceSettingsContainer = ({ workspace }: WorkspaceSettingsContainerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const [, updateState] = useAtomCapabilityState(NativeFilesystemCapabilities.State);

  const values = useMemo(
    () => ({
      icon: workspace.icon,
      hue: workspace.hue,
    }),
    [workspace.icon, workspace.hue],
  );

  const handleValuesChanged = useCallback(
    (
      newValues: Partial<Schema.Schema.Type<typeof WorkspaceSettingsSchema>>,
      valueMeta: { changed?: Record<string, boolean> },
    ) => {
      const changed = valueMeta.changed ?? {};
      if (!changed['icon'] && !changed['hue']) {
        return;
      }

      let mergedIcon: string | undefined;
      let mergedHue: string | undefined;

      updateState((state) => {
        const current = state.workspaces.find((ws) => ws.id === workspace.id);
        mergedIcon = changed['icon'] ? newValues.icon : current?.icon;
        mergedHue = changed['hue'] ? newValues.hue : current?.hue;
        return {
          ...state,
          workspaces: state.workspaces.map((ws) =>
            ws.id === workspace.id ? { ...ws, icon: mergedIcon, hue: mergedHue } : ws,
          ),
        };
      });

      const config = { icon: mergedIcon, hue: mergedHue };
      log.info('Writing composer config', { path: workspace.path, config });
      void EffectEx.runAndForwardErrors(
        writeComposerConfig(workspace.path, config).pipe(
          Effect.tap((success) =>
            success
              ? Effect.void
              : Effect.sync(() => log.warn('Failed to write composer config', { path: workspace.path })),
          ),
        ),
      );
    },
    [workspace, updateState],
  );

  const handleRemove = useCallback(async () => {
    await invokePromise(NativeFilesystemOperation.CloseDirectory, { id: workspace.id });
    const personalSpaceId = AppSpace.getPersonalSpace(client)?.id;
    if (personalSpaceId) {
      await invokePromise(LayoutOperation.SwitchWorkspace, {
        subject: Paths.getSpacePath(personalSpaceId),
      });
    }
  }, [workspace.id, invokePromise, client]);

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      icon: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((icon: string) => onValueChange(type, icon), [onValueChange, type]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <Form.Row label={label} description={t('icon.description')}>
            <IconPicker
              value={getValue()}
              onChange={handleChange}
              onReset={handleReset}
              classNames='justify-self-end'
            />
          </Form.Row>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <Form.Row label={label} description={t('hue.description')}>
            <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} classNames='justify-self-end' />
          </Form.Row>
        );
      },
    }),
    [t],
  );

  return (
    <Form.Root
      variant='settings'
      fieldMap={fieldMap}
      schema={WorkspaceSettingsSchema}
      values={values}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('folder-properties.title')}>
            <Form.FieldSet />
          </Form.Section>
          <Form.Section title={t('remove-folder.label')}>
            <Form.Row label={t('remove-folder.label')} description={t('remove-folder.description')}>
              <Button variant='destructive' onClick={handleRemove}>
                {t('remove-folder.label')}
              </Button>
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

WorkspaceSettingsContainer.displayName = 'WorkspaceSettingsContainer';
