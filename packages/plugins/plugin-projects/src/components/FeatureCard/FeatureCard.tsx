//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import {
  type FeatureLookup,
  type FeatureModel,
  type FeatureRelation,
  type FeatureSignal,
  type FeatureStage,
  getFeatureIdParts,
  getFeatureSignals,
} from './feature.ts';

export const FEATURE_STAGE_STYLE: Record<FeatureStage, { icon: string; hue: Tag.TagHue }> = {
  planned: { icon: 'ph--circle-dashed--regular', hue: 'neutral' },
  preview: { icon: 'ph--flask--regular', hue: 'amber' },
  stable: { icon: 'ph--seal-check--regular', hue: 'emerald' },
};

const SIGNAL_STYLE: Record<FeatureSignal, { icon: string; hue: Tag.TagHue }> = {
  'missing-dependency': { icon: 'ph--link-break--regular', hue: 'error' },
  'blocked': { icon: 'ph--lock--regular', hue: 'error' },
  'overclaimed': { icon: 'ph--arrow-fat-up--regular', hue: 'warning' },
  'untested': { icon: 'ph--test-tube--regular', hue: 'warning' },
  'in-flight': { icon: 'ph--git-pull-request--regular', hue: 'info' },
  'unplanned': { icon: 'ph--calendar-x--regular', hue: 'neutral' },
};

const RELATION_HUE: Record<FeatureRelation, Tag.TagHue> = { dependency: 'sky', dependent: 'violet' };

export type FeatureCardProps = {
  feature: FeatureModel;
  /** Resolves `dependsOn` ids to features, for their labels, stages and the derived signals. */
  lookup: FeatureLookup;
  /** Adds the description and the requirement and task lists. */
  expanded?: boolean;
  /** Like `expanded`, shows every signal and each dependency rather than their counts. */
  selected?: boolean;
  /** How this card relates to the selected feature; dims nothing by itself. */
  relation?: FeatureRelation;
  onSelect?: (feature: FeatureModel) => void;
  onSelectDependency?: (id: string) => void;
};

/**
 * One feature of a spec: its stage, the derived signals, test coverage, the work implementing it,
 * and the features it needs. Stage and signals each carry an icon and a word, so colour is never
 * the only cue. A compact card shows only the most serious signal and a dependency count, so the
 * tag row stays on one line and dependencies do not outweigh the feature.
 */
export const FeatureCard = ({
  feature,
  lookup,
  expanded,
  selected,
  relation,
  onSelect,
  onSelectDependency,
}: FeatureCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const stage = FEATURE_STAGE_STYLE[feature.stage];
  const detailed = expanded || selected;
  const signals = getFeatureSignals(feature, lookup);
  const shownSignals = detailed ? signals : signals.slice(0, 1);
  const hiddenSignals = signals.slice(shownSignals.length);
  const missingDependency = signals.includes('missing-dependency');
  const covered = feature.requirements.filter((requirement) => requirement.covered).length;
  const openTasks = feature.tasks.filter((task) => !task.done);
  const milestones = [...new Set(openTasks.flatMap((task) => (task.milestone ? [task.milestone] : [])))];

  return (
    <Card.Root
      grid
      selected={selected}
      onClick={onSelect ? () => onSelect(feature) : undefined}
      data-testid='feature-card'
      data-feature={feature.id}
      data-relation={relation}
    >
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={stage.icon} hue={stage.hue} label={t(`feature-stage.${feature.stage}.label`)} />
        </Layout.Block>
        <Card.Title lines={2}>{feature.name}</Card.Title>
        <Layout.Block rail='end'>
          <Card.Text variant='muted'>{feature.key}</Card.Text>
        </Layout.Block>
      </Card.Header>

      <Card.Body>
        <Card.Row>
          <div className='flex flex-wrap gap-1'>
            <Tag.Tag hue={stage.hue}>{t(`feature-stage.${feature.stage}.label`)}</Tag.Tag>
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
          </div>
        </Card.Row>

        {expanded && feature.description && (
          <Card.Row span='full'>
            <Card.Text variant='muted' lines={3}>
              {feature.description}
            </Card.Text>
          </Card.Row>
        )}

        {feature.requirements.length > 0 && (
          <Card.Row icon='ph--check-square--regular'>
            <Card.Text truncate>
              {t('feature-card.coverage.label', { covered, total: feature.requirements.length })}
            </Card.Text>
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

        {!detailed && feature.dependsOn.length > 0 && (
          <Card.Row icon={missingDependency ? 'ph--link-break--regular' : 'ph--tree-structure--regular'}>
            <Card.Text truncate>{t('feature-card.depends-on.label', { count: feature.dependsOn.length })}</Card.Text>
          </Card.Row>
        )}
        {detailed && feature.dependsOn.length > 0 && (
          <Card.Section title={t('feature-card.depends-on.title')}>
            {feature.dependsOn.map((id) => {
              const dependency = lookup(id);
              if (!dependency) {
                return (
                  <Card.Row
                    key={id}
                    icon='ph--link-break--regular'
                    trailing={<Card.Text variant='muted'>{t('feature-card.missing-dependency.trailing')}</Card.Text>}
                    title={id}
                  >
                    <Card.Text truncate>{t('feature-card.missing-dependency.label', getFeatureIdParts(id))}</Card.Text>
                  </Card.Row>
                );
              }
              const sameSpec = dependency.specKey === feature.specKey;
              return (
                <Card.Row
                  key={id}
                  icon={FEATURE_STAGE_STYLE[dependency.stage].icon}
                  trailing={<Card.Text variant='muted'>{dependency.key}</Card.Text>}
                  onClick={
                    onSelectDependency
                      ? (event: MouseEvent) => {
                          // The row sits inside a clickable card; selecting the dependency must not also select this card.
                          event.stopPropagation();
                          onSelectDependency(id);
                        }
                      : undefined
                  }
                >
                  <Card.Text truncate>
                    {sameSpec ? dependency.name : `${dependency.specName} · ${dependency.name}`}
                  </Card.Text>
                </Card.Row>
              );
            })}
          </Card.Section>
        )}

        {expanded && feature.requirements.length > 0 && (
          <Card.Section title={t('feature-card.requirements.title')}>
            {feature.requirements.map((requirement) => (
              <Card.Row
                key={requirement.key}
                align='start'
                icon={requirement.covered ? 'ph--check-circle--regular' : 'ph--circle--regular'}
                trailing={<Card.Text variant='muted'>{requirement.key}</Card.Text>}
              >
                <Card.Text lines={2}>{requirement.text}</Card.Text>
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
              >
                <Card.Text truncate>{task.title}</Card.Text>
              </Card.Row>
            ))}
          </Card.Section>
        )}
      </Card.Body>
    </Card.Root>
  );
};
