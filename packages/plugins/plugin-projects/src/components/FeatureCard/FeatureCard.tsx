//
// Copyright 2026 DXOS.org
//

import React, {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import * as Button from '@dxos/react-ui/Button';
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

const STATUSES: FeatureStatus[] = ['planned', 'in-progress', 'prototype', 'operational', 'failing'];

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
  /** False where the subfeatures are edited beside the card, as in the feature's article. */
  showSubfeatures?: boolean;
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
  /** Wraps and grows with its text; Enter still commits, Shift+Enter breaks the line. */
  multiline?: boolean;
  /** No well, for a field that should read as the row's text until it is focused. */
  subdued?: boolean;
  onCommit: (value: string) => void;
};

const stopPropagation = (event: MouseEvent | PointerEvent) => event.stopPropagation();

type StatusItemsProps = {
  value: FeatureStatus;
  onChange: (status: FeatureStatus) => void;
  testId: string;
};

/** The five statuses as radio items, shared by the card menu and the status icon's own menu. */
const StatusItems = ({ value, onChange, testId }: StatusItemsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Menu.RadioItemGroup
      value={value}
      onValueChange={({ value: selected }) => {
        const next = STATUSES.find((candidate) => candidate === selected);
        if (next && next !== value) {
          onChange(next);
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
          data-testid={`${testId}.${candidate}`}
        />
      ))}
    </Menu.RadioItemGroup>
  );
};

type StatusIconProps = {
  status: FeatureStatus;
  /** Without it the icon is a plain glyph. */
  onChange?: (status: FeatureStatus) => void;
  /** Row icons are muted, so the header's status icon stays the card's one strong glyph. */
  muted?: boolean;
  testId: string;
};

/** A status glyph that, given `onChange`, opens a menu of the statuses; neither press selects the card. */
const StatusIcon = ({ status, onChange, muted, testId }: StatusIconProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const style = FEATURE_STATUS_STYLE[status];
  const glyph = (
    <Icon.Icon
      icon={style.icon}
      hue={muted ? undefined : style.hue}
      tone={muted ? 'muted' : undefined}
      label={t(`feature-status.${status}.label`)}
    />
  );
  if (!onChange) {
    return glyph;
  }
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          compact
          data-testid={testId}
          // Takes the press itself, so it neither selects the card nor drags a canvas box.
          onPointerDown={stopPropagation}
          onClick={stopPropagation}
        >
          {glyph}
        </Button.Root>
      </Menu.Trigger>
      <Menu.Content onClick={stopPropagation}>
        <StatusItems value={status} onChange={onChange} testId={testId} />
      </Menu.Content>
    </Menu.Root>
  );
};

/**
 * A field of a card in edit mode, committed when it loses focus (Enter does that). Keys and presses stay in the field:
 * the card would toggle its selection, and a canvas would delete the box on Backspace.
 */
const EditField = ({ value, placeholder, label, testId, autoFocus, multiline, subdued, onCommit }: EditFieldProps) => {
  // Uncontrolled, so typing never re-renders the card; a newer model value (another peer's edit) still replaces the
  // field's text while the user has not changed it, so blur cannot commit the stale text over it.
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const shownRef = useRef(value);
  useEffect(() => {
    const field = fieldRef.current;
    if (field && field.value === shownRef.current) {
      field.value = value;
    }
    shownRef.current = value;
  }, [value]);

  const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = event.currentTarget.value.trim();
    if (next !== value) {
      onCommit(next);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.stopPropagation();
    // An IME's Enter confirms a composition candidate, not the field.
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };
  const props = {
    'ref': fieldRef,
    'defaultValue': value,
    placeholder,
    'aria-label': label,
    'data-testid': testId,
    autoFocus,
    'onBlur': handleBlur,
    'onKeyDown': handleKeyDown,
    'onPointerDown': stopPropagation,
    'onClick': stopPropagation,
  };
  // A narrow inline padding, pulled out by the same amount at the start, so the text stays where it was read and the
  // box ends at the column's edge (a canvas card's scroll area would clip anything past it).
  return multiline ? (
    // Sized by its content rather than `rows`, so a one-line description keeps the card's size.
    <Input.Textarea
      {...props}
      classNames='-ms-1 my-1 px-1 py-0 w-[calc(100%+0.25rem)] min-h-0 [field-sizing:content] resize-none'
    />
  ) : (
    <Input.Root
      {...props}
      variant={subdued ? 'subdued' : undefined}
      classNames='-ms-1 px-1 -my-0.5 w-[calc(100%+0.25rem)]'
    />
  );
};

/** Row icons sit a step below the text, so the header's status icon stays the card's one strong glyph. */
const RowIcon = ({ icon }: { icon: string }) => <Icon.Icon icon={icon} tone='muted' />;

export type SubfeatureEditorProps = {
  subfeatures: readonly Feature.Subfeature[];
  onChange: (subfeatures: Feature.Subfeature[]) => void;
};

/**
 * Subfeatures as the card lists them, editable in place: the status icon picks a status, the name is a field, and each
 * row removes itself. Every edit hands back the whole list, since subfeatures are records inside their feature.
 */
export const SubfeatureEditor = ({ subfeatures, onChange }: SubfeatureEditorProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // The row just added takes focus, so a new subfeature is named before anything else.
  const [focusIndex, setFocusIndex] = useState<number>();
  const update = (index: number, patch: Partial<Feature.Subfeature>) =>
    onChange(subfeatures.map((subfeature, candidate) => ({ ...subfeature, ...(candidate === index ? patch : {}) })));
  return (
    <Card.Root grid border={false} data-testid='subfeature-editor'>
      {subfeatures.map((subfeature, index) => (
        <Card.Row
          key={index}
          leading={
            <StatusIcon
              status={subfeature.status}
              muted
              onChange={(status) => update(index, { status })}
              testId={`subfeature-editor.${index}.status`}
            />
          }
          trailing={
            <Layout.Flex gap='xs' classNames='items-center'>
              <Card.Text variant='muted'>{t(`feature-status.${subfeature.status}.label`)}</Card.Text>
              <Card.Action
                icon='ph--x--regular'
                label={t('subfeature-editor.remove.label', { name: subfeature.name })}
                data-testid={`subfeature-editor.${index}.remove`}
                onClick={() => onChange(subfeatures.filter((_, candidate) => candidate !== index))}
              />
            </Layout.Flex>
          }
        >
          <EditField
            value={subfeature.name}
            placeholder={t('subfeature-editor.name.placeholder')}
            label={t('subfeature-editor.name.label')}
            testId={`subfeature-editor.${index}.name`}
            autoFocus={index === focusIndex}
            subdued
            onCommit={(name) => update(index, { name })}
          />
        </Card.Row>
      ))}
      <Card.Row
        leading={<RowIcon icon='ph--plus--regular' />}
        data-testid='subfeature-editor.add'
        onClick={() => {
          setFocusIndex(subfeatures.length);
          onChange([...subfeatures.map((subfeature) => ({ ...subfeature })), { name: '', status: 'planned' }]);
        }}
      >
        <Card.Text variant='muted'>{t('subfeature-editor.add.label')}</Card.Text>
      </Card.Row>
    </Card.Root>
  );
};

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
          <StatusIcon
            status={feature.status}
            onChange={onSetStatus && ((next) => onSetStatus(feature, next))}
            testId='feature-card.status-icon'
          />
        </Layout.Block>
        {/* Unclamped while editing: the clamp clips overflow, which would cut off the field's box beyond the text. */}
        <Card.Title lines={editing && onRename ? undefined : 2}>
          {editing && onRename ? (
            <EditField
              value={feature.name}
              placeholder={t('feature-card.name.placeholder')}
              label={t('feature-card.name.label')}
              testId='feature-card.name.input'
              autoFocus
              // A feature always has a name, so clearing the field keeps the old one.
              onCommit={(name) => name && onRename(feature, name)}
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
                <StatusItems
                  value={feature.status}
                  onChange={(next) => onSetStatus(feature, next)}
                  testId='feature-card.status'
                />
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
  showSubfeatures = true,
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
        // The row's content clips overflow (for truncation), which would cut off the field's box beyond the text.
        <Card.Row span='end' classNames='[&_.dx-card-row-content]:overflow-visible'>
          <EditField
            value={feature.description ?? ''}
            placeholder={t('feature-card.description.placeholder')}
            label={t('feature-card.description.label')}
            testId='feature-card.description.input'
            multiline
            onCommit={(description) => onDescribe(feature, description)}
          />
        </Card.Row>
      ) : (
        showFields &&
        feature.description && (
          <Card.Row span='end' data-testid='feature-card.description'>
            <Card.Text variant='muted' lines={3}>
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

      {expanded && showSubfeatures && feature.subfeatures.length > 0 && (
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
