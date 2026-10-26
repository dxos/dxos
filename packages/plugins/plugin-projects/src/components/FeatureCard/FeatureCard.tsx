//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, createContext, forwardRef, useContext, useState } from 'react';

import { log } from '@dxos/log';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tag from '@dxos/react-ui/Tag';
import * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';
import { Feature } from '#types';

import {
  type FeatureChanges,
  type FeatureLookup,
  type FeatureModel,
  type FeatureRelation,
  type FeatureSignal,
  type FeatureStatus,
  type FeatureTarget,
  getFeatureSignals,
} from './feature.ts';
import { EditField, FEATURE_STATUS_STYLE, RowIcon, StatusIcon, StatusItems, stopPropagation } from './fields.tsx';

const SIGNAL_STYLE: Record<FeatureSignal, { icon: string; hue: Tag.TagHue }> = {
  'blocked': { icon: 'ph--lock--regular', hue: 'error' },
  'ahead': { icon: 'ph--arrow-fat-up--regular', hue: 'warning' },
  'no-evidence': { icon: 'ph--presentation-chart--regular', hue: 'warning' },
  'in-flight': { icon: 'ph--git-pull-request--regular', hue: 'info' },
  'unplanned': { icon: 'ph--calendar-x--regular', hue: 'neutral' },
};

const RELATION_HUE: Record<FeatureRelation, Tag.TagHue> = { dependency: 'sky', dependent: 'violet' };

//
// Context
//

type FeatureCardContextValue = {
  feature: FeatureModel;
  lookup: FeatureLookup;
  relation?: FeatureRelation;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  scroll: boolean;
  onOpen?: (target: FeatureTarget) => void;
  onChange?: (feature: FeatureModel, changes: FeatureChanges) => void;
};

const FeatureCardContext = createContext<FeatureCardContextValue | undefined>(undefined);

const useFeatureCardContext = (consumerName: string): FeatureCardContextValue => {
  const context = useContext(FeatureCardContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`FeatureCard.Root\``);
  }
  return context;
};

/** A row handler that opens `target`; undefined without `onOpen`, so the row stays plain text. */
const useOpenRow = (consumerName: string) => {
  const { onOpen } = useFeatureCardContext(consumerName);
  return (target: FeatureTarget) =>
    onOpen
      ? (event: MouseEvent) => {
          // The row sits inside the host's item; opening the target must not also select the card.
          event.stopPropagation();
          onOpen(target);
        }
      : undefined;
};

type FeatureCardProviderProps = PropsWithChildren<{
  feature: FeatureModel;
  /** Resolves `dependsOn` ids to features, for their labels, statuses and the derived signals. */
  lookup: FeatureLookup;
  /** How this card relates to the host's selected feature; dims nothing by itself. */
  relation?: FeatureRelation;
  /** Opens the feature or anything it lists; without it rows are plain text and specs link to GitHub. */
  onOpen?: (target: FeatureTarget) => void;
  /** Writes edited fields; without it the card is read-only (no status picker or edit button). */
  onChange?: (feature: FeatureModel, changes: FeatureChanges) => void;
  /** Controlled edit mode, as for a feature just created; uncontrolled when omitted. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** For a host of fixed height (a canvas box): the card fills it and the body scrolls under the header. */
  scroll?: boolean;
}>;

/** The card's state without its frame, for a host that draws the frame itself (an article, the app's card surface). */
const FeatureCardProvider = ({
  children,
  editing: editingProp,
  onEditingChange,
  scroll = false,
  ...props
}: FeatureCardProviderProps) => {
  const [editingState, setEditingState] = useState(false);
  const setEditing = (next: boolean) => {
    setEditingState(next);
    onEditingChange?.(next);
  };
  return (
    <FeatureCardContext.Provider value={{ ...props, editing: editingProp ?? editingState, setEditing, scroll }}>
      {children}
    </FeatureCardContext.Provider>
  );
};

FeatureCardProvider.displayName = 'FeatureCard.Provider';

//
// Root
//

type FeatureCardRootProps = Omit<FeatureCardProviderProps, 'children'> & Omit<Card.RootProps, 'onChange'>;

/**
 * One feature as a card: its parts are composed by the host. Focus, selection and opening the card belong to the host's
 * item (a `Focus.Item`, a masonry tile); the card is `asChild`-friendly so it can be that item's child.
 */
const FeatureCardRoot = Util.composable<HTMLDivElement, FeatureCardRootProps>(
  (
    { feature, lookup, relation, onOpen, onChange, editing, onEditingChange, scroll, children, classNames, ...props },
    forwardedRef,
  ) => (
    <FeatureCardProvider
      feature={feature}
      lookup={lookup}
      relation={relation}
      onOpen={onOpen}
      onChange={onChange}
      editing={editing}
      onEditingChange={onEditingChange}
      scroll={scroll}
    >
      <Card.Root
        grid
        {...props}
        classNames={[scroll && 'h-full grid-rows-[min-content_minmax(0,1fr)]', classNames]}
        data-testid='feature-card'
        data-feature={feature.id}
        data-status={feature.status}
        data-relation={relation}
        ref={forwardedRef}
      >
        {children}
      </Card.Root>
    </FeatureCardProvider>
  ),
);

FeatureCardRoot.displayName = 'FeatureCard.Root';

//
// Header
//

type FeatureCardHeaderProps = Card.HeaderProps;

const FeatureCardHeader = forwardRef<HTMLDivElement, FeatureCardHeaderProps>((props, forwardedRef) => (
  <Card.Header {...props} ref={forwardedRef} />
));

FeatureCardHeader.displayName = 'FeatureCard.Header';

//
// Status
//

type FeatureCardStatusProps = {};

/** The status icon; with `onChange` it opens the status picker. */
const FeatureCardStatus = (_: FeatureCardStatusProps) => {
  const { feature, onChange } = useFeatureCardContext('FeatureCard.Status');
  return (
    <Layout.Block rail='start'>
      <StatusIcon
        status={feature.status}
        onChange={onChange && ((status: FeatureStatus) => onChange(feature, { status }))}
        testId='feature-card.status-icon'
      />
    </Layout.Block>
  );
};

FeatureCardStatus.displayName = 'FeatureCard.Status';

//
// Title
//

type FeatureCardTitleProps = {};

/** The name; a field in edit mode. */
const FeatureCardTitle = (_: FeatureCardTitleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, editing, onChange } = useFeatureCardContext('FeatureCard.Title');
  const editable = editing && onChange;
  return (
    // Unclamped while editing: the clamp clips overflow, which would cut off the field's box beyond the text.
    <Card.Title lines={editable ? undefined : 2}>
      {editable ? (
        <EditField
          value={feature.name}
          placeholder={t('feature-card.name.placeholder')}
          label={t('feature-card.name.label')}
          testId='feature-card.name.input'
          autoFocus
          // A feature always has a name, so clearing the field keeps the old one.
          onCommit={(name) => name && onChange(feature, { name })}
        />
      ) : (
        feature.name
      )}
    </Card.Title>
  );
};

FeatureCardTitle.displayName = 'FeatureCard.Title';

//
// Save
//

type FeatureCardSaveProps = {};

/** Leaves edit mode; shown only while editing, since the menu's Edit enters it. */
const FeatureCardSave = (_: FeatureCardSaveProps) => {
  const { editing, setEditing } = useFeatureCardContext('FeatureCard.Save');
  if (!editing) {
    return null;
  }
  return (
    <Layout.Block rail='end'>
      <SystemButton.Save
        variant='ghost'
        data-testid='feature-card.done'
        // Takes the press itself, so it neither selects the card nor drags a canvas box.
        onPointerDown={stopPropagation}
        onClick={(event) => {
          event.stopPropagation();
          setEditing(false);
        }}
      />
    </Layout.Block>
  );
};

FeatureCardSave.displayName = 'FeatureCard.Save';

//
// Menu
//

type FeatureCardMenuProps = {
  /** Takes the feature off the map it is shown on; the feature itself is kept. */
  onRemove?: (feature: FeatureModel) => void;
};

/** Open, edit, the status picker and remove, each when its handler is given. */
const FeatureCardMenu = ({ onRemove }: FeatureCardMenuProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, editing, setEditing, onOpen, onChange } = useFeatureCardContext('FeatureCard.Menu');
  const setStatus = onChange && ((status: FeatureStatus) => onChange(feature, { status }));
  // Entered a frame later: the menu refocuses its trigger as it closes, which would take focus from the name field.
  const edit = onChange && !editing ? () => requestAnimationFrame(() => setEditing(true)) : undefined;
  if (!onOpen && !setStatus && !onRemove) {
    return null;
  }
  return (
    <Layout.Block rail='end' data-testid='feature-card.menu'>
      <Card.Menu label={t('feature-card.menu.label')}>
        {onOpen && (
          <Menu.Item
            item={{ value: 'open', label: t('feature-card.open.label'), icon: 'ph--arrow-square-out--regular' }}
            data-testid='feature-card.open'
            onClick={() => onOpen({ type: 'object', id: feature.id })}
          />
        )}
        {edit && (
          <Menu.Item
            item={{ value: 'edit', label: t('feature-card.edit.label'), icon: 'ph--pencil-simple--regular' }}
            data-testid='feature-card.edit'
            onClick={edit}
          />
        )}
        {(onOpen || edit) && setStatus && <Menu.Separator />}
        {setStatus && <StatusItems value={feature.status} onChange={setStatus} testId='feature-card.status' />}
        {(onOpen || edit || setStatus) && onRemove && <Menu.Separator />}
        {onRemove && (
          <Menu.Item
            item={{ value: 'remove', label: t('feature-card.remove.label'), icon: 'ph--minus-circle--regular' }}
            data-testid='feature-card.remove'
            onClick={() => onRemove(feature)}
          />
        )}
      </Card.Menu>
    </Layout.Block>
  );
};

FeatureCardMenu.displayName = 'FeatureCard.Menu';

//
// Body
//

type FeatureCardBodyProps = Card.BodyProps;

/** The sections under the header; under a `scroll` root it scrolls beneath the header. */
const FeatureCardBody = forwardRef<HTMLDivElement, FeatureCardBodyProps>((props, forwardedRef) => {
  const scroll = useContext(FeatureCardContext)?.scroll;
  const body = <Card.Body {...props} ref={forwardedRef} />;
  return scroll ? (
    // A subgrid of the card, so rows keep its rails; containment would make it a standalone grid instead.
    <ScrollArea.Root classNames='col-span-full grid-cols-subgrid [container-type:normal]'>
      <ScrollArea.Viewport classNames='col-span-full grid grid-cols-subgrid content-start [&>.dx-card-body]:col-span-full'>
        {body}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  ) : (
    body
  );
});

FeatureCardBody.displayName = 'FeatureCard.Body';

//
// Description
//

type FeatureCardDescriptionProps = {};

/** The description, clamped; a multiline field in edit mode, shown even while empty. Directly under the title. */
const FeatureCardDescription = (_: FeatureCardDescriptionProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, editing, onChange } = useFeatureCardContext('FeatureCard.Description');
  if (editing && onChange) {
    return (
      // The row's content clips overflow (for truncation), which would cut off the field's box beyond the text.
      <Card.Row span='end' classNames='[&_.dx-card-row-content]:overflow-visible'>
        <EditField
          value={feature.description ?? ''}
          placeholder={t('feature-card.description.placeholder')}
          label={t('feature-card.description.label')}
          testId='feature-card.description.input'
          multiline
          onCommit={(description) => onChange(feature, { description })}
        />
      </Card.Row>
    );
  }
  return feature.description ? (
    <Card.Row span='end' data-testid='feature-card.description'>
      <Card.Text variant='muted' lines={3}>
        {feature.description}
      </Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardDescription.displayName = 'FeatureCard.Description';

//
// Tags
//

type FeatureCardTagsProps = {
  /** Every signal; otherwise only the most serious, with a count for the rest, so the row stays on one line. */
  all?: boolean;
};

/** The status, the relation to the host's selected feature, and the derived signals. */
const FeatureCardTags = ({ all }: FeatureCardTagsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, lookup, relation } = useFeatureCardContext('FeatureCard.Tags');
  const signals = getFeatureSignals(feature, lookup);
  const shown = all ? signals : signals.slice(0, 1);
  const hidden = signals.slice(shown.length);
  return (
    <Card.Row>
      <Layout.Flex wrap gap='xs'>
        <Tag.Tag hue={FEATURE_STATUS_STYLE[feature.status].hue}>{t(`feature-status.${feature.status}.label`)}</Tag.Tag>
        {relation && <Tag.Tag hue={RELATION_HUE[relation]}>{t(`feature-relation.${relation}.label`)}</Tag.Tag>}
        {shown.map((signal) => (
          <Tag.Tag key={signal} hue={SIGNAL_STYLE[signal].hue} data-testid={`feature-signal.${signal}`}>
            <Icon.Icon icon={SIGNAL_STYLE[signal].icon} size='xs' />
            {t(`feature-signal.${signal}.label`)}
          </Tag.Tag>
        ))}
        {hidden.length > 0 && (
          <Tag.Tag
            title={hidden.map((signal) => t(`feature-signal.${signal}.label`)).join(', ')}
            data-testid='feature-signal.more'
          >
            {t('feature-card.more-signals.label', { count: hidden.length })}
          </Tag.Tag>
        )}
      </Layout.Flex>
    </Card.Row>
  );
};

FeatureCardTags.displayName = 'FeatureCard.Tags';

//
// Counts
//

type FeatureCardCountProps = {};

/** How many subfeatures; the compact stand-in for `Subfeatures`. */
const FeatureCardSubfeatureCount = (_: FeatureCardCountProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.SubfeatureCount');
  return feature.subfeatures.length > 0 ? (
    <Card.Row leading={<RowIcon icon='ph--tree-view--regular' />}>
      <Card.Text truncate>{t('feature-card.subfeatures.label', { count: feature.subfeatures.length })}</Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardSubfeatureCount.displayName = 'FeatureCard.SubfeatureCount';

/** How many tasks are open, and the milestones they are planned for. */
const FeatureCardTaskCount = (_: FeatureCardCountProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.TaskCount');
  const openTasks = feature.tasks.filter((task) => !task.done);
  const milestones = [...new Set(openTasks.flatMap((task) => (task.milestone ? [task.milestone] : [])))];
  return openTasks.length > 0 ? (
    <Card.Row
      leading={<RowIcon icon='ph--list-checks--regular' />}
      trailing={milestones.length > 0 && <Tag.Tag>{milestones.join(', ')}</Tag.Tag>}
    >
      <Card.Text truncate>{t('feature-card.open-tasks.label', { count: openTasks.length })}</Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardTaskCount.displayName = 'FeatureCard.TaskCount';

/** The first showcase, the card's lead evidence; the compact stand-in for `Showcases`. */
const FeatureCardShowcaseLead = (_: FeatureCardCountProps) => {
  const { feature } = useFeatureCardContext('FeatureCard.ShowcaseLead');
  const [showcase] = feature.showcases;
  return showcase ? (
    <Card.Row leading={<RowIcon icon='ph--presentation-chart--regular' />}>
      <Card.Text truncate>{showcase.name}</Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardShowcaseLead.displayName = 'FeatureCard.ShowcaseLead';

/** How many features this one needs; the compact stand-in for `Dependencies`. */
const FeatureCardDependencyCount = (_: FeatureCardCountProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, lookup } = useFeatureCardContext('FeatureCard.DependencyCount');
  const count = feature.dependsOn.filter((id) => lookup(id)).length;
  return count > 0 ? (
    <Card.Row leading={<RowIcon icon='ph--tree-structure--regular' />}>
      <Card.Text truncate>{t('feature-card.depends-on.label', { count })}</Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardDependencyCount.displayName = 'FeatureCard.DependencyCount';

/** How many tests and suites cite the feature with a `@feature` tag; the compact stand-in for `Code`. */
const FeatureCardTestCount = (_: FeatureCardCountProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.TestCount');
  const count = feature.code.filter((link) => link.kind !== 'code').length;
  return count > 0 ? (
    <Card.Row leading={<RowIcon icon='ph--test-tube--regular' />} data-testid='feature-card.test-count'>
      <Card.Text truncate>{t('feature-card.tests.label', { count })}</Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardTestCount.displayName = 'FeatureCard.TestCount';

//
// ListSection
//

/** Rows past which a list section scrolls, so a long list does not outgrow the card. */
const SCROLL_ROWS = 5;

type ListSectionProps = PropsWithChildren<{ title: string; count: number }>;

/** A titled list of rows; past `SCROLL_ROWS` the rows scroll under the title in a capped height. */
const ListSection = ({ title, count, children }: ListSectionProps) => (
  <Card.Section title={title}>
    {count > SCROLL_ROWS ? (
      // Subgrids of the card down to the rows, so they keep its rails; containment would make a standalone grid.
      <ScrollArea.Root classNames='col-span-full grid-cols-subgrid max-h-48 [container-type:normal]'>
        <ScrollArea.Viewport classNames='col-span-full grid grid-cols-subgrid content-start [&>.dx-card-section]:col-span-full'>
          <Card.Section>{children}</Card.Section>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    ) : (
      children
    )}
  </Card.Section>
);

//
// Dependencies
//

type FeatureCardDependenciesProps = {
  /** Adds a remove action to each row. */
  onRemove?: (id: string) => void;
};

/** The features this one needs. */
const FeatureCardDependencies = ({ onRemove }: FeatureCardDependenciesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, lookup } = useFeatureCardContext('FeatureCard.Dependencies');
  const open = useOpenRow('FeatureCard.Dependencies');
  const dependencies = feature.dependsOn.flatMap((id) => lookup(id) ?? []);
  return dependencies.length > 0 ? (
    <ListSection title={t('feature-card.depends-on.title')} count={dependencies.length}>
      {dependencies.map((dependency) => (
        <Card.Row
          key={dependency.id}
          leading={<RowIcon icon={FEATURE_STATUS_STYLE[dependency.status].icon} />}
          trailing={
            onRemove && (
              <Card.Action
                icon='ph--x--regular'
                label={t('feature-card.remove-dependency.label', { name: dependency.name })}
                data-testid='feature-card.remove-dependency'
                onClick={() => onRemove(dependency.id)}
              />
            )
          }
          onClick={open({ type: 'object', id: dependency.id })}
        >
          <Card.Text truncate>{dependency.name}</Card.Text>
        </Card.Row>
      ))}
    </ListSection>
  ) : null;
};

FeatureCardDependencies.displayName = 'FeatureCard.Dependencies';

//
// Dependents
//

type FeatureCardDependentsProps = {
  /** Features that depend on this one; passed in, as the model stores only one direction. */
  dependents: readonly FeatureModel[];
};

/** The features that need this one. */
const FeatureCardDependents = ({ dependents }: FeatureCardDependentsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const open = useOpenRow('FeatureCard.Dependents');
  return dependents.length > 0 ? (
    <ListSection title={t('feature-card.dependents.title')} count={dependents.length}>
      {dependents.map((dependent) => (
        <Card.Row
          key={dependent.id}
          leading={<RowIcon icon={FEATURE_STATUS_STYLE[dependent.status].icon} />}
          onClick={open({ type: 'object', id: dependent.id })}
        >
          <Card.Text truncate>{dependent.name}</Card.Text>
        </Card.Row>
      ))}
    </ListSection>
  ) : null;
};

FeatureCardDependents.displayName = 'FeatureCard.Dependents';

//
// Subfeatures
//

type FeatureCardSubfeaturesProps = {};

/** Each subfeature with its status. */
const FeatureCardSubfeatures = (_: FeatureCardSubfeaturesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.Subfeatures');
  return feature.subfeatures.length > 0 ? (
    <ListSection title={t('feature-card.subfeatures.title')} count={feature.subfeatures.length}>
      {feature.subfeatures.map((subfeature, index) => (
        <Card.Row
          key={index}
          leading={<RowIcon icon={FEATURE_STATUS_STYLE[subfeature.status].icon} />}
          trailing={<Card.Text variant='muted'>{t(`feature-status.${subfeature.status}.label`)}</Card.Text>}
        >
          <Card.Text truncate>{subfeature.name}</Card.Text>
        </Card.Row>
      ))}
    </ListSection>
  ) : null;
};

FeatureCardSubfeatures.displayName = 'FeatureCard.Subfeatures';

//
// Tasks
//

type FeatureCardTasksProps = {};

/** The tasks that implement the feature, done or not. */
const FeatureCardTasks = (_: FeatureCardTasksProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.Tasks');
  const open = useOpenRow('FeatureCard.Tasks');
  return feature.tasks.length > 0 ? (
    <ListSection title={t('feature-card.tasks.title')} count={feature.tasks.length}>
      {feature.tasks.map((task) => (
        <Card.Row
          key={task.id}
          leading={<RowIcon icon={task.done ? 'ph--check-square--regular' : 'ph--square--regular'} />}
          trailing={task.milestone && <Tag.Tag>{task.milestone}</Tag.Tag>}
          onClick={open({ type: 'object', id: task.id })}
        >
          <Card.Text truncate>{task.title}</Card.Text>
        </Card.Row>
      ))}
    </ListSection>
  ) : null;
};

FeatureCardTasks.displayName = 'FeatureCard.Tasks';

//
// Showcases
//

type FeatureCardShowcasesProps = {};

/** The showcases that demonstrate the feature. */
const FeatureCardShowcases = (_: FeatureCardShowcasesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.Showcases');
  const open = useOpenRow('FeatureCard.Showcases');
  return feature.showcases.length > 0 ? (
    <ListSection title={t('feature-card.showcases.title')} count={feature.showcases.length}>
      {feature.showcases.map((showcase) => (
        <Card.Row
          key={showcase.id}
          leading={<RowIcon icon='ph--presentation-chart--regular' />}
          onClick={open({ type: 'object', id: showcase.id })}
        >
          <Card.Text truncate>{showcase.name}</Card.Text>
        </Card.Row>
      ))}
    </ListSection>
  ) : null;
};

FeatureCardShowcases.displayName = 'FeatureCard.Showcases';

//
// Specs
//

type FeatureCardSpecsProps = {};

/** The specs that describe the feature: rows that open them, or links to GitHub on a card that opens nothing. */
const FeatureCardSpecs = (_: FeatureCardSpecsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, onOpen } = useFeatureCardContext('FeatureCard.Specs');
  const open = useOpenRow('FeatureCard.Specs');
  return feature.specs.length > 0 ? (
    <ListSection title={t('feature-card.specs.title')} count={feature.specs.length}>
      {feature.specs.map((spec) =>
        onOpen ? (
          <Card.Row
            key={spec}
            icon='ph--file-code--regular'
            onClick={open({ type: 'spec', path: spec, id: feature.specObjects?.[Feature.getSpecPath(spec)] })}
            data-testid='feature-card.spec'
          >
            <Card.Text truncate>{spec}</Card.Text>
          </Card.Row>
        ) : (
          <Card.Link key={spec} label={spec} href={Feature.getSpecUrl(spec)} />
        ),
      )}
    </ListSection>
  ) : null;
};

FeatureCardSpecs.displayName = 'FeatureCard.Specs';

//
// Link
//

type FeatureCardLinkProps = {};

/** The DXN that code cites the feature by, with a button that copies it. */
const FeatureCardLink = (_: FeatureCardLinkProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.Link');
  const { link } = feature;
  return link ? (
    <Card.Row
      leading={<RowIcon icon='ph--hash--regular' />}
      trailing={
        <Card.Action
          icon='ph--copy--regular'
          label={t('feature-card.copy-link.label')}
          data-testid='feature-card.copy-link'
          onClick={() =>
            // The browser refuses the write without focus or permission; nothing else depends on it.
            navigator.clipboard.writeText(link).catch((error) => log.warn('copy feature link failed', { error }))
          }
        />
      }
      data-testid='feature-card.link'
    >
      <Card.Text truncate>{link}</Card.Text>
    </Card.Row>
  ) : null;
};

FeatureCardLink.displayName = 'FeatureCard.Link';

//
// Code
//

type FeatureCardCodeProps = {};

/** The tests and code that cite the feature, each a link to its line on GitHub. */
const FeatureCardCode = (_: FeatureCardCodeProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature } = useFeatureCardContext('FeatureCard.Code');
  return feature.code.length > 0 ? (
    <ListSection title={t('feature-card.code.title')} count={feature.code.length}>
      {feature.code.map((link) => (
        <Card.Link
          key={`${link.path}:${link.line}`}
          label={`${link.symbol ?? link.path} · ${link.path}:${link.line}`}
          href={Feature.getCodeUrl(link)}
          data-testid='feature-card.code'
        />
      ))}
    </ListSection>
  ) : null;
};

FeatureCardCode.displayName = 'FeatureCard.Code';

//
// Exports
//

export {
  FeatureCardBody as Body,
  FeatureCardCode as Code,
  FeatureCardDependencies as Dependencies,
  FeatureCardDependencyCount as DependencyCount,
  FeatureCardDependents as Dependents,
  FeatureCardDescription as Description,
  FeatureCardHeader as Header,
  FeatureCardLink as Link,
  FeatureCardMenu as Menu,
  FeatureCardProvider as Provider,
  FeatureCardRoot as Root,
  FeatureCardSave as Save,
  FeatureCardShowcaseLead as ShowcaseLead,
  FeatureCardShowcases as Showcases,
  FeatureCardSpecs as Specs,
  FeatureCardStatus as Status,
  FeatureCardSubfeatureCount as SubfeatureCount,
  FeatureCardSubfeatures as Subfeatures,
  FeatureCardTags as Tags,
  FeatureCardTaskCount as TaskCount,
  FeatureCardTasks as Tasks,
  FeatureCardTestCount as TestCount,
  FeatureCardTitle as Title,
};

export type {
  FeatureCardBodyProps as BodyProps,
  FeatureCardCodeProps as CodeProps,
  FeatureCardCountProps as CountProps,
  FeatureCardDependenciesProps as DependenciesProps,
  FeatureCardDependentsProps as DependentsProps,
  FeatureCardDescriptionProps as DescriptionProps,
  FeatureCardHeaderProps as HeaderProps,
  FeatureCardLinkProps as LinkProps,
  FeatureCardMenuProps as MenuProps,
  FeatureCardProviderProps as ProviderProps,
  FeatureCardRootProps as RootProps,
  FeatureCardSaveProps as SaveProps,
  FeatureCardShowcasesProps as ShowcasesProps,
  FeatureCardSpecsProps as SpecsProps,
  FeatureCardStatusProps as StatusProps,
  FeatureCardSubfeaturesProps as SubfeaturesProps,
  FeatureCardTagsProps as TagsProps,
  FeatureCardTasksProps as TasksProps,
  FeatureCardTitleProps as TitleProps,
};
