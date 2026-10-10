//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { log } from '@dxos/log';
import { type FormFieldRendererProps, FormFieldRow, TextField } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';
import { GenerationService } from '#types';

/**
 * The upload options of a request field marked with {@link GenerationService.FileUrlAnnotation}, if
 * any. An optional field is a union with `undefined`; the annotated string is one of its members.
 */
export const fileUrlOptions = (field: Schema.Top): GenerationService.FileUrlOptions | undefined => {
  const direct = Option.getOrUndefined(GenerationService.FileUrlAnnotation.get(field));
  if (direct || !SchemaAST.isUnion(field.ast)) {
    return direct;
  }
  for (const member of field.ast.types) {
    const found = Option.getOrUndefined(GenerationService.FileUrlAnnotation.get(Schema.make(member)));
    if (found) {
      return found;
    }
  }
  return undefined;
};

export type FileUrlFieldProps = FormFieldRendererProps & { accept?: string };

/**
 * A URL request field with an Upload control: the file goes through the app's `FileUploader` (the
 * file plugin's blob store) and its URL becomes the field's value, so a provider that takes a URL
 * can be handed a local image.
 */
export const FileUrlField = ({ accept, ...props }: FileUrlFieldProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const space = ToolkitHooks.useActiveSpace();
  const [upload] = Hooks.useCapabilities(AppCapabilities.FileUploader);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const db = space?.db;
      if (!db || !upload) {
        return;
      }
      setUploading(true);
      try {
        const info = await upload(db, file);
        if (info?.url) {
          props.onValueChange(props.type, info.url);
        }
      } catch (error) {
        log.catch(error);
      } finally {
        setUploading(false);
      }
    },
    [space?.db, upload, props.onValueChange, props.type],
  );

  return (
    <FormFieldRow
      label={props.label}
      description={props.description}
      error={props.getStatus().error}
      required={props.required}
      readonly={props.readonly}
      presentation={props.presentation}
    >
      {/* The row's control slot holds one node: the input and its upload button side by side. */}
      <Layout.Flex classNames='items-center gap-1'>
        <TextField {...props} />
        <Button.Root
          variant='ghost'
          disabled={!!props.readonly || !upload || !space || uploading}
          icon={uploading ? 'ph--spinner-gap--regular' : 'ph--upload-simple--regular'}
          iconClassNames={uploading ? 'animate-spin' : undefined}
          label={t('upload-file.label')}
          iconOnly
          onClick={() => inputRef.current?.click()}
        />
      </Layout.Flex>
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        // Opened by the labelled button; out of the tab order so it is not an unlabelled focus stop.
        className='sr-only'
        tabIndex={-1}
        aria-hidden='true'
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          // Reset so picking the same file again fires onChange.
          event.target.value = '';
        }}
      />
    </FormFieldRow>
  );
};

FileUrlField.displayName = 'FileUrlField';
