//
// Copyright 2024 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import { useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Dialog, ScrollArea, SystemButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { useInputSurfaceLookup } from '#hooks';
import { meta } from '#meta';
import { SpaceOperation, SpaceSchema } from '#types';

import { getTemplateIcon, getTemplateIconGlyph } from '../../util/index.ts';

export const CREATE_SPACE_DIALOG = `${meta.profile.key}.CreateSpaceDialog`;

type FormValues = Schema.Schema.Type<typeof SpaceSchema.SpaceForm>;
const initialValues: FormValues = { private: false, edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.profile.key);
  const { invoke } = useOperationInvoker();

  const inputSurfaceLookup = useInputSurfaceLookup();
  const [error, setError] = useState<string | undefined>(undefined);
  const manager = usePluginManager();
  const contributed = useCapabilities(AppCapabilities.SpaceTemplate);
  const templates = useMemo(
    () =>
      contributed
        .filter(({ hidden }) => !hidden)
        // `icon` seeds the form, which stores a bare name on the space; `glyph` renders the row.
        .map((template) => ({ ...template, icon: getTemplateIcon(template), glyph: getTemplateIconGlyph(template) })),
    [contributed],
  );
  const [template, setTemplate] = useState<string | undefined>(undefined);

  useEffect(() => {
    EffectEx.runDetached(manager.activate(ActivationEvents.SpaceTemplatesRequested));
  }, [manager]);

  const handleCancel = useCallback(
    () => invoke(LayoutOperation.UpdateDialog, { state: false }).pipe(EffectEx.runAndForwardErrors),
    [invoke],
  );

  // Selecting a template seeds the fields it has an opinion about, leaving anything the user has
  // already typed alone would make the defaults unreachable — so this overwrites, and re-keys the
  // form so it re-reads them.
  const values = useMemo<FormValues>(() => {
    const selected = templates.find(({ id }) => id === template);
    return selected
      ? { ...initialValues, template: selected.id, name: selected.label, icon: selected.icon, hue: selected.hue }
      : initialValues;
  }, [templates, template]);

  const handleCreateSpace = useCallback(
    (data: FormValues) => {
      setError(undefined);
      return Effect.gen(function* () {
        const { space } = yield* invoke(SpaceOperation.Create, data);
        yield* invoke(LayoutOperation.Open, {
          subject: [GraphPath.getSpaceHomePath(space.id)],
          workspace: GraphPath.getSpacePath(space.id),
          navigation: 'immediate',
        });
        yield* invoke(LayoutOperation.UpdateDialog, { state: false });
      }).pipe(
        // `catchCause`, not `catch`: a defect (any rejected promise the create chain wraps with
        // `Effect.promise`) is invisible to `catch`, leaving the dialog open with no error shown.
        Effect.catchCause((cause) =>
          Effect.sync(() => {
            log.catch(Cause.squash(cause));
            setError(t('create-space-dialog.error.message'));
          }),
        ),
        EffectEx.runAndForwardErrors,
      );
    },
    [invoke, t],
  );

  return (
    <Dialog.Content data-testid='create-space-dialog'>
      {/* The form spans the whole dialog rather than just its body, so the action row can stay pinned
          below the scrolling fields while still reading the form's context. */}
      <Form.Root
        testId='create-space-form'
        // Re-keyed on the selection so the template's defaults replace what the form already holds.
        key={template ?? 'none'}
        schema={SpaceSchema.SpaceForm}
        defaultValues={values}
        fieldProvider={inputSurfaceLookup}
        onSave={handleCreateSpace}
        onCancel={handleCancel}
      >
        <Dialog.Header>
          <Dialog.Title>{t('create-space-dialog.title')}</Dialog.Title>
          <Dialog.CloseTrigger asChild>
            <SystemButton.Close ref={closeRef} />
          </Dialog.CloseTrigger>
        </Dialog.Header>
        <Dialog.Body>
          {/* A ScrollArea rather than Form.Viewport's own scrolling Column, which would nest a second
              gutter inside the one Dialog.Body already propagates and inset the fields twice. */}
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              <Form.Content>
                <Form.Fields layoutName={SpaceSchema.SPACE_FORM_CREATE_LAYOUT} />
                <Form.ErrorText>{error}</Form.ErrorText>
                {templates.length > 0 && (
                  <Form.FieldSet
                    aria-labelledby='create-space-templates'
                    label={t('create-space-dialog.templates.label')}
                    description={t('create-space-dialog.templates.description')}
                  >
                    <Listbox.Root
                      value={template}
                      onValueChange={setTemplate}
                      items={templates.map(({ id, label, description, glyph }) => ({
                        value: id,
                        label,
                        description,
                        icon: glyph,
                      }))}
                    >
                      <Listbox.Content classNames='my-2' aria-label={t('create-space-dialog.templates.label')}>
                        {templates.map(({ id }) => (
                          <Listbox.Item key={id} id={id} />
                        ))}
                      </Listbox.Content>
                    </Listbox.Root>
                  </Form.FieldSet>
                )}
              </Form.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Dialog.Body>
        <Dialog.Footer>
          <Form.Actions submitLabel={t('create-space-dialog.create.label')} />
        </Dialog.Footer>
      </Form.Root>
    </Dialog.Content>
  );
};

CreateSpaceDialog.displayName = 'CreateSpaceDialog';
