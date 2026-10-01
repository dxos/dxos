//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type RefObject, useCallback } from 'react';

import { Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
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
  const { t } = useTranslation(meta.profile.key);

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
      <Next.Field.Root>
        <Next.Textarea
          autoFocus
          rows={4}
          placeholder={t('comment-placeholder.label')}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Next.Field.Root>
      <Flex justify='end' gap='sm'>
        <Next.Button onClick={onCancel}>{t('comment-cancel.label')}</Next.Button>
        <Next.Button variant='primary' disabled={busy || !value.trim()} onClick={onSubmit}>
          {t('comment-submit.label')}
        </Next.Button>
      </Flex>
    </>
  );
};

/** The composer as a band under the toolbar, for a comment on the pull request as a whole. */
export const CommentBand = (props: CommentComposerProps) => (
  <Flex column gap='sm' classNames='p-3 border-b border-separator'>
    <CommentComposer {...props} />
  </Flex>
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
  <Next.Popover.Root
    open={open}
    onOpenChange={(next) => {
      if (!next) {
        props.onCancel();
      }
    }}
    positioning={Next.virtualAnchor(anchorRef)}
  >
    <Next.Popover.Content side='bottom' align='start' classNames='w-[28rem] max-w-[90cqi]'>
      <Next.Popover.Body classNames='flex flex-col gap-2 p-2'>
        <CommentComposer {...props} />
      </Next.Popover.Body>
    </Next.Popover.Content>
  </Next.Popover.Root>
);
