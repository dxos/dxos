//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Editable from '@dxos/react-ui/Editable';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';
import { Feature } from '#types';

import {
  type FeatureLookup,
  type FeatureModel,
  type FeatureRelation,
  type FeatureSignal,
  type FeatureStatus,
  getFeatureSignals,
} from './feature.ts';

export const FEATURE_STATUS_STYLE: Record<FeatureStatus, { icon: string; hue: Tag.TagHue }> = {
  'planned': { icon: 'ph--circle-dashed--regular', hue: 'neutral' },
  'in-progress': { icon: 'ph--circle-half--regular', hue: 'sky' },
  'prototype': { icon: 'ph--flask--regular', hue: 'amber' },
  'operational': { icon: 'ph--seal-check--regular', hue: 'emerald' },
  'failing': { icon: 'ph--warning-octagon--regular', hue: 'rose' },
};

const SIGNAL_STYLE: Record<FeatureSignal, { icon: string; hue: Tag.TagHue }> = {
  'blocked': { icon: 'ph--lock--regular', hue: 'error' },
  'ahead': { icon: 'ph--arrow-fat-up--regular', hue: 'warning' },
  'no-evidence': { icon: 'ph--presentation-chart--regular', hue: 'warning' },
  'in-flight': { icon: 'ph--git-pull-request--regular', hue: 'info' },
  'unplanned': { icon: 'ph--calendar-x--regular', hue: 'neutral' },
};

const RELATION_HUE: Record<FeatureRelation, Tag.TagHue> = { dependency: 'sky', dependent: 'violet' };

export type FeatureCardBodyProps = {
  feature: FeatureModel;
  /** Resolves `dependsOn` ids to features, for their labels, statuses and the derived signals. */
  lookup: FeatureLookup;
  /** Adds the description and the spec, subfeature, task and showcase lists. */
  expanded?: boolean;
  /** Like `expanded`, shows every signal and each dependency rather than their counts. */
  selected?: boolean;
  /** How this card relates to the selected feature; dims nothing by itself. */
  relation?: FeatureRelation;
  /** False where dependencies are drawn some other way, such as arrows on a canvas. */
  showDependencies?: boolean;
  /** False where the description and specs are edited beside the card, as in the feature's article. */
  showFields?: boolean;
  /** Features that depend on this one; listed only when expanded, as the model stores one direction. */
  dependents?: readonly FeatureModel[];
  onSelectDependency?: (id: string) => void;
  /** Adds a remove action to each dependency row of a detailed card. */
  onRemoveDependency?: (id: string) => void;
  /** Opens a listed task or showcase by id; rows are plain text without it. */
  onOpenObject?: (id: string) => void;
  /** Makes the description editable in place, shown with a placeholder while empty. */
  onDescribe?: (feature: FeatureModel, description: string) => void;
  /** How a text field opens: a double-click, or only its pencil where a press must stay the host's (a canvas box). */
  editActivation?: InlineTextProps['activation'];
};

export type FeatureCardProps = FeatureCardBodyProps & {
  onSelect?: (feature: FeatureModel) => void;
  /** The header menu offers each of these that is given. */
  onOpen?: (feature: FeatureModel) => void;
  onSetStatus?: (feature: FeatureModel, status: FeatureStatus) => void;
  /** Takes the feature off the map it is shown on; the feature itself is kept. */
  onRemove?: (feature: FeatureModel) => void;
  /** Makes the name editable in place. */
  onRename?: (feature: FeatureModel, name: string) => void;
  /** Opens the name field, as for a feature just created; reports when it closes. */
  editingName?: boolean;
  onEditingNameChange?: (editing: boolean) => void;
};

type InlineTextProps = {
  value: string;
  placeholder: string;
  label: string;
  testId: string;
  activation?: 'dblclick' | 'none';
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onCommit: (value: string) => void;
};

/** A text field edited in place on a card, which keeps its keys and presses from the card and the canvas around it. */
const InlineText = ({
  value,
  placeholder,
  label,
  testId,
  activation = 'dblclick',
  editing,
  onEditingChange,
  onCommit,
}: InlineTextProps) => (
  <Editable.Root
    // Inert boxes on a canvas still let the field and its pencil take the pointer.
    classNames='min-w-0 pointer-events-auto'
    value={value}
    placeholder={placeholder}
    activation={activation}
    editing={editing}
    onEditingChange={onEditingChange}
    onValueChange={(next) => {
      const trimmed = next.trim();
      if (trimmed !== value) {
        onCommit(trimmed);
      }
    }}
    // The double-click's second press would otherwise toggle the card's selection back off.
    onClick={(event) => event.detail > 1 && event.stopPropagation()}
  >
    <Editable.Preview classNames='px-0' data-testid={`${testId}.preview`} />
    <Editable.Input
      aria-label={label}
      data-testid={`${testId}.input`}
      // Typing must not reach the card or the canvas, whose Delete and Backspace remove the box.
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    />
  </Editable.Root>
);

const STATUSES: FeatureStatus[] = ['planned', 'in-progress', 'prototype', 'operational', 'failing'];

/**
 * One feature: its status, the derived signals, the work toward it, the evidence that it works, and the
 * features it needs. Status and signals each carry an icon and a word, so colour is never the only cue.
 */
export const FeatureCard = ({
  onSelect,
  onOpen,
  onSetStatus,
  onRemove,
  onRename,
  editingName,
  onEditingNameChange,
  ...props
}: FeatureCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, selected, relation, editActivation } = props;
  const status = FEATURE_STATUS_STYLE[feature.status];
  return (
    <Card.Root
      grid
      selected={selected}
      onClick={onSelect ? () => onSelect(feature) : undefined}
      data-testid='feature-card'
      data-feature={feature.id}
      data-status={feature.status}
      data-relation={relation}
    >
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={status.icon} hue={status.hue} label={t(`feature-status.${feature.status}.label`)} />
        </Layout.Block>
        <Card.Title lines={2}>
          {onRename ? (
            <InlineText
              value={feature.name}
              placeholder={t('feature-card.name.placeholder')}
              label={t('feature-card.name.label')}
              testId='feature-card.name'
              activation={editActivation}
              editing={editingName}
              onEditingChange={onEditingNameChange}
              onCommit={(name) => onRename(feature, name)}
            />
          ) : (
            feature.name
          )}
        </Card.Title>
        {(onOpen || onSetStatus || onRemove) && (
          <Layout.Block rail='end' data-testid='feature-card.menu'>
            <Card.Menu label={t('feature-card.menu.label')}>
              {onOpen && (
                <Menu.Item
                  item={{ value: 'open', label: t('feature-card.open.label'), icon: 'ph--arrow-square-out--regular' }}
                  data-testid='feature-card.open'
                  onClick={() => onOpen(feature)}
                />
              )}
              {onOpen && onSetStatus && <Menu.Separator />}
              {onSetStatus && (
                <Menu.RadioItemGroup
                  value={feature.status}
                  onValueChange={({ value }) => {
                    const next = STATUSES.find((candidate) => candidate === value);
                    if (next && next !== feature.status) {
                      onSetStatus(feature, next);
                    }
                  }}
                >
                  <Menu.ItemGroupLabel>{t('feature-card.status.label')}</Menu.ItemGroupLabel>
                  {STATUSES.map((candidate) => (
                    <Menu.RadioItem
                      key={candidate}
                      item={{
                        value: candidate,
                        label: t(`feature-status.${candidate}.label`),
                        icon: FEATURE_STATUS_STYLE[candidate].icon,
                      }}
                      data-testid={`feature-card.status.${candidate}`}
                    />
                  ))}
                </Menu.RadioItemGroup>
              )}
              {(onOpen || onSetStatus) && onRemove && <Menu.Separator />}
              {onRemove && (
                <Menu.Item
                  item={{ value: 'remove', label: t('feature-card.remove.label'), icon: 'ph--minus-circle--regular' }}
                  data-testid='feature-card.remove'
                  onClick={() => onRemove(feature)}
                />
              )}
            </Card.Menu>
          </Layout.Block>
        )}
      </Card.Header>
      <FeatureCardBody {...props} />
    </Card.Root>
  );
};

/**
 * The card's body without its frame and header, for hosts that draw those themselves (the app's card
 * surface). A compact body shows only the most serious signal and counts, so the tag row stays on one line
 * and the lists do not outweigh the feature.
 */
export const FeatureCardBody = ({
  feature,
  lookup,
  expanded,
  selected,
  relation,
  showDependencies = true,
  showFields = true,
  dependents = [],
  onSelectDependency,
  onRemoveDependency,
  onOpenObject,
  onDescribe,
  editActivation,
}: FeatureCardBodyProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const status = FEATURE_STATUS_STYLE[feature.status];
  const statusLabel = t(`feature-status.${feature.status}.label`);
  const detailed = expanded || selected;
  const signals = getFeatureSignals(feature, lookup);
  const shownSignals = detailed ? signals : signals.slice(0, 1);
  const hiddenSignals = signals.slice(shownSignals.length);
  const openTasks = feature.tasks.filter((task) => !task.done);
  const milestones = [...new Set(openTasks.flatMap((task) => (task.milestone ? [task.milestone] : [])))];
  const dependencies = showDependencies ? feature.dependsOn.flatMap((id) => lookup(id) ?? []) : [];
  const open = (id: string) =>
    onOpenObject
      ? (event: MouseEvent) => {
          // The row sits inside a clickable card; opening the object must not also select the card.
          event.stopPropagation();
          onOpenObject(id);
        }
      : undefined;

  return (
    <Card.Body>
      <Card.Row>
        <Layout.Flex wrap gap='xs'>
          <Tag.Tag hue={status.hue}>{statusLabel}</Tag.Tag>
          {relation && <Tag.Tag hue={RELATION_HUE[relation]}>{t(`feature-relation.${relation}.label`)}</Tag.Tag>}
          {shownSignals.map((signal) => (
            <Tag.Tag key={signal} hue={SIGNAL_STYLE[signal].hue} data-testid={`feature-signal.${signal}`}>
              <Icon.Icon icon={SIGNAL_STYLE[signal].icon} size='xs' />
              {t(`feature-signal.${signal}.label`)}
            </Tag.Tag>
          ))}
          {hiddenSignals.length > 0 && (
            <Tag.Tag
              title={hiddenSignals.map((signal) => t(`feature-signal.${signal}.label`)).join(', ')}
              data-testid='feature-signal.more'
            >
              {t('feature-card.more-signals.label', { count: hiddenSignals.length })}
            </Tag.Tag>
          )}
        </Layout.Flex>
      </Card.Row>

      {showFields && onDescribe && (
        <Card.Row icon='ph--text-align-left--regular'>
          <InlineText
            value={feature.description ?? ''}
            placeholder={t('feature-card.description.placeholder')}
            label={t('feature-card.description.label')}
            testId='feature-card.description'
            activation={editActivation}
            onCommit={(description) => onDescribe(feature, description)}
          />
        </Card.Row>
      )}

      {expanded && showFields && !onDescribe && feature.description && (
        <Card.Row span='full'>
          <Card.Text variant='muted' lines={3}>
            {feature.description}
          </Card.Text>
        </Card.Row>
      )}

      {!expanded && feature.subfeatures.length > 0 && (
        <Card.Row icon='ph--tree-view--regular'>
          <Card.Text truncate>{t('feature-card.subfeatures.label', { count: feature.subfeatures.length })}</Card.Text>
        </Card.Row>
      )}
      {openTasks.length > 0 && (
        <Card.Row
          icon='ph--list-checks--regular'
          trailing={milestones.length > 0 && <Tag.Tag>{milestones.join(', ')}</Tag.Tag>}
        >
          <Card.Text truncate>{t('feature-card.open-tasks.label', { count: openTasks.length })}</Card.Text>
        </Card.Row>
      )}
      {!expanded && feature.showcases.length > 0 && (
        <Card.Row icon='ph--presentation-chart--regular'>
          <Card.Text truncate>{feature.showcases[0].name}</Card.Text>
        </Card.Row>
      )}
      {!detailed && dependencies.length > 0 && (
        <Card.Row icon='ph--tree-structure--regular'>
          <Card.Text truncate>{t('feature-card.depends-on.label', { count: dependencies.length })}</Card.Text>
        </Card.Row>
      )}

      {detailed && dependencies.length > 0 && (
        <Card.Section title={t('feature-card.depends-on.title')}>
          {dependencies.map((dependency) => (
            <Card.Row
              key={dependency.id}
              icon={FEATURE_STATUS_STYLE[dependency.status].icon}
              trailing={
                onRemoveDependency && (
                  <Card.Action
                    icon='ph--x--regular'
                    label={t('feature-card.remove-dependency.label', { name: dependency.name })}
                    data-testid='feature-card.remove-dependency'
                    onClick={() => onRemoveDependency(dependency.id)}
                  />
                )
              }
              onClick={
                onSelectDependency
                  ? (event: MouseEvent) => {
                      // The row sits inside a clickable card; selecting the dependency must not also select this card.
                      event.stopPropagation();
                      onSelectDependency(dependency.id);
                    }
                  : undefined
              }
            >
              <Card.Text truncate>{dependency.name}</Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}

      {expanded && dependents.length > 0 && (
        <Card.Section title={t('feature-card.dependents.title')}>
          {dependents.map((dependent) => (
            <Card.Row
              key={dependent.id}
              icon={FEATURE_STATUS_STYLE[dependent.status].icon}
              onClick={onSelectDependency ? () => onSelectDependency(dependent.id) : undefined}
            >
              <Card.Text truncate>{dependent.name}</Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}

      {expanded && feature.subfeatures.length > 0 && (
        <Card.Section title={t('feature-card.subfeatures.title')}>
          {feature.subfeatures.map((subfeature, index) => (
            <Card.Row
              key={index}
              icon={FEATURE_STATUS_STYLE[subfeature.status].icon}
              trailing={<Card.Text variant='muted'>{t(`feature-status.${subfeature.status}.label`)}</Card.Text>}
            >
              <Card.Text truncate>{subfeature.name}</Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}

      {expanded && feature.tasks.length > 0 && (
        <Card.Section title={t('feature-card.tasks.title')}>
          {feature.tasks.map((task) => (
            <Card.Row
              key={task.id}
              icon={task.done ? 'ph--check-square--regular' : 'ph--square--regular'}
              trailing={task.milestone && <Tag.Tag>{task.milestone}</Tag.Tag>}
              onClick={open(task.id)}
            >
              <Card.Text truncate>{task.title}</Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}

      {expanded && feature.showcases.length > 0 && (
        <Card.Section title={t('feature-card.showcases.title')}>
          {feature.showcases.map((showcase) => (
            <Card.Row key={showcase.id} icon='ph--presentation-chart--regular' onClick={open(showcase.id)}>
              <Card.Text truncate>{showcase.name}</Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}

      {/* Also beside the article's editable spec list, since there each row opens the imported spec. */}
      {detailed && (showFields || onOpenObject) && feature.specs.length > 0 && (
        <Card.Section title={t('feature-card.specs.title')}>
          {feature.specs.map((spec) => {
            const specId = feature.specObjects?.[Feature.getSpecPath(spec)];
            return specId && onOpenObject ? (
              <Card.Row key={spec} icon='ph--file-code--regular' onClick={open(specId)}>
                <Card.Text truncate>{spec}</Card.Text>
              </Card.Row>
            ) : (
              <Card.Link key={spec} label={spec} href={Feature.getSpecUrl(spec)} />
            );
          })}
        </Card.Section>
      )}
    </Card.Body>
  );
};
