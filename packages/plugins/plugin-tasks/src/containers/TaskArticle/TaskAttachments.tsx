//
// Copyright 2026 DXOS.org
//

import React, {
  type ClipboardEvent,
  type DragEvent,
  type PropsWithChildren,
  useCallback,
  useRef,
  useState,
} from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot } from '@dxos/app-toolkit/ui';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import { Card, Icon, useTranslation } from '@dxos/react-ui';
import { type File, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/**
 * Stores dropped or pasted browser files as `File` objects and attaches them to the task. Each file
 * goes through `FileOperation.Create`, so the storage backend, MIME allow-list and size cap are the
 * same as any other upload's.
 */
export const useAttachFiles = (task: Task.Task): ((files: globalThis.File[]) => Promise<void>) => {
  const { invokePromise } = useOperationInvoker();
  return useCallback(
    async (files: globalThis.File[]) => {
      const db = Obj.getDatabase(task);
      if (!db) {
        return;
      }

      for (const file of files) {
        const { data, error } = await invokePromise(FileOperation.Create, { db, file });
        if (error || !data) {
          log.warn('attachment rejected', { name: file.name, type: file.type, error });
          continue;
        }

        db.add(data.object);
        Task.addAttachment(task, data.object);
      }
    },
    [invokePromise, task],
  );
};

/** Whether a drag carries files from outside the page, rather than an element dragged within it. */
const isFileDrag = (event: DragEvent): boolean => Array.from(event.dataTransfer.types).includes('Files');

export type TaskAttachmentDropZoneProps = PropsWithChildren<{
  onFiles: (files: globalThis.File[]) => void;
}>;

/**
 * Accepts files dropped or pasted anywhere over the task. Handled in the capture phase because the
 * description editor would otherwise take a dropped file and insert its bytes as text.
 */
export const TaskAttachmentDropZone = ({ onFiles, children }: TaskAttachmentDropZoneProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [over, setOver] = useState(false);
  // Counted because `dragleave` fires on every child the pointer crosses, not only on leaving the zone.
  const depth = useRef(0);

  const handleDragEnter = useCallback((event: DragEvent) => {
    if (isFileDrag(event)) {
      depth.current++;
      setOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    if (isFileDrag(event) && --depth.current <= 0) {
      depth.current = 0;
      setOver(false);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent) => {
    if (isFileDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      depth.current = 0;
      setOver(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        onFiles(files);
      }
    },
    [onFiles],
  );

  // Only a paste that is nothing but files: a paste carrying text as well belongs to the field.
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData.files);
      if (files.length > 0 && !event.clipboardData.types.includes('text/plain')) {
        event.preventDefault();
        event.stopPropagation();
        onFiles(files);
      }
    },
    [onFiles],
  );

  return (
    <div
      className='relative flex flex-col min-h-full'
      data-testid='tasksPlugin.attachments.dropZone'
      onDragEnterCapture={handleDragEnter}
      onDragLeaveCapture={handleDragLeave}
      onDragOverCapture={handleDragOver}
      onDropCapture={handleDrop}
      onPasteCapture={handlePaste}
    >
      {children}
      {over && (
        <div
          className={mx(
            'absolute inset-1 z-10 pointer-events-none flex items-center justify-center gap-2',
            'rounded-md border-2 border-dashed border-accent-bg bg-base-surface/70 backdrop-blur-sm text-description',
          )}
        >
          <Icon icon='ph--paperclip--regular' />
          {t('task-attachments.drop.label')}
        </div>
      )}
    </div>
  );
};

export type TaskAttachmentsProps = {
  task: Task.Task;
};

/**
 * The files attached to a task (`Task.attachments`), each as a card whose body is the file's own
 * `CardContent` surface — so an image previews as an image. Renders nothing when empty.
 */
export const TaskAttachments = ({ task }: TaskAttachmentsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [refs] = useObject(task, 'attachments');

  // The file is owned by the task, so detaching it is deleting it; the ref goes first so the list
  // never points at a removed object.
  const handleRemove = useCallback(
    (ref: Ref.Ref<File.File>) => {
      const file = ref.target;
      Task.removeAttachment(task, ref);
      if (file) {
        Obj.getDatabase(file)?.remove(file);
      }
    },
    [task],
  );

  if (!refs || refs.length === 0) {
    return null;
  }

  return (
    <section className='flex flex-col gap-2 p-2' data-testid='tasksPlugin.attachments'>
      <h2 className='text-sm text-subdued'>{t('task-attachments.label')}</h2>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2'>
        {refs.map((ref) => (
          <AttachmentCard key={ref.uri} attachment={ref} onRemove={handleRemove} />
        ))}
      </div>
    </section>
  );
};

/** One attachment, resolved by the card itself so a file that replicates in later still appears. */
const AttachmentCard = ({
  attachment,
  onRemove,
}: {
  attachment: Ref.Ref<File.File>;
  onRemove: (ref: Ref.Ref<File.File>) => void;
}) => {
  const { t } = useTranslation(meta.profile.key);
  const [file] = useObject(attachment);
  if (!file) {
    return null;
  }

  const icon = Obj.getIcon(file)?.icon ?? 'ph--file--regular';
  return (
    <Card.Root fullWidth data-testid='tasksPlugin.attachment'>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={file}>
            <Icon icon={icon} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title classNames='truncate'>{file.name ?? file.id}</Card.Title>
        <Card.ActionIconButton
          action='delete'
          label={t('task-attachment.remove.label')}
          onClick={() => onRemove(attachment)}
        />
      </Card.Header>
      <Surface.Surface type={AppSurface.CardContent} data={{ subject: file }} limit={1} />
    </Card.Root>
  );
};
