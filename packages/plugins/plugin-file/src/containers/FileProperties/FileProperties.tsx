//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Blob, Database, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { File } from '@dxos/types';

import { meta } from '#meta';

export type FilePropertiesProps = AppSurface.ObjectPropertiesProps<File.File>;

/**
 * Properties for a {@link File}: where its bytes actually live.
 *
 * Two values, because they answer different questions and have different lifetimes. The **reference**
 * is the stored URI — `s3://<bucket>/<space>/<hash>` or `ni:///sha-256;…` — which names the backend
 * and survives forever; it is what to quote when asking "where did this go?". The **URL** is what a
 * browser can fetch right now, and for a private bucket that is a presigned URL which expires, hence
 * the regenerate control rather than a value presented as permanent.
 */
export const FileProperties = ({ subject: file }: FilePropertiesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [reference, setReference] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  const resolve = useCallback(async () => {
    const db = Obj.getDatabase(file);
    if (!db) {
      return;
    }

    setPending(true);
    const program = Effect.gen(function* () {
      const blob = yield* Database.load(file.data);
      const urlOption = yield* Blob.url(blob);
      return {
        // `inline` blobs carry bytes rather than a URI; there is no reference to show.
        reference: blob.data._tag === 'external' ? blob.data.uri : undefined,
        url: Option.getOrUndefined(urlOption),
      };
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.catch(() => Effect.succeed(undefined)),
    );

    const result = await EffectEx.runPromise(program);
    setReference(result?.reference);
    setUrl(result?.url);
    setPending(false);
  }, [file]);

  // Keyed on `file.id`, not `file.data`: ECHO's proxy returns a fresh `Ref` wrapper on every access,
  // so depending on the ref itself would re-resolve on every render.
  useEffect(() => {
    void resolve();
  }, [file.id]);

  if (!reference && !url) {
    return null;
  }

  return (
    <Form.FieldSet>
      {reference && (
        <Field.Root>
          <Field.Label>{t('properties.reference.label')}</Field.Label>
          <div className='flex w-full gap-1'>
            <Input.Input readOnly value={reference} classNames='grow' />
            <SystemButton.Clipboard iconOnly value={reference} label={t('properties.reference.copy.label')} />
          </div>
        </Field.Root>
      )}
      {url && (
        <Field.Root>
          <Field.Label>{t('properties.url.label')}</Field.Label>
          <div className='flex w-full gap-1'>
            <Input.Input readOnly value={url} classNames='grow' />
            <SystemButton.Clipboard iconOnly value={url} label={t('properties.url.copy.label')} />
            <Button.Button
              iconOnly
              icon='ph--arrows-clockwise--regular'
              label={t('properties.url.regenerate.label')}
              disabled={pending}
              onClick={() => void resolve()}
            />
          </div>
          <Field.HelperText>{t('properties.url.description')}</Field.HelperText>
        </Field.Root>
      )}
    </Form.FieldSet>
  );
};

FileProperties.displayName = 'FileProperties';
