//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Clipboard, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
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
  const { t } = useTranslation(meta.profile.key);
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
    // Its own provider: `useClipboard` falls back to a no-op context, so a copy button outside one
    // fails silently rather than visibly.
    <Clipboard.Provider>
      <Form.Section>
        {reference && (
          <Input.Root>
            <Input.Label>{t('properties.reference.label')}</Input.Label>
            <div className='flex w-full gap-1'>
              <Input.TextInput readOnly value={reference} classNames='grow' />
              <Clipboard.IconButton value={reference} label={t('properties.reference.copy.label')} />
            </div>
          </Input.Root>
        )}
        {url && (
          <Input.Root>
            <Input.Label>{t('properties.url.label')}</Input.Label>
            <div className='flex w-full gap-1'>
              <Input.TextInput readOnly value={url} classNames='grow' />
              <Clipboard.IconButton value={url} label={t('properties.url.copy.label')} />
              <IconButton
                iconOnly
                icon='ph--arrows-clockwise--regular'
                label={t('properties.url.regenerate.label')}
                disabled={pending}
                onClick={() => void resolve()}
              />
            </div>
            <Input.DescriptionAndValidation>
              <Input.Description>{t('properties.url.description')}</Input.Description>
            </Input.DescriptionAndValidation>
          </Input.Root>
        )}
      </Form.Section>
    </Clipboard.Provider>
  );
};

FileProperties.displayName = 'FileProperties';
