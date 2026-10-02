//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type RefObject, useCallback } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import { type DiffLineTarget } from '@dxos/ui-editor';

import { meta } from '#meta';

export type CommentComposerProps = {
  value: string;
  busy?: boolean;
  /** The diff line the comment is addressed to, named above the field; absent for a pull request comment. */
  target?: DiffLineTarget;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/**
 * The comment field, its target and its buttons — rendered as a band under the pull request header
 * when the comment is about the pull request, and inside {@link LineCommentPopover} when it is
 * about one line of a diff.
 */
export const CommentComposer = ({ value, busy, target, onValueChange, onSubmit, onCancel }: CommentComposerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  // Cmd/Ctrl+Enter submits, matching GitHub's own comment form.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (!busy && value.trim()) {
          onSubmit();
        }
      }
    },
    [busy, value, onSubmit],
  );

  return (
    <>
      {target && (
        <span className='text-sm text-description'>
          {t('comment-line.label', { file: target.file, line: target.line })}
        </span>
      )}
      <Field.Root>
        <Field.Textarea
          autoFocus
          rows={4}
          placeholder={t('comment-placeholder.label')}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Field.Root>
      <Flex.Root justify='end' gap='sm'>
        <Button.Root onClick={onCancel}>{t('comment-cancel.label')}</Button.Root>
        <Button.Root variant='primary' disabled={busy || !value.trim()} onClick={onSubmit}>
          {t('comment-submit.label')}
        </Button.Root>
      </Flex.Root>
    </>
  );
};

/** The composer as a band under the toolbar, for a comment on the pull request as a whole. */
export const CommentBand = (props: CommentComposerProps) => (
  <Flex.Root column gap='sm' classNames='p-3 border-b border-separator'>
    <CommentComposer {...props} />
  </Flex.Root>
);

export type LineCommentPopoverProps = CommentComposerProps & {
  open: boolean;
  /** The diff line's comment button, which CodeMirror owns; the popover is positioned at it. */
  anchorRef: RefObject<HTMLElement | null>;
};

/**
 * The composer floated at the diff line it addresses, so the reader reads the comment against the
 * code it is about rather than against a band at the other end of the document.
 */
export const LineCommentPopover = ({ open, anchorRef, ...props }: LineCommentPopoverProps) => (
  <Popover.Root
    open={open}
    onOpenChange={(next) => {
      if (!next) {
        props.onCancel();
      }
    }}
  >
    <Popover.VirtualTrigger virtualRef={anchorRef} />
    <Popover.Portal>
      <Popover.Content side='bottom' align='start' classNames='w-[28rem] max-w-[90cqi]'>
        <Popover.Viewport classNames='flex flex-col gap-2 p-2'>
          <CommentComposer {...props} />
        </Popover.Viewport>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
