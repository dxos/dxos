//
// Copyright 2026 DXOS.org
//

import React, {
  type ClipboardEvent,
  type DragEvent,
  type PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { Surface, useCapabilities, useOperation, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot } from '@dxos/app-toolkit/ui';
import { type Database, Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import { Card, Column, Icon, useTranslation } from '@dxos/react-ui';
import { type File, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { TaskOperation } from '#types';

/**
 * Whether some plugin handles `FileOperation.Create`. Read from the registered handler sets rather
 * than assumed from the dependency: a host (production, mobile) may run this plugin without
 * plugin-file, and a drop it cannot store must not be offered at all.
 */
const useCanCreateFiles = (): boolean => {
  const handlerSets = useCapabilities(Capabilities.OperationHandler);
  return useMemo(
    () =>
      handlerSets.some((set) =>
        set.definitions().some((definition) => definition.meta.key === FileOperation.Create.meta.key),
      ),
    [handlerSets],
  );
};

/** A file being stored and attached, shown as a pending card until the attach settles. */
export type PendingAttachment = { id: string; name: string };

export type AttachFiles = {
  /** Undefined when no plugin can store a file. */
  onFiles?: (files: globalThis.File[]) => Promise<void>;
  pending: readonly PendingAttachment[];
};

/**
 * Stores dropped or pasted browser files as `File` objects and attaches them to the task. Each file
 * goes through `FileOperation.Create`, so the storage backend, MIME allow-list and size cap are the
 * same as any other upload's, and is attached through `TaskOperation.AddAttachment`, which logs it.
 */
export const useAttachFiles = (task: Task.Task): AttachFiles => {
  const { invokePromise } = useOperationInvoker();
  const canCreateFiles = useCanCreateFiles();
  const [pending, setPending] = useState<readonly PendingAttachment[]>([]);
  const nextId = useRef(0);

  const attachOne = useCallback(
    async (db: Database.Database, file: globalThis.File) => {
      const { data, error } = await invokePromise(FileOperation.Create, { db, file });
      if (error || !data) {
        log.warn('attachment rejected', { name: file.name, type: file.type, error });
        return;
      }

      const object = db.add(data.object);
      const { error: attachError } = await invokePromise(
        TaskOperation.AddAttachment,
        { task: Ref.make(task), file: Ref.make(object) },
        { spaceId: db.spaceId },
      );
      if (attachError) {
        // Nothing references the stored file once the attach fails, so it would linger unowned.
        db.remove(object);
        log.warn('attachment failed', { name: file.name, error: attachError });
      }
    },
    [invokePromise, task],
  );

  const attach = useCallback(
    async (files: globalThis.File[]) => {
      const db = Obj.getDatabase(task);
      if (!db) {
        return;
      }

      const entries = files.map((file) => ({ id: String(nextId.current++), name: file.name, file }));
      setPending((current) => [...current, ...entries.map(({ id, name }) => ({ id, name }))]);
      for (const { id, file } of entries) {
        try {
          await attachOne(db, file);
        } finally {
          setPending((current) => current.filter((entry) => entry.id !== id));
        }
      }
    },
    [attachOne, task],
  );

  return { onFiles: canCreateFiles ? attach : undefined, pending };
};

/** Whether a drag carries files from outside the page, rather than an element dragged within it. */
const isFileDrag = (event: DragEvent): boolean => Array.from(event.dataTransfer.types).includes('Files');

export type TaskAttachmentDropZoneProps = PropsWithChildren<{
  /** Omitted when files cannot be stored: the zone then neither shows nor takes a drop or paste. */
  onFiles?: (files: globalThis.File[]) => void;
}>;

/**
 * Accepts files dropped or pasted anywhere over the task. Handled in the capture phase because the
 * description editor would otherwise take a dropped file and insert its bytes as text. The wrapper
 * renders either way, so the editor inside is not remounted when file support arrives.
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
      if (onFiles && files.length > 0) {
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
      if (onFiles && files.length > 0 && !event.clipboardData.types.includes('text/plain')) {
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
      {...(onFiles && {
        'data-testid': 'tasksPlugin.attachments.dropZone',
        'onDragEnterCapture': handleDragEnter,
        'onDragLeaveCapture': handleDragLeave,
        'onDragOverCapture': handleDragOver,
        'onDropCapture': handleDrop,
        'onPasteCapture': handlePaste,
      })}
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
  /** Omitted when files cannot be stored: the drop area is then not offered. */
  canAttach?: boolean;
  pending?: readonly PendingAttachment[];
};

/**
 * The files attached to a task (`Task.attachments`), each as a card whose body is the file's own
 * `CardContent` surface — so an image previews as an image — followed by a card per file still
 * uploading and a standing drop area. Renders nothing only when there is nothing attached and
 * nothing could be.
 */
export const TaskAttachments = ({ task, canAttach, pending = [] }: TaskAttachmentsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [refs] = useObject(task, 'attachments');

  const handleRemove = useOperation(
    TaskOperation.RemoveAttachment,
    (file: Ref.Ref<File.File>) => ({ task: Ref.make(task), file }),
    { spaceId: Obj.getDatabase(task)?.spaceId },
  );

  const hasCards = (refs?.length ?? 0) > 0 || pending.length > 0;
  if (!canAttach && !hasCards) {
    return null;
  }

  return (
    // A section of the pane's column, headed like the questions and artifacts around it.
    <Column.Section label={t('task-attachments.label')} data-testid='tasksPlugin.attachments'>
      {hasCards && (
        <div className='grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2'>
          {refs?.map((ref) => (
            <AttachmentCard key={ref.uri} attachment={ref} onRemove={handleRemove} />
          ))}
          {pending.map((entry) => (
            <PendingAttachmentCard key={entry.id} name={entry.name} />
          ))}
        </div>
      )}
      {canAttach && (
        // A visible target only: the drop and paste themselves are taken by the pane-wide zone.
        <div
          className={mx(
            'flex items-center justify-center gap-2 p-4',
            'rounded-md border-2 border-dashed border-separator text-description',
          )}
          data-testid='tasksPlugin.attachments.dropArea'
        >
          <Icon icon='ph--paperclip--regular' />
          {t('task-attachments.drop-area.label')}
        </div>
      )}
    </Column.Section>
  );
};

/** A file still being stored and attached. */
const PendingAttachmentCard = ({ name }: { name: string }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Card.Root fullWidth data-testid='tasksPlugin.attachment.pending' aria-busy='true'>
      <Card.Header>
        <Card.Block>
          <Icon icon='ph--spinner-gap--regular' classNames='animate-spin' />
        </Card.Block>
        <Card.Title classNames='truncate'>{name}</Card.Title>
      </Card.Header>
      <Card.Text variant='description'>{t('task-attachment.uploading.label')}</Card.Text>
    </Card.Root>
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
