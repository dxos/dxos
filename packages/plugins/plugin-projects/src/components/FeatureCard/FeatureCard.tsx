//
// Copyright 2026 DXOS.org
//

import React, { type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, useState } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as SystemButton from '@dxos/react-ui/SystemButton';
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
  /** Lets edit mode change the description. */
  onDescribe?: (feature: FeatureModel, description: string) => void;
  /** Edit mode: the description is a field, shown even while empty. */
  editing?: boolean;
};

export type FeatureCardProps = FeatureCardBodyProps & {
  onSelect?: (feature: FeatureModel) => void;
  /** The header menu offers each of these that is given. */
  onOpen?: (feature: FeatureModel) => void;
  onSetStatus?: (feature: FeatureModel, status: FeatureStatus) => void;
  /** Takes the feature off the map it is shown on; the feature itself is kept. */
  onRemove?: (feature: FeatureModel) => void;
  /** Lets edit mode change the name; with `onDescribe`, either adds the header's edit button. */
  onRename?: (feature: FeatureModel, name: string) => void;
  /** Controlled edit mode, as for a feature just created; uncontrolled when omitted. */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** For a host of fixed height (a canvas box): the card fills it and the body scrolls under the header. */
  scroll?: boolean;
  /** False where the host marks the selected card itself, as a masonry grid's ring does. */
  markSelected?: boolean;
};

type EditFieldProps = {
  value: string;
  placeholder: string;
  label: string;
  testId: string;
  autoFocus?: boolean;
  /** `start` where something sits right after the field (the header's Save button), so the box clears only the start. */
  extend?: 'both' | 'start';
  onCommit: (value: string) => void;
};

const stopPropagation = (event: MouseEvent | PointerEvent) => event.stopPropagation();

/**
 * A single-line field of a card in edit mode, committed when it loses focus (Enter does that). Keys and presses stay in
 * the field: the card would toggle its selection, and a canvas would delete the box on Backspace.
 */
const EditField = ({ value, placeholder, label, testId, autoFocus, extend = 'both', onCommit }: EditFieldProps) => {
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.currentTarget.value.trim();
    if (next !== value) {
      onCommit(next);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };
  return (
    <Input.Root
      // Pulled out (and widened) by its padding and by its height over a line, so the text stays where it was read, the
      // box clears it and the card keeps its size.
      classNames={['-ms-2 -my-0.5', extend === 'both' ? '-me-2 w-[calc(100%+1rem)]' : 'w-[calc(100%+0.5rem)]']}
      defaultValue={value}
      placeholder={placeholder}
      aria-label={label}
      data-testid={testId}
      autoFocus={autoFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDown={stopPropagation}
      onClick={stopPropagation}
    />
  );
};

/** Row icons sit a step below the text, so the header's status icon stays the card's one strong glyph. */
const RowIcon = ({ icon }: { icon: string }) => <Icon.Icon icon={icon} tone='muted' />;

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
  editing: editingProp,
  onEditingChange,
  scroll,
  markSelected = true,
  ...props
}: FeatureCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { feature, selected, relation, onDescribe } = props;
  const status = FEATURE_STATUS_STYLE[feature.status];
  const [editingState, setEditingState] = useState(false);
  const editing = editingProp ?? editingState;
  const setEditing = (next: boolean) => {
    setEditingState(next);
    onEditingChange?.(next);
  };
  return (
    <Card.Root
      grid
      // A group, so the header's edit button is muted until the pointer is over the card.
      classNames={['group/card', scroll && 'h-full grid-rows-[min-content_minmax(0,1fr)]']}
      selected={markSelected && selected}
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
          {editing && onRename ? (
            <EditField
              value={feature.name}
              placeholder={t('feature-card.name.placeholder')}
              label={t('feature-card.name.label')}
              testId='feature-card.name.input'
              autoFocus
              extend='start'
              onCommit={(name) => onRename(feature, name)}
            />
          ) : (
            feature.name
          )}
        </Card.Title>
        {(onRename || onDescribe) && (
          <Layout.Block rail='end'>
            {editing ? (
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
            ) : (
              <SystemButton.Edit
                variant='ghost'
                classNames='text-fg-muted group-hover/card:text-inherit'
                data-testid='feature-card.edit'
                onPointerDown={stopPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(true);
                }}
              />
            )}
          </Layout.Block>
        )}
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
      {scroll ? (
        // A subgrid of the card, so rows keep its rails; containment would make it a standalone grid instead.
        <ScrollArea.Root classNames='col-span-full grid-cols-subgrid [container-type:normal]'>
          <ScrollArea.Viewport classNames='col-span-full grid grid-cols-subgrid content-start [&>.dx-card-body]:col-span-full'>
            <FeatureCardBody {...props} editing={editing} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      ) : (
        <FeatureCardBody {...props} editing={editing} />
      )}
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
  editing,
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
      {/* Directly under the title, which it describes. */}
      {showFields && editing && onDescribe ? (
        <Card.Row span='end'>
          <EditField
            value={feature.description ?? ''}
            placeholder={t('feature-card.description.placeholder')}
            label={t('feature-card.description.label')}
            testId='feature-card.description.input'
            onCommit={(description) => onDescribe(feature, description)}
          />
        </Card.Row>
      ) : (
        showFields &&
        feature.description && (
          <Card.Row span='end' data-testid='feature-card.description'>
            <Card.Text variant='muted' {...(expanded ? { lines: 3 } : { truncate: true })}>
              {feature.description}
            </Card.Text>
          </Card.Row>
        )
      )}
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

      {!expanded && feature.subfeatures.length > 0 && (
        <Card.Row leading={<RowIcon icon='ph--tree-view--regular' />}>
          <Card.Text truncate>{t('feature-card.subfeatures.label', { count: feature.subfeatures.length })}</Card.Text>
        </Card.Row>
      )}
      {openTasks.length > 0 && (
        <Card.Row
          leading={<RowIcon icon='ph--list-checks--regular' />}
          trailing={milestones.length > 0 && <Tag.Tag>{milestones.join(', ')}</Tag.Tag>}
        >
          <Card.Text truncate>{t('feature-card.open-tasks.label', { count: openTasks.length })}</Card.Text>
        </Card.Row>
      )}
      {!expanded && feature.showcases.length > 0 && (
        <Card.Row leading={<RowIcon icon='ph--presentation-chart--regular' />}>
          <Card.Text truncate>{feature.showcases[0].name}</Card.Text>
        </Card.Row>
      )}
      {!detailed && dependencies.length > 0 && (
        <Card.Row leading={<RowIcon icon='ph--tree-structure--regular' />}>
          <Card.Text truncate>{t('feature-card.depends-on.label', { count: dependencies.length })}</Card.Text>
        </Card.Row>
      )}

      {detailed && dependencies.length > 0 && (
        <Card.Section title={t('feature-card.depends-on.title')}>
          {dependencies.map((dependency) => (
            <Card.Row
              key={dependency.id}
              leading={<RowIcon icon={FEATURE_STATUS_STYLE[dependency.status].icon} />}
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
              leading={<RowIcon icon={FEATURE_STATUS_STYLE[dependent.status].icon} />}
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
              leading={<RowIcon icon={FEATURE_STATUS_STYLE[subfeature.status].icon} />}
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
              leading={<RowIcon icon={task.done ? 'ph--check-square--regular' : 'ph--square--regular'} />}
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
            <Card.Row
              key={showcase.id}
              leading={<RowIcon icon='ph--presentation-chart--regular' />}
              onClick={open(showcase.id)}
            >
              <Card.Text truncate>{showcase.name}</Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}

      {expanded && showFields && feature.specs.length > 0 && (
        <Card.Section title={t('feature-card.specs.title')}>
          {feature.specs.map((spec) => (
            <Card.Link key={spec} label={spec} href={Feature.getSpecUrl(spec)} />
          ))}
        </Card.Section>
      )}
    </Card.Body>
  );
};
