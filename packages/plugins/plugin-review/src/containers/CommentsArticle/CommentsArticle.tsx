//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import { Obj } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useResolveRef } from '@dxos/echo-react';
import { useMembers } from '@dxos/halo-react';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';
import { getSpace } from '@dxos/react-client/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Theme from '@dxos/react-ui/Theme';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { createComment } from '@dxos/ui-editor/headless';
import { toHue } from '@dxos/ui-theme';
import { hexToHue } from '@dxos/util';

import { Suggestions } from '#components';
import { type SuggestionGroup } from '#hooks';
import { CommentOperation, ReviewCapabilities } from '#types';

import { commentsViewAspect } from '../../capabilities/comments-view-state.ts';
import { ReviewNamespace } from '../../namespace.ts';
import { findCommentConfig, findFieldEditor } from '../../util/index.ts';
import { CommentThreadList, useCommentAnchors } from './CommentThreadList.tsx';

/**
 * Subject is the host object being commented on (e.g. a Markdown.Document),
 * not a Thread — the threads anchored to that host are discovered via the
 * `AnchoredTo` query inside the component.
 */
export type CommentsArticleProps = AppSurface.ObjectArticleProps<Obj.Any>;

export const CommentsArticle = ({ attendableId, subject }: CommentsArticleProps) => {
  const { t } = UiHooks.useTranslation(ReviewNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const subjectId = Obj.getURI(subject);
  const space = getSpace(subject);
  const members = useMembers(space?.id);
  // Author display names for suggestion tiles, keyed by DID; absent ⇒ the tile falls back to the DID.
  const authorLabels = useMemo(
    () =>
      Object.fromEntries(members.flatMap((member) => (member.displayName ? [[member.did, member.displayName]] : []))),
    [members],
  );
  // Author palette hues keyed by DID: the identity's chosen hue, else derived from the (hex) identity
  // key so a suggestion's colour matches the author's avatar/tag and the inline markers.
  const authorHues = useMemo(
    () =>
      Object.fromEntries(
        members.flatMap((member) => {
          if (!member.did) {
            return [];
          }
          const chosen = typeof member.data?.hue === 'string' ? toHue(member.data.hue) : 'neutral';
          const hue = chosen !== 'neutral' ? chosen : member.identityKey ? hexToHue(member.identityKey) : undefined;
          return hue ? [[member.did, hue]] : [];
        }),
      ),
    [members],
  );

  // Per-subject view state (session-only), read/written through the ViewState aspect.
  const { showResolvedThreads } = useViewState(commentsViewAspect, subjectId);
  const { set: setCommentsView } = useViewStateActions(commentsViewAspect, subjectId);

  const commentConfigs = Hooks.useCapabilities(AppCapabilities.CommentConfig);
  // An object whose comments are not anchored to a span (a drawing) has no text to select, so its empty state points
  // only to the toolbar's whole-object comment.
  const unanchored = findCommentConfig(commentConfigs, subject)?.comments === 'unanchored';

  // The active review branch: the core branch the local user is currently viewing for this subject
  // (per-object version selection, shared with the editor surface). `undefined` = main/unbranched.
  // Comments are scoped to it so the companion shows only the branch under review's threads.
  const versionSelection = useViewState(ReviewCapabilities.viewAspect, subject.id).selection;
  const markdownDoc = Obj.instanceOf(Markdown.Document, subject) ? subject : undefined;
  const reviewBranch = useMemo(() => {
    if (!markdownDoc || versionSelection?.kind !== 'branch') {
      return undefined;
    }
    const branch = markdownDoc.history?.branches.find(
      (candidate) => candidate.id === versionSelection.branchId && candidate.status === 'active',
    );
    return branch?.key;
  }, [markdownDoc, versionSelection]);
  const activeBranch = reviewBranch ?? 'main';

  // A comment on the whole object: no anchor, which the editors' comment sync and anchor sorts already pass over. An
  // object edited in fields (a feature) comments on the text selected in one instead, since its editors leave Mod-'
  // to the deck; a Markdown document has its own toolbar action for that.
  const handleAddObjectComment = useCallback(async () => {
    const fieldView = markdownDoc ? undefined : await findFieldEditor([subjectId]);
    if (fieldView) {
      createComment(fieldView);
      return;
    }
    await invokePromise(CommentOperation.Create, { subject, branch: reviewBranch });
  }, [invokePromise, subject, subjectId, markdownDoc, reviewBranch]);

  const anchors = useCommentAnchors(subject, { branch: reviewBranch, showResolvedThreads });

  const handleChangeViewState = useCallback(
    (nextValue: string) => {
      setCommentsView({ showResolvedThreads: nextValue === 'all' });
    },
    [setCommentsView],
  );

  // Suggestion review: the document's `kind:'suggestion'` branches overlaid as change-block tiles
  // alongside comment threads. Accept/Reject route through the same durable ops as branch review.
  const mainText = useResolveRef(markdownDoc?.content);

  const routeSuggestion = useCallback(
    async (
      operation: typeof CollaborationOperation.AcceptChange | typeof CollaborationOperation.RejectChange,
      group: SuggestionGroup,
    ) => {
      // Resolve the author's suggestion branch and anchor the change by its base offsets.
      const branch = markdownDoc?.history?.branches.find(
        (candidate) =>
          candidate.status === 'active' && candidate.kind === 'suggestion' && candidate.creator === group.author,
      )?.key;
      if (!mainText || !branch) {
        return;
      }
      const anchor = toCursorRange(Doc.createAccessor(mainText, ['content']), group.from, group.to);
      await invokePromise(operation, { subject, anchor, branch });
    },
    [markdownDoc, mainText, invokePromise, subject],
  );
  // The current suggestion, by group key — shared with the editor so clicking a change in the document
  // accents its card, and clicking a card reveals the change.
  const { suggestion: selectedSuggestion, hiddenAuthors } = useViewState(ReviewCapabilities.viewAspect, subject.id);
  const { set: setReviewView, update: updateReviewView } = useViewStateActions(
    ReviewCapabilities.viewAspect,
    subject.id,
  );
  // Per-author visibility (session-local): shared through the ViewState aspect so the editor overlay
  // and change bars filter the same authors the companion hides.
  const handleToggleAuthor = useCallback(
    (author: string) =>
      updateReviewView((prev) => {
        const hidden = new Set(prev.hiddenAuthors ?? []);
        hidden.has(author) ? hidden.delete(author) : hidden.add(author);
        return { ...prev, hiddenAuthors: [...hidden] };
      }),
    [updateReviewView],
  );
  const handleSelectSuggestion = useCallback(
    (group: SuggestionGroup) => {
      setReviewView({ suggestion: { author: group.author, from: group.from, to: group.to } });
      if (!mainText) {
        return;
      }
      const cursor = toCursorRange(Doc.createAccessor(mainText, ['content']), group.from, group.to);
      void invokePromise(MarkdownOperation.ScrollToAnchor, { subject: attendableId ?? subjectId, cursor });
    },
    [mainText, invokePromise, attendableId, subjectId, setReviewView],
  );

  const handleAcceptSuggestion = useCallback(
    (group: SuggestionGroup) => routeSuggestion(CollaborationOperation.AcceptChange, group),
    [routeSuggestion],
  );
  const handleRejectSuggestion = useCallback(
    (group: SuggestionGroup) => routeSuggestion(CollaborationOperation.RejectChange, group),
    [routeSuggestion],
  );

  // Hide the empty-state prompt once there is either a comment thread or a suggestion to review.
  const hasSuggestions = !!markdownDoc?.history?.branches.some(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion',
  );

  const comments =
    anchors.length > 0 ? (
      <CommentThreadList subject={subject} attendableId={attendableId} anchors={anchors} reviewBranch={reviewBranch} />
    ) : hasSuggestions ? null : (
      <Banner.Root>
        <Banner.Body>
          <span>
            <Theme.Trans
              {...{
                t,
                i18nKey: unanchored ? 'no-comments-unanchored.message' : 'no-comments.message',
                components: {
                  commentIcon: (
                    <Icon.Icon icon='ph--chat-text--regular' size='md' classNames='inline-block align-[-0.125em]' />
                  ),
                  versionsIcon: (
                    <Icon.Icon icon='ph--git-branch--regular' size='md' classNames='inline-block align-[-0.125em]' />
                  ),
                  addIcon: <Icon.Icon icon='ph--plus--regular' size='md' classNames='inline-block align-[-0.125em]' />,
                },
              }}
            />
          </span>
        </Banner.Body>
      </Banner.Root>
    );

  return (
    <Panel.Root asChild>
      <Tabs.Root
        orientation='horizontal'
        value={showResolvedThreads ? 'all' : 'unresolved'}
        onValueChange={handleChangeViewState}
      >
        <Panel.Header>
          <Toolbar.Root>
            <Tabs.List>
              <Tabs.Trigger classNames='text-sm' value='unresolved'>
                {t('show-unresolved.label')}
              </Tabs.Trigger>
              <Tabs.Trigger classNames='text-sm' value='all'>
                {t('show-all.label')}
              </Tabs.Trigger>
            </Tabs.List>
            <Toolbar.Separator variant='gap' />
            <Button.Root
              variant='ghost'
              iconOnly
              icon='ph--plus--regular'
              label={t('add-object-comment.label')}
              onClick={handleAddObjectComment}
              data-testid='comments.object-comment.add'
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <Suggestions
                document={markdownDoc}
                base={mainText}
                authorLabels={authorLabels}
                authorHues={authorHues}
                onAccept={handleAcceptSuggestion}
                onReject={handleRejectSuggestion}
                onSelect={handleSelectSuggestion}
                selected={selectedSuggestion}
                hiddenAuthors={hiddenAuthors}
                onToggleAuthor={handleToggleAuthor}
              />
              <Tabs.Content value='all'>{showResolvedThreads && comments}</Tabs.Content>
              <Tabs.Content value='unresolved'>{!showResolvedThreads && comments}</Tabs.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Tabs.Root>
    </Panel.Root>
  );
};

CommentsArticle.displayName = 'CommentsArticle';
