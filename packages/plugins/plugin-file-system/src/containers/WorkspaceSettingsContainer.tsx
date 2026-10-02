//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Form, type FormFieldMap } from '@dxos/react-ui-form';
import { HuePicker, IconPicker } from '@dxos/react-ui-pickers';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { useActiveFileSystemWorkspace } from '#hooks';
import { meta } from '#meta';
import { FileSystemCapabilities, FileSystemOperation } from '#types';

import { writeComposerConfig } from '../util.ts';

const WorkspaceSettingsSchema = Schema.Struct({
  icon: Schema.optional(Schema.String).annotate({ title: 'Icon' }),
  hue: Schema.optional(Schema.String).annotate({ title: 'Color' }),
});

/** Renders nothing until a filesystem workspace is active; the workspace comes from context. */
export const WorkspaceSettingsContainer = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const client = useClient();
  const workspace = useActiveFileSystemWorkspace();
  const [, updateState] = AppHooks.useAtomCapabilityState(FileSystemCapabilities.State);

  const values = useMemo(
    () => ({
      icon: workspace?.icon,
      hue: workspace?.hue,
    }),
    [workspace?.icon, workspace?.hue],
  );

  const handleValuesChanged = useCallback(
    (
      newValues: Partial<Schema.Schema.Type<typeof WorkspaceSettingsSchema>>,
      valueMeta: { changed?: Record<string, boolean> },
    ) => {
      const changed = valueMeta.changed ?? {};
      if (!workspace || (!changed['icon'] && !changed['hue'])) {
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
    if (!workspace) {
      return;
    }

    await invokePromise(FileSystemOperation.CloseDirectory, { id: workspace.id });
    const defaultSpaceId = AppSpace.getDefaultSpace(client)?.id;
    if (defaultSpaceId) {
      await invokePromise(LayoutOperation.SwitchWorkspace, {
        subject: GraphPath.getSpacePath(defaultSpaceId),
      });
    }
  }, [workspace, invokePromise, client]);

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      icon: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((icon: string) => onValueChange(type, icon), [onValueChange, type]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <Form.Field standalone label={label} description={t('icon.description')}>
            <IconPicker
              value={getValue()}
              onChange={handleChange}
              onReset={handleReset}
              classNames='justify-self-end'
            />
          </Form.Field>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleReset = useCallback(() => onValueChange(type, undefined), [onValueChange, type]);
        return (
          <Form.Field standalone label={label} description={t('hue.description')}>
            <HuePicker value={getValue()} onChange={handleChange} onReset={handleReset} classNames='justify-self-end' />
          </Form.Field>
        );
      },
    }),
    [t],
  );

  if (!workspace) {
    return null;
  }

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
          <Form.FieldSet label={t('folder-properties.title')}>
            <Form.Fields />
          </Form.FieldSet>
          <Form.FieldSet label={t('remove-folder.label')}>
            <Form.Field standalone label={t('remove-folder.label')} description={t('remove-folder.description')}>
              <Button.Root variant='destructive' onClick={handleRemove}>
                {t('remove-folder.label')}
              </Button.Root>
            </Form.Field>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

WorkspaceSettingsContainer.displayName = 'WorkspaceSettingsContainer';
