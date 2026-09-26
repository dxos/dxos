//
// Copyright 2026 DXOS.org
//

import React, {
  type ClipboardEvent,
  type DragEvent,
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
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
import { Masonry } from '@dxos/react-ui-masonry';
import { type File, Task } from '@dxos/types';
import { cardMaxInlineSize, cardMinInlineSize, mx } from '@dxos/ui-theme';

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

/** Removes an attachment; read by the masonry tiles, whose props are fixed to the tile signature. */
const RemoveAttachmentContext = createContext<((ref: Ref.Ref<File.File>) => void) | undefined>(undefined);

/** Whether files are being dragged over the pane, so the attachments section can mark its target. */
const FileDragContext = createContext(false);

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
      className='flex flex-col min-h-full'
      {...(onFiles && {
        'data-testid': 'tasksPlugin.attachments.dropZone',
        'onDragEnterCapture': handleDragEnter,
        'onDragLeaveCapture': handleDragLeave,
        'onDragOverCapture': handleDragOver,
        'onDropCapture': handleDrop,
        'onPasteCapture': handlePaste,
      })}
    >
      <FileDragContext.Provider value={over}>{children}</FileDragContext.Provider>
    </div>
  );
};

export type TaskAttachmentsProps = {
  task: Task.Task;
  /** Omitted when files cannot be stored: the drop area is then not offered. */
  canAttach?: boolean;
  pending?: readonly PendingAttachment[];
};

const ATTACHMENT_SCALE = 0.75;

type AttachmentTileData = { kind: 'file'; ref: Ref.Ref<File.File> } | { kind: 'pending'; entry: PendingAttachment };

/**
 * The files attached to a task (`Task.attachments`) as cards in a masonry, the same grid as the
 * task's artifacts, each with the file's own `CardContent` surface as its body — so an image
 * previews as an image — followed by a card per file still uploading. With nothing attached the
 * section is a drop area; with cards, the grid itself is the target. Either is marked while files
 * are dragged over the pane, which takes the drop itself. Renders nothing only when there is
 * nothing attached and nothing could be.
 */
export const TaskAttachments = ({ task, canAttach, pending = [] }: TaskAttachmentsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [refs] = useObject(task, 'attachments');
  const dragging = useContext(FileDragContext);

  const handleRemove = useOperation(
    TaskOperation.RemoveAttachment,
    (file: Ref.Ref<File.File>) => ({ task: Ref.make(task), file }),
    { spaceId: Obj.getDatabase(task)?.spaceId },
  );

  const items = useMemo<AttachmentTileData[]>(
    () => [
      ...(refs ?? []).map((ref) => ({ kind: 'file' as const, ref })),
      ...pending.map((entry) => ({ kind: 'pending' as const, entry })),
    ],
    [refs, pending],
  );

  const hasCards = items.length > 0;
  if (!canAttach && !hasCards) {
    return null;
  }

  return (
    // A section of the pane's column, headed like the questions and artifacts around it.
    <Column.Section label={t('task-attachments.label')} data-testid='tasksPlugin.attachments'>
      <div
        className={mx(
          'rounded-md border-2 border-dashed',
          dragging ? 'border-accent-bg' : hasCards ? 'border-transparent' : 'border-separator',
          hasCards
            ? // Outset by the border and padding so the cards sit on the column's content track.
              '-m-1.5 p-1'
            : 'flex items-center justify-center gap-2 p-4 text-description',
        )}
        {...(canAttach && { 'data-testid': 'tasksPlugin.attachments.dropArea' })}
      >
        {hasCards ? (
          <RemoveAttachmentContext.Provider value={handleRemove}>
            <Masonry.Root
              Tile={AttachmentTile}
              centered={false}
              // Three quarters of a standard card: attachments are smaller than the artifacts' cards.
              minColumnWidth={cardMinInlineSize * ATTACHMENT_SCALE}
              maxColumnWidth={cardMaxInlineSize * ATTACHMENT_SCALE}
            >
              {/* The pane already scrolls, so the grid is a plain block rather than a nested, padded scroller. */}
              <Masonry.Viewport
                items={items}
                getId={getAttachmentTileId}
                cacheKey={Obj.getURI(task).toString()}
                scroll={false}
                // The masonry pads its top and bottom by the gap, which the section's own spacing already gives;
                // three quarters of the width keeps attachment cards smaller than the artifacts'.
                classNames='-my-3'
              />
            </Masonry.Root>
          </RemoveAttachmentContext.Provider>
        ) : (
          <>
            <Icon icon='ph--paperclip--regular' />
            {t('task-attachments.drop-area.label')}
          </>
        )}
      </div>
    </Column.Section>
  );
};

const getAttachmentTileId = (item: AttachmentTileData): string =>
  item.kind === 'file' ? item.ref.uri : `pending:${item.entry.id}`;

const AttachmentTile = ({ data }: { data: AttachmentTileData }) =>
  data.kind === 'file' ? <AttachmentCard attachment={data.ref} /> : <PendingAttachmentCard name={data.entry.name} />;

/** A file still being stored and attached: its header alone, the title saying so. */
const PendingAttachmentCard = ({ name }: { name: string }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Card.Root fullWidth data-testid='tasksPlugin.attachment.pending' aria-busy='true'>
      <Card.Header>
        <Card.Block>
          <Icon icon='ph--spinner-gap--regular' classNames='animate-spin' />
        </Card.Block>
        <Card.Title classNames='truncate text-description'>{t('task-attachment.uploading.label', { name })}</Card.Title>
      </Card.Header>
    </Card.Root>
  );
};

/** One attachment, resolved by the card itself so a file that replicates in later still appears. */
const AttachmentCard = ({ attachment }: { attachment: Ref.Ref<File.File> }) => {
  const { t } = useTranslation(meta.profile.key);
  const onRemove = useContext(RemoveAttachmentContext);
  const [file] = useObject(attachment);
  const data = useMemo(() => (file ? { subject: file } : undefined), [file]);
  if (!file || !data) {
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
        {onRemove && (
          <Card.ActionIconButton
            action='delete'
            label={t('task-attachment.remove.label')}
            onClick={() => onRemove(attachment)}
          />
        )}
      </Card.Header>
      <Card.Body>
        <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
      </Card.Body>
    </Card.Root>
  );
};
