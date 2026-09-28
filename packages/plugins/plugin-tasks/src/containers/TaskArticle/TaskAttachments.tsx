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
import { useCapabilities, useOperation, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import { CardMasonry } from '@dxos/plugin-space/components';
import { Column, Icon, useTranslation } from '@dxos/react-ui';
import { createMenuAction, useMenuContribution } from '@dxos/react-ui-menu';
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

/** Stores one browser file and attaches it to a task; resolves to whether it is now attached. */
export type AttachFile = (task: Task.Task, file: globalThis.File) => Promise<boolean>;

/**
 * Stores a browser file as a `File` object and attaches it to a task. The file goes through
 * `FileOperation.Create`, so the storage backend, MIME allow-list and size cap are the same as any
 * other upload's, and is attached through `TaskOperation.AddAttachment`, which logs it. Undefined
 * when no plugin can store a file.
 */
export const useAttachFile = (): AttachFile | undefined => {
  const { invokePromise } = useOperationInvoker();
  const canCreateFiles = useCanCreateFiles();

  const attachOne = useCallback<AttachFile>(
    async (task, file) => {
      const db = Obj.getDatabase(task);
      if (!db) {
        return false;
      }

      const { data, error } = await invokePromise(FileOperation.Create, { db, file });
      if (error || !data) {
        log.warn('attachment rejected', { name: file.name, type: file.type, error });
        return false;
      }

      const object = db.add(data.object);
      const { error: attachError } = await invokePromise(
        TaskOperation.AddAttachment,
        { task: Ref.make(task), file: Ref.make(object) },
        { spaceId: db.spaceId },
      );
      if (attachError) {
        // Removed only while nothing references it: a failure after the attach (the flush) leaves the
        // task holding the file, and removing it then would leave the task pointing at nothing.
        if (!(task.attachments ?? []).some((ref) => Task.refEntityId(ref) === object.id)) {
          db.remove(object);
        }
        log.warn('attachment failed', { name: file.name, error: attachError });
        return false;
      }
      return true;
    },
    [invokePromise],
  );

  return canCreateFiles ? attachOne : undefined;
};

/**
 * Stores dropped or pasted browser files and attaches them to the task (see {@link useAttachFile}),
 * tracking each as pending until it settles.
 */
export const useAttachFiles = (task: Task.Task): AttachFiles => {
  const attachOne = useAttachFile();
  const [pending, setPending] = useState<readonly PendingAttachment[]>([]);
  const nextId = useRef(0);

  const attach = useCallback(
    async (files: globalThis.File[]) => {
      if (!attachOne) {
        return;
      }

      const entries = files.map((file) => ({ id: String(nextId.current++), name: file.name, file }));
      setPending((current) => [...current, ...entries.map(({ id, name }) => ({ id, name }))]);
      for (const { id, file } of entries) {
        try {
          await attachOne(task, file);
        } finally {
          setPending((current) => current.filter((entry) => entry.id !== id));
        }
      }
    },
    [attachOne, task],
  );

  return { onFiles: attachOne ? attach : undefined, pending };
};

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

/**
 * The files attached to a task (`Task.attachments`) as compact cards, the same grid as the task's
 * artifacts, each with the file's own `CardContent` surface as its body — so an image previews as an
 * image — followed by a placeholder per file still uploading. With nothing attached the section is a
 * drop area; with cards, the grid itself is the target. Either is marked while files are dragged
 * over the pane, which takes the drop itself. Renders nothing only when there is nothing attached
 * and nothing could be.
 */
export const TaskAttachments = ({ task, canAttach, pending = [] }: TaskAttachmentsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [refs] = useObject(task, 'attachments');
  const dragging = useContext(FileDragContext);

  const removeAttachment = useOperation(
    TaskOperation.RemoveAttachment,
    (file: Ref.Ref<File.File>) => ({ task: Ref.make(task), file }),
    { spaceId: Obj.getDatabase(task)?.spaceId },
  );
  // A card's menu names the object it shows; the task's own ref to it is the typed one the operation takes.
  const handleRemove = useCallback(
    (object: Obj.Unknown) => {
      const attachment = refs?.find((ref) => ref.target?.id === object.id);
      if (attachment) {
        removeAttachment(attachment);
      }
    },
    [refs, removeAttachment],
  );

  const placeholders = useMemo(
    () => pending.map(({ id, name }) => ({ id, label: t('task-attachment.uploading.label', { name }) })),
    [pending, t],
  );

  const hasCards = (refs?.length ?? 0) > 0 || pending.length > 0;
  if (!canAttach && !hasCards) {
    return null;
  }

  return (
    // A section of the pane's column, headed like the questions and artifacts around it.
    <Column.Section label={t('task-attachments.label')} data-testid='tasksPlugin.attachments'>
      <div
        className={mx(
          'rounded-md border border-dashed',
          dragging ? 'border-accent-bg' : hasCards ? 'border-transparent' : 'border-separator',
          hasCards
            ? // Outset by the border and padding so the cards sit on the column's content track.
              '-m-1.5 p-1'
            : 'flex items-center justify-center gap-2 p-trim-sm text-description',
        )}
        {...(canAttach && { 'data-testid': 'tasksPlugin.attachments.dropArea' })}
      >
        {hasCards ? (
          <RemoveAttachmentContext.Provider value={handleRemove}>
            <CardMasonry
              objects={refs ?? []}
              size='compact'
              inline
              CardMenu={AttachmentCardMenu}
              pending={placeholders}
            />
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

/** The section's remove, for the card menus it hands the grid: a menu contributor is a component type. */
const RemoveAttachmentContext = createContext<((object: Obj.Unknown) => void) | undefined>(undefined);

/** Adds "Remove attachment" to each attachment card's menu, beside the file's own actions. */
const AttachmentCardMenu = ({ subject, menu }: AppSurface.CardMenuData<Obj.Unknown>) => {
  const { t } = useTranslation(meta.profile.key);
  const onRemove = useContext(RemoveAttachmentContext);
  const items = useMemo(
    () =>
      onRemove
        ? [
            createMenuAction('removeAttachment', () => onRemove(subject), {
              label: t('task-attachment.remove.label'),
              icon: 'ph--trash--regular',
            }),
          ]
        : [],
    [onRemove, subject, t],
  );
  useMenuContribution(menu, { id: `${meta.profile.key}.attachment`, mode: 'additive', items });
  return null;
};
