//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, createContext, forwardRef, useContext } from 'react';

import { log } from '@dxos/log';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import * as Util from '@dxos/react-ui/Util';

import { Feature } from '#types';

import { ProjectsNamespace } from '../../namespace.ts';
import {
  type FeatureLookup,
  type FeatureModel,
  type FeatureRelation,
  type FeatureSignal,
  type FeatureTarget,
  getFeatureSignals,
} from './feature.ts';
import { ACTIVE_STYLE, FEATURE_STATUS_STYLE, RequirementIcon, RequirementId, RowIcon, StatusIcon } from './fields.tsx';

const SIGNAL_STYLE: Record<FeatureSignal, { icon: string; hue: Tag.TagHue }> = {
  'blocked': { icon: 'ph--lock--regular', hue: 'error' },
  'ahead': { icon: 'ph--arrow-fat-up--regular', hue: 'warning' },
  'no-evidence': { icon: 'ph--presentation-chart--regular', hue: 'warning' },
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
  onOpen?: (target: FeatureTarget) => void;
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
}>;

/**
 * The card's state without its frame, for a host that draws the frame itself (an article, the app's card surface).
 * Read-only: a feature is edited in its article, where every field has room.
 */
const FeatureCardProvider = ({ children, ...props }: FeatureCardProviderProps) => (
  <FeatureCardContext.Provider value={props}>{children}</FeatureCardContext.Provider>
);

FeatureCardProvider.displayName = 'FeatureCard.Provider';

//
// Root
//

type FeatureCardRootProps = Omit<FeatureCardProviderProps, 'children'> & Omit<Card.RootProps, 'onChange'>;

/**
 * One feature as a card: its parts are composed by the host. Focus, selection and opening the card belong to the host's
 * item (a `Focus.Item`, a canvas box); the card is `asChild`-friendly so it can be that item's child.
 */
const FeatureCardRoot = Util.composable<HTMLDivElement, FeatureCardRootProps>(
  ({ feature, lookup, relation, onOpen, children, ...props }, forwardedRef) => (
    <FeatureCardProvider feature={feature} lookup={lookup} relation={relation} onOpen={onOpen}>
      <Card.Root
        grid
        {...props}
        data-testid='feature-card'
        data-feature={feature.id}
        data-status={feature.status}
        data-active={feature.active || undefined}
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

/** The status icon. */
const FeatureCardStatus = (_: FeatureCardStatusProps) => {
  const { feature } = useFeatureCardContext('FeatureCard.Status');
  return (
    <Layout.Block rail='start' data-testid='feature-card.status-icon'>
      <StatusIcon status={feature.status} />
    </Layout.Block>
  );
};

FeatureCardStatus.displayName = 'FeatureCard.Status';

//
// Title
//

type FeatureCardTitleProps = {};

/** The name, clamped to two lines. */
const FeatureCardTitle = (_: FeatureCardTitleProps) => {
  const { feature } = useFeatureCardContext('FeatureCard.Title');
  return <Card.Title lines={2}>{feature.name}</Card.Title>;
};

FeatureCardTitle.displayName = 'FeatureCard.Title';

//
// Marks
//

type FeatureCardMarksProps = {};

/**
 * At the header's end: a marker while someone works on the feature, and the most serious warning. Icons only, labelled
 * for the tooltip, so the header stays one line; the article spells them out.
 */
const FeatureCardMarks = (_: FeatureCardMarksProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature, lookup } = useFeatureCardContext('FeatureCard.Marks');
  const [signal] = getFeatureSignals(feature, lookup);
  if (!feature.active && !signal) {
    return null;
  }
  return (
    <Layout.Block rail='end'>
      <Layout.Flex gap='xs' classNames='items-center'>
        {feature.active && (
          <span title={t('feature-active.label')} data-testid='feature-card.active'>
            <Icon.Icon icon={ACTIVE_STYLE.icon} hue={ACTIVE_STYLE.hue} label={t('feature-active.label')} />
          </span>
        )}
        {signal && (
          <span title={t(`feature-signal.${signal}.label`)} data-testid={`feature-signal.${signal}`}>
            <Icon.Icon icon={SIGNAL_STYLE[signal].icon} tone='muted' label={t(`feature-signal.${signal}.label`)} />
          </span>
        )}
      </Layout.Flex>
    </Layout.Block>
  );
};

FeatureCardMarks.displayName = 'FeatureCard.Marks';

//
// Body
//

type FeatureCardBodyProps = Card.BodyProps;

/** The sections under the header. */
const FeatureCardBody = forwardRef<HTMLDivElement, FeatureCardBodyProps>((props, forwardedRef) => (
  <Card.Body {...props} ref={forwardedRef} />
));

FeatureCardBody.displayName = 'FeatureCard.Body';

//
// Description
//

type FeatureCardDescriptionProps = {
  /** Lines shown before the text is cut; unclamped when zero. */
  lines?: number;
};

/** The description: what the feature does when complete. Directly under the title. */
const FeatureCardDescription = ({ lines = 2 }: FeatureCardDescriptionProps) => {
  const { feature } = useFeatureCardContext('FeatureCard.Description');
  return feature.description ? (
    <Card.Row span='end' data-testid='feature-card.description'>
      <Card.Text variant='muted' lines={lines || undefined}>
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

/** The status, whether anyone is working on it, the relation to the host's selected feature, and the derived signals. */
const FeatureCardTags = ({ all }: FeatureCardTagsProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature, lookup, relation } = useFeatureCardContext('FeatureCard.Tags');
  const signals = getFeatureSignals(feature, lookup);
  const shown = all ? signals : signals.slice(0, 1);
  const hidden = signals.slice(shown.length);
  return (
    <Card.Row>
      {/* Padded by a tag's inset on a block, so wrapped tags keep the space above and below that one line has. */}
      <Layout.Flex wrap gap='xs' classNames='py-[calc((var(--dx-block-size)_-_var(--dx-label-line-height))/2)]'>
        <Tag.Tag hue={FEATURE_STATUS_STYLE[feature.status].hue}>{t(`feature-status.${feature.status}.label`)}</Tag.Tag>
        {feature.active && (
          <Tag.Tag hue={ACTIVE_STYLE.hue} data-testid='feature-tag.active'>
            <Icon.Icon icon={ACTIVE_STYLE.icon} size='xs' />
            {t('feature-active.label')}
          </Tag.Tag>
        )}
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
// Summary
//

type FeatureCardSummaryProps = {};

/**
 * What the feature holds, a row each: its subfeatures with how many are operational, and how many requirements define
 * it, so a card says how far down the map goes without listing it.
 */
const FeatureCardSummary = (_: FeatureCardSummaryProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature } = useFeatureCardContext('FeatureCard.Summary');
  const { subfeatures, requirements } = feature;
  const operational = subfeatures.filter((subfeature) => subfeature.status === 'operational').length;
  return (
    <>
      {subfeatures.length > 0 && (
        <Card.Row
          leading={<RowIcon icon='ph--tree-view--regular' />}
          trailing={
            // How many are operational, marked with that status's icon so the ratio needs no words.
            <span
              className='inline-flex items-center gap-1 text-description tabular-nums'
              title={t('feature-card.operational-ratio.label', { operational, count: subfeatures.length })}
              data-testid='feature-card.subfeatures-operational'
            >
              <Icon.Icon icon={FEATURE_STATUS_STYLE.operational.icon} size='xs' tone='muted' />
              {operational}/{subfeatures.length}
            </span>
          }
          data-testid='feature-card.summary'
        >
          <Card.Text truncate>{t('feature-card.subfeatures.label', { count: subfeatures.length })}</Card.Text>
        </Card.Row>
      )}
      {requirements.length > 0 && (
        <Card.Row leading={<RequirementIcon />}>
          <Card.Text truncate>{t('feature-card.requirements.label', { count: requirements.length })}</Card.Text>
        </Card.Row>
      )}
    </>
  );
};

FeatureCardSummary.displayName = 'FeatureCard.Summary';

//
// External
//

type FeatureCardExternalProps = {};

/**
 * The features it needs that sit on other specs' maps, which a canvas of one map cannot draw an arrow to: a count, with
 * their names in the tooltip.
 */
const FeatureCardExternal = (_: FeatureCardExternalProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature } = useFeatureCardContext('FeatureCard.External');
  const external = feature.external ?? [];
  if (external.length === 0) {
    return null;
  }
  return (
    <Card.Row leading={<RowIcon icon='ph--arrow-square-out--regular' />} data-testid='feature-card.external'>
      <span title={external.map(({ name }) => name).join(', ')}>
        <Card.Text truncate>{t('feature-card.external.label', { count: external.length })}</Card.Text>
      </span>
    </Card.Row>
  );
};

FeatureCardExternal.displayName = 'FeatureCard.External';

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
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
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
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
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

/** The features this one breaks down into, each with its status; a row opens it. */
const FeatureCardSubfeatures = (_: FeatureCardSubfeaturesProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature } = useFeatureCardContext('FeatureCard.Subfeatures');
  const open = useOpenRow('FeatureCard.Subfeatures');
  return feature.subfeatures.length > 0 ? (
    <ListSection title={t('feature-card.subfeatures.title')} count={feature.subfeatures.length}>
      {feature.subfeatures.map((subfeature) => (
        <Card.Row
          key={subfeature.id}
          leading={<RowIcon icon={FEATURE_STATUS_STYLE[subfeature.status].icon} />}
          trailing={<Card.Text variant='muted'>{t(`feature-status.${subfeature.status}.label`)}</Card.Text>}
          onClick={open({ type: 'object', id: subfeature.id })}
          data-testid='feature-card.subfeature'
        >
          <Card.Text truncate>{subfeature.name}</Card.Text>
        </Card.Row>
      ))}
    </ListSection>
  ) : null;
};

//
// Requirements
//

type FeatureCardRequirementsProps = {};

/** What the feature must do, each with the spec id it came from. Unclamped: these are what the reader came for. */
const FeatureCardRequirements = (_: FeatureCardRequirementsProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature } = useFeatureCardContext('FeatureCard.Requirements');
  return feature.requirements.length > 0 ? (
    <Card.Section title={t('feature-card.requirements.title')}>
      {feature.requirements.map((requirement, index) => (
        <Card.Row key={requirement.id ?? index} leading={<RequirementIcon />} data-testid='feature-card.requirement'>
          <Card.Text>
            {requirement.id && (
              <>
                <RequirementId id={requirement.id} />{' '}
              </>
            )}
            {requirement.text}
          </Card.Text>
        </Card.Row>
      ))}
    </Card.Section>
  ) : null;
};

FeatureCardRequirements.displayName = 'FeatureCard.Requirements';

FeatureCardSubfeatures.displayName = 'FeatureCard.Subfeatures';

//
// Tasks
//

type FeatureCardTasksProps = {};

/** The tasks that implement the feature, done or not. */
const FeatureCardTasks = (_: FeatureCardTasksProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature } = useFeatureCardContext('FeatureCard.Tasks');
  const open = useOpenRow('FeatureCard.Tasks');
  return feature.tasks.length > 0 ? (
    <ListSection title={t('feature-card.tasks.title')} count={feature.tasks.length}>
      {feature.tasks.map((task) => (
        <Card.Row
          key={task.id}
          leading={
            <RowIcon
              icon={task.done ? 'ph--check-square--regular' : task.active ? ACTIVE_STYLE.icon : 'ph--square--regular'}
            />
          }
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
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { feature } = useFeatureCardContext('FeatureCard.Showcases');
  const open = useOpenRow('FeatureCard.Showcases');
  return feature.showcases.length > 0 ? (
    <ListSection title={t('feature-card.showcases.title')} count={feature.showcases.length}>
      {feature.showcases.map((showcase) => (
        <Card.Row
          key={showcase.id}
          leading={<RowIcon icon='ph--presentation--regular' />}
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

/** The spec blocks the requirements came from: rows that open them, or links to GitHub on a card that opens nothing. */
const FeatureCardSpecs = (_: FeatureCardSpecsProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
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
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
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
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
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
  FeatureCardDependents as Dependents,
  FeatureCardDescription as Description,
  FeatureCardExternal as External,
  FeatureCardHeader as Header,
  FeatureCardLink as Link,
  FeatureCardMarks as Marks,
  FeatureCardProvider as Provider,
  FeatureCardRequirements as Requirements,
  FeatureCardRoot as Root,
  FeatureCardShowcases as Showcases,
  FeatureCardSpecs as Specs,
  FeatureCardStatus as Status,
  FeatureCardSubfeatures as Subfeatures,
  FeatureCardSummary as Summary,
  FeatureCardTags as Tags,
  FeatureCardTasks as Tasks,
  FeatureCardTitle as Title,
};

export type {
  FeatureCardBodyProps as BodyProps,
  FeatureCardCodeProps as CodeProps,
  FeatureCardDependenciesProps as DependenciesProps,
  FeatureCardDependentsProps as DependentsProps,
  FeatureCardDescriptionProps as DescriptionProps,
  FeatureCardExternalProps as ExternalProps,
  FeatureCardHeaderProps as HeaderProps,
  FeatureCardLinkProps as LinkProps,
  FeatureCardMarksProps as MarksProps,
  FeatureCardProviderProps as ProviderProps,
  FeatureCardRequirementsProps as RequirementsProps,
  FeatureCardRootProps as RootProps,
  FeatureCardShowcasesProps as ShowcasesProps,
  FeatureCardSpecsProps as SpecsProps,
  FeatureCardStatusProps as StatusProps,
  FeatureCardSubfeaturesProps as SubfeaturesProps,
  FeatureCardSummaryProps as SummaryProps,
  FeatureCardTagsProps as TagsProps,
  FeatureCardTasksProps as TasksProps,
  FeatureCardTitleProps as TitleProps,
};
