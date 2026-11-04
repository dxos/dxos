//
// Copyright 2026 DXOS.org
//

import React, { type ClipboardEvent, type DragEvent, useCallback, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { type InputImage } from '../../client/types.ts';
import { LighthouseNamespace } from '../../namespace.ts';

/** An image picked for the next input: its bytes as a data URL, sent as base64. */
export type Attachment = { id: string; name: string; type: string; dataUrl: string; bytes: number };

export const MAX_IMAGES = 4;
const MAX_BYTES = 15_000_000;

const read = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export type Attachments = ReturnType<typeof useAttachments>;

/**
 * Images for a prompt: attach (a file picker), paste, or drop onto the form. At most 4, each up to 15 MB; anything
 * that is not an image is ignored (lighthouse web ImageAttach).
 */
export const useAttachments = () => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [images, setImages] = useState<Attachment[]>([]);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useCallback(
    async (files: Iterable<File>) => {
      const picked = [...files].filter((file) => file.type.startsWith('image/'));
      if (!picked.length) {
        return;
      }
      setError(undefined);
      const next: Attachment[] = [];
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          setError(t('attach-too-big.message', { name: file.name }));
          continue;
        }
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          name: file.name || 'pasted image',
          type: file.type,
          dataUrl: await read(file),
          bytes: file.size,
        });
      }
      setImages((previous) => {
        const all = [...previous, ...next];
        if (all.length > MAX_IMAGES) {
          setError(t('attach-too-many.message', { count: MAX_IMAGES }));
        }
        return all.slice(0, MAX_IMAGES);
      });
    },
    [t],
  );

  const remove = useCallback((id: string) => setImages((previous) => previous.filter((image) => image.id !== id)), []);
  const clear = useCallback(() => {
    setImages([]);
    setError(undefined);
  }, []);

  /** Handlers for the form that takes drops and pastes. */
  const dropTarget = useMemo(
    () => ({
      onDragOver: (event: DragEvent) => {
        if ([...event.dataTransfer.items].some((item) => item.kind === 'file')) {
          event.preventDefault();
          setDragging(true);
        }
      },
      onDragLeave: () => setDragging(false),
      onDrop: (event: DragEvent) => {
        setDragging(false);
        if (!event.dataTransfer.files.length) {
          return;
        }
        event.preventDefault();
        void add(event.dataTransfer.files);
      },
      onPaste: (event: ClipboardEvent) => {
        const files = [...event.clipboardData.files];
        if (files.some((file) => file.type.startsWith('image/'))) {
          event.preventDefault();
          void add(files);
        }
      },
    }),
    [add],
  );

  /** The images as the API takes them. */
  const payload = useCallback(
    (): InputImage[] => images.map((image) => ({ data: image.dataUrl, type: image.type, name: image.name })),
    [images],
  );

  return { images, error, dragging, add, remove, clear, dropTarget, inputRef, payload };
};

/** The attach button and its hidden file input. */
export const AttachButton = ({ attachments, disabled }: { attachments: Attachments; disabled?: boolean }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  return (
    <>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--image--regular'
        label={t('attach.label')}
        disabled={disabled || attachments.images.length >= MAX_IMAGES}
        onClick={() => attachments.inputRef.current?.click()}
        data-testid='lighthouse.attach'
      />
      <input
        ref={attachments.inputRef}
        type='file'
        accept='image/*'
        multiple
        hidden
        data-testid='lighthouse.attach.input'
        onChange={(event) => {
          if (event.target.files) {
            void attachments.add(event.target.files);
          }
          event.target.value = '';
        }}
      />
    </>
  );
};

/** Thumbnails of the images that go with the next input, each removable. */
export const AttachmentStrip = ({ attachments }: { attachments: Attachments }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  if (!attachments.images.length && !attachments.error) {
    return null;
  }
  return (
    <Layout.Flex gap='sm' align='center' wrap classNames='px-trim-md pt-2' data-testid='lighthouse.attachments'>
      {attachments.images.map((image) => (
        <figure key={image.id} className='relative m-0 size-14 shrink-0' title={image.name}>
          <img
            src={image.dataUrl}
            alt={image.name}
            className='size-14 object-cover rounded-sm border border-separator'
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--x--bold'
            label={t('attach-remove.label', { name: image.name })}
            classNames='absolute -top-1.5 -right-1.5 size-5 min-h-0 p-0 rounded-full bg-base-surface'
            onClick={() => attachments.remove(image.id)}
          />
        </figure>
      ))}
      {attachments.error && <span className='text-error-text text-xs'>{attachments.error}</span>}
    </Layout.Flex>
  );
};
