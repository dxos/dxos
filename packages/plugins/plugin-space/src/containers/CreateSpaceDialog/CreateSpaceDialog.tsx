//
// Copyright 2024 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Column, Dialog, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { useInputSurfaceLookup } from '#hooks';
import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation, SpaceSchema } from '#types';

export const CREATE_SPACE_DIALOG = `${meta.profile.key}.CreateSpaceDialog`;

type FormValues = Schema.Schema.Type<typeof SpaceSchema.SpaceForm>;
const initialValues: FormValues = { private: false, edgeReplication: true };

export const CreateSpaceDialog = () => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { t } = useTranslation(meta.profile.key);
  const { invoke } = useOperationInvoker();

  const inputSurfaceLookup = useInputSurfaceLookup();
  const [error, setError] = useState<string | undefined>(undefined);
  const templates = useCapabilities(SpaceCapabilities.SpaceTemplate);
  const [template, setTemplate] = useState<string | undefined>(undefined);

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
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('create-space-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <Form.Root
          testId='create-space-form'
          autoFocus
          // Re-keyed on the selection so the template's defaults replace what the form already holds.
          key={template ?? 'none'}
          schema={SpaceSchema.SpaceForm}
          defaultValues={values}
          fieldProvider={inputSurfaceLookup}
          onSave={handleCreateSpace}
        >
          {/* Dialog.Body owns the gutter Column; place the form in its center column via Column.Center
              (not Form.Viewport's own Column.Root, which double-insets) so it aligns with the title. */}
          <Column.Center>
            <Form.Content>
              <Form.FieldSet />
              <Form.Error>{error}</Form.Error>
              {templates.length > 0 && (
                <div role='group' aria-labelledby='create-space-templates'>
                  <h3 id='create-space-templates' className='my-1 text-sm text-subdued'>
                    {t('create-space-dialog.templates.label')}
                  </h3>
                  <Listbox.Root value={template} onValueChange={setTemplate}>
                    <Listbox.Content aria-labelledby='create-space-templates'>
                      {templates.map(({ id, label, description, icon }) => (
                        <Listbox.Item key={id} id={id}>
                          <Listbox.ItemContent
                            icon={icon ?? 'ph--placeholder--regular'}
                            title={label}
                            description={description}
                          />
                        </Listbox.Item>
                      ))}
                    </Listbox.Content>
                  </Listbox.Root>
                </div>
              )}
              <Form.Submit />
            </Form.Content>
          </Column.Center>
        </Form.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

CreateSpaceDialog.displayName = 'CreateSpaceDialog';
