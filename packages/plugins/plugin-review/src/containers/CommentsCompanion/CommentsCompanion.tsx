//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
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

import { CommentOperation } from '#types';

import { commentsViewAspect } from '../../capabilities/comments-view-state.ts';
import { ReviewNamespace } from '../../namespace.ts';
import { findFieldEditor } from '../../util/index.ts';
import { CommentsArticle } from '../CommentsArticle/CommentsArticle.tsx';
import { CommentThreadList, useCommentAnchors } from '../CommentsArticle/CommentThreadList.tsx';

export type CommentsCompanionProps = {
  attendableId: string;
  /** The companion's node data: an object that takes comments, or data a `CommentScope` covers. */
  data: unknown;
};

/**
 * The comments companion: for a scoped node (a level of a spec), the threads on each of its objects under that object's type and
 * name; otherwise the threads on the object itself. Every scope that covers the node adds its objects, so plugins can
 * each contribute the objects they own; the first one's subject takes comments on the whole node.
 */
export const CommentsCompanion = ({ attendableId, data }: CommentsCompanionProps) => {
  const scopes = Hooks.useCapabilities(AppCapabilities.CommentScope);
  const scopeAtom = useMemo(
    () =>
      Atom.make((get) => {
        const resolved = scopes.flatMap((scope) => scope.resolve(data, get) ?? []);
        if (resolved.length === 0) {
          return undefined;
        }
        const targets = [
          ...new Map(resolved.flatMap(({ targets }) => targets).map((target) => [target.id, target])).values(),
        ];
        return { subject: resolved[0].subject, targets };
      }),
    [scopes, data],
  );
  const scope = useAtomValue(scopeAtom);
  if (scope) {
    return <ScopeComments attendableId={attendableId} {...scope} />;
  }
  return Obj.isObject(data) ? <CommentsArticle attendableId={attendableId} subject={data} /> : null;
};

CommentsCompanion.displayName = 'CommentsCompanion';

type ScopeCommentsProps = {
  attendableId?: string;
  subject: Obj.Unknown;
  targets: readonly Obj.Unknown[];
};

const ScopeComments = ({ attendableId, subject, targets }: ScopeCommentsProps) => {
  const { t } = UiHooks.useTranslation(ReviewNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const subjectId = Obj.getURI(subject);
  const { showResolvedThreads } = useViewState(commentsViewAspect, subjectId);
  const { set: setCommentsView } = useViewStateActions(commentsViewAspect, subjectId);
  const handleChangeViewState = useCallback(
    (nextValue: string) => setCommentsView({ showResolvedThreads: nextValue === 'all' }),
    [setCommentsView],
  );

  // The text selected in one of the scope's editors, else the whole scope's subject.
  const handleAddComment = useCallback(async () => {
    const view = await findFieldEditor(targets.map((target) => Obj.getURI(target)));
    if (view) {
      createComment(view);
      return;
    }
    await invokePromise(CommentOperation.Create, { subject });
  }, [invokePromise, subject, targets]);

  const groups = (
    // Groups with no threads render nothing, so an empty list shows the banner after it.
    <div className='peer'>
      {targets.map((target) => (
        <TargetComments
          key={target.id}
          target={target}
          subject={subject}
          attendableId={attendableId}
          showResolvedThreads={showResolvedThreads}
        />
      ))}
    </div>
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
              onClick={handleAddComment}
              data-testid='comments.object-comment.add'
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <Tabs.Content value={showResolvedThreads ? 'all' : 'unresolved'}>
                {groups}
                <Banner.Root classNames='hidden peer-empty:flex'>
                  <Banner.Body>
                    <span>
                      <Theme.Trans
                        {...{
                          t,
                          i18nKey: 'no-comments-fields.message',
                          components: {
                            addIcon: (
                              <Icon.Icon
                                icon='ph--plus--regular'
                                size='md'
                                classNames='inline-block align-[-0.125em]'
                              />
                            ),
                          },
                        }}
                      />
                    </span>
                  </Banner.Body>
                </Banner.Root>
              </Tabs.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Tabs.Root>
    </Panel.Root>
  );
};

type TargetCommentsProps = {
  target: Obj.Unknown;
  /** The open object the scope is for. */
  subject: Obj.Unknown;
  attendableId?: string;
  showResolvedThreads?: boolean;
};

/**
 * The threads on one of the scope's objects, headed by its type and name; nothing when it has none.
 * The name is dropped where it adds nothing: on the open object, and on an owned object named after it.
 */
const TargetComments = ({ target, subject, attendableId, showResolvedThreads }: TargetCommentsProps) => {
  const { t } = UiHooks.useTranslation();
  const [snapshot] = useObject(target);
  const [subjectSnapshot] = useObject(subject);
  const anchors = useCommentAnchors(target, { showResolvedThreads });
  if (anchors.length === 0) {
    return null;
  }

  const typename = Obj.getTypename(target);
  const type = typename ? t('typename.label', { ns: typename, defaultValue: '' }) : '';
  const name = snapshot ? Obj.getLabel(snapshot) : undefined;
  const sameName = target.id === subject.id || !name || name === (subjectSnapshot && Obj.getLabel(subjectSnapshot));
  const heading = !type ? name : sameName ? type : `${type} · ${name}`;

  return (
    <section data-testid='comments.scope-group'>
      <h3 className='px-3 pt-3 pb-1 text-sm text-description truncate'>{heading}</h3>
      <CommentThreadList subject={target} attendableId={attendableId} anchors={anchors} />
    </section>
  );
};
