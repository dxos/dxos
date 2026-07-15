//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref, Relation } from '@dxos/echo';
import { Card, Icon, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { AnchoredTo, Topic } from '@dxos/types';

import { meta } from '#meta';
import { InboxOperation, type Mailbox } from '#types';

/** An unaccepted topic suggestion (a `Mailbox.topicSuggestions` entry — same fields as a `Topic`). */
type Suggestion = NonNullable<Mailbox.Mailbox['topicSuggestions']>[number];

type SuggestionTileData = {
  readonly suggestion: Suggestion;
  readonly onAccept: (suggestion: Suggestion) => void;
  readonly onDismiss: (suggestion: Suggestion) => void;
};

/** Mosaic tile for one topic suggestion: label + summary, with Accept / Dismiss menu actions. */
const SuggestionTile = forwardRef<HTMLDivElement, Pick<MosaicTileProps<SuggestionTileData>, 'data' | 'location'>>(
  ({ data, location }, forwardedRef) => {
    const { suggestion, onAccept, onDismiss } = data;
    const { t } = useTranslation(meta.profile.key);
    const menuItems = useMemo(
      () => [
        { label: t('topics.accept.label'), icon: 'ph--check--regular', onClick: () => onAccept(suggestion) },
        { label: t('topics.dismiss.label'), icon: 'ph--x--regular', onClick: () => onDismiss(suggestion) },
      ],
      [suggestion, onAccept, onDismiss, t],
    );

    return (
      <Mosaic.Tile
        asChild
        classNames='border-b border-subdued-separator'
        id={suggestion.label}
        data={data}
        location={location}
      >
        <Card.Root fullWidth border={false} ref={forwardedRef} data-testid='topic-suggestion'>
          <Card.Header>
            <Card.Block>
              <Icon icon='ph--lightbulb--regular' />
            </Card.Block>
            <Card.Title>{suggestion.label}</Card.Title>
            <Card.Menu items={menuItems} />
          </Card.Header>
          <Card.Body>
            {suggestion.summary.length > 0 && (
              <Card.Row>
                <Card.Text variant='description'>{suggestion.summary}</Card.Text>
              </Card.Row>
            )}
          </Card.Body>
        </Card.Root>
      </Mosaic.Tile>
    );
  },
);

SuggestionTile.displayName = 'SuggestionTile';

export type TopicSuggestionsArticleProps = AppSurface.ObjectArticleProps<Mailbox.Mailbox>;

/**
 * Opt-in topic suggestions for a mailbox: the `Mailbox.topicSuggestions` the `AnalyzeTopics` operation
 * produced, each with Accept (→ materialize a `Topic` + `AnchoredTo` relation) / Dismiss actions, plus a
 * toolbar action to (re-)run analysis. Accepted topics appear in the space-level Topics section
 * (`@dxos/plugin-brain`); this view stays mailbox-scoped because suggestions live on the `Mailbox`.
 */
export const TopicSuggestionsArticle = ({ role, subject: mailbox, attendableId }: TopicSuggestionsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const id = String(attendableId ?? Obj.getURI(mailbox));
  const db = Obj.getDatabase(mailbox);
  const suggestions = mailbox.topicSuggestions ?? [];

  // Labels are unique across suggestions (deduped at write time), so remove by label. Splice in place
  // rather than reassigning a `filter`ed array — reassigning an array of live element proxies corrupts
  // the surviving elements' nested array fields (`threadIds` etc. read back as undefined).
  const dismiss = useCallback(
    (suggestion: Suggestion) =>
      Obj.update(mailbox, (mailbox) => {
        const topicSuggestions = mailbox.topicSuggestions;
        const index = topicSuggestions?.findIndex((entry) => entry.label === suggestion.label) ?? -1;
        if (topicSuggestions && index >= 0) {
          topicSuggestions.splice(index, 1);
        }
      }),
    [mailbox],
  );

  const handleAccept = useCallback(
    (suggestion: Suggestion) => {
      if (!db) {
        return;
      }
      const topic = db.add(
        Obj.make(Topic.Topic, {
          label: suggestion.label,
          summary: suggestion.summary,
          threadIds: [...suggestion.threadIds],
          participants: [...suggestion.participants],
          keywords: [...suggestion.keywords],
          questions: [...suggestion.questions],
          tasks: [...suggestion.tasks],
        }),
      );
      db.add(AnchoredTo.make({ [Relation.Source]: topic, [Relation.Target]: mailbox }));
      dismiss(suggestion);
    },
    [db, mailbox, dismiss],
  );

  // Snapshot each suggestion into a plain object so the Mosaic tiles never read a live `topicSuggestions`
  // struct proxy (accepting/dismissing reassigns the array, detaching removed elements — a detached proxy
  // yields `undefined` fields and throws on render). Computed inline (not memoized): `topicSuggestions`
  // returns a stable proxy ref whose contents mutate in place, so a `useMemo` keyed on it never recomputes.
  const suggestionItems = suggestions.map((suggestion) => ({
    suggestion: {
      label: suggestion.label,
      summary: suggestion.summary ?? '',
      threadIds: [...suggestion.threadIds],
      participants: [...suggestion.participants],
      keywords: [...suggestion.keywords],
      questions: [...suggestion.questions],
      tasks: [...suggestion.tasks],
    },
    onAccept: handleAccept,
    onDismiss: dismiss,
  }));

  const handleAnalyze = useCallback(() => {
    void invokePromise(
      InboxOperation.AnalyzeTopics,
      { mailbox: Ref.make(mailbox) },
      {
        spaceId: db?.spaceId,
        notify: {
          success: ['analyze-topics-success.title', { ns: meta.profile.key }],
          error: ['analyze-topics-error.title', { ns: meta.profile.key }],
        },
      },
    );
  }, [invokePromise, mailbox, db]);

  const menuActions = useTopicSuggestionsActions(handleAnalyze);

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={id}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content asChild>
        {suggestions.length === 0 ? (
          <Empty label={t('topic-suggestions.empty.message')} />
        ) : (
          <ScrollArea.Root orientation='vertical' padding thin>
            <ScrollArea.Viewport>
              <Mosaic.Container asChild>
                <Mosaic.Stack
                  Tile={SuggestionTile}
                  items={suggestionItems}
                  draggable={false}
                  getId={(item) => item.suggestion.label}
                />
              </Mosaic.Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

TopicSuggestionsArticle.displayName = 'TopicSuggestionsArticle';

/** Toolbar menu for the suggestions view: (re-)run topic analysis over the mailbox. */
const useTopicSuggestionsActions = (onAnalyze: () => void) =>
  useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['topic-suggestions.toolbar.title', { ns: meta.profile.key }] })
        .action(
          'analyze',
          {
            icon: 'ph--magic-wand--regular',
            iconOnly: false,
            label: ['analyze-topics.label', { ns: meta.profile.key }],
            testId: 'topics-analyze',
          },
          onAnalyze,
        )
        .build(),
    [onAnalyze],
  );
