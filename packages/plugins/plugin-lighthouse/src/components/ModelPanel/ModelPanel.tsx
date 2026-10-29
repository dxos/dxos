//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import {
  DIST_NOTE,
  adjustedCount,
  boundsOf,
  describeShape,
  describeValue,
  expressionParts,
  isFlag,
  locatedCount,
  requirementExpression,
  resetOverrides,
  roundWeight,
  scoreExpression,
  setAreasMode,
  setRequirementOverride,
  setTermOverride,
  stepOf,
  termExpression,
  termRows,
  weightRange,
} from '../../model/model-panel.ts';
import { type Rateable, type RatingModel, type RatingOverrides, areaRequirements } from '../../model/rating.ts';

/** A formula with each CURIE's prefix dimmed: the namespace tells `lh:category` from `schema:category`. */
const Expression = ({ text, title, note }: { text: string; title?: string; note?: string }) => (
  <code title={title} className='font-mono text-[0.625rem] text-fg-subtle break-words self-start max-w-full'>
    {expressionParts(text).map((part, index) =>
      index % 2 === 1 ? (
        <span key={index} className='opacity-55'>
          {part}
        </span>
      ) : (
        part
      ),
    )}
    {note && <span className='italic opacity-80'>{`   ${note}`}</span>}
  </code>
);

/** Marks a term or requirement the person made (a drawn area), not the agent. */
const Own = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return <span className='text-[0.625rem] uppercase tracking-wide text-accent-text'>{t('model-own.label')}</span>;
};

export type ModelPanelProps = {
  /** The agent's rating model. */
  model: RatingModel;
  /** The person's adjustments over it. */
  overrides?: RatingOverrides;
  /** The results the model ranks: for the bounds in each formula and each term's coverage. */
  items: readonly Rateable[];
  /** The whole new set of adjustments; the host applies it at once and saves it. */
  onChange: (overrides: RatingOverrides) => void;
  /** Opens the results map: to draw an area (`draw`), or to edit the drawn ones. */
  onMap?: (draw?: boolean) => void;
  onClose?: () => void;
};

/**
 * The session's rating model, term by term, as lighthouse's web UI shows it: what each term reads, its formula with
 * this session's numbers, and its share of the total. Each weight can be nudged and each term or requirement turned
 * off; the adjustments are the person's own and survive the agent rebuilding the model.
 */
export const ModelPanel = ({ model, overrides = {}, items, onChange, onMap, onClose }: ModelPanelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [showRationale, setShowRationale] = useState(false);
  const rows = useMemo(() => termRows(model, overrides, items), [model, overrides, items]);
  const changed = adjustedCount(model, overrides);
  const range = weightRange(model);
  const ownRequire = useMemo(() => areaRequirements(overrides), [overrides]);
  const located = useMemo(() => locatedCount(items), [items]);
  const hasAreas = (overrides.areas?.length ?? 0) > 0;

  const setTerm = useCallback(
    (id: string, patch: { weight?: number | undefined; off?: boolean }) =>
      onChange(setTermOverride(overrides, id, patch)),
    [overrides, onChange],
  );

  return (
    <Layout.Flex
      column
      gap='sm'
      role='region'
      aria-label={t('model.label')}
      classNames='@container p-3 rounded-md border border-separator bg-group-surface max-h-[60vh] overflow-y-auto'
      data-testid='lighthouse.model'
    >
      <Layout.Flex gap='sm' align='center' wrap>
        <span className='font-semibold'>{t('model-version.label', { version: model.version })}</span>
        <span className='text-xs text-fg-subtle'>
          {t('model-terms.label', { count: rows.length })}
          {model.require?.length ? ` · ${t('model-requirements.label', { count: model.require.length })}` : ''}
          {changed > 0 && ` · ${t('model-adjusted.label', { count: changed })}`}
        </span>
        <span className='grow' />
        {changed > 0 && (
          <Button.Root
            variant='ghost'
            icon='ph--arrow-counter-clockwise--regular'
            label={t(hasAreas ? 'model-reset-areas.label' : 'model-reset.label')}
            onClick={() => onChange(resetOverrides(overrides))}
            data-testid='lighthouse.model.reset'
          />
        )}
        {onClose && (
          <Button.Root variant='ghost' icon='ph--x--regular' iconOnly label={t('close.label')} onClick={onClose} />
        )}
      </Layout.Flex>

      {model.rationale && (
        <Button.Root
          variant='ghost'
          classNames='h-auto p-0 text-start font-normal'
          onClick={() => setShowRationale(!showRationale)}
          aria-expanded={showRationale}
        >
          <Typography.Text lines={showRationale ? undefined : 2} classNames='text-xs text-fg-muted whitespace-normal'>
            {model.rationale}
          </Typography.Text>
        </Button.Root>
      )}

      <Expression text={scoreExpression(model, overrides)} title={t('model-score.description')} />

      <Layout.Flex column role='table' aria-label={t('model-terms-table.label')}>
        {rows.map(({ term, weight, off, nudged, coverage, share }) => {
          const step = stepOf(term);
          return (
            <Layout.Grid
              key={term.id}
              cols={['min', 'fill', 'minmax(13rem, 16rem)', '6.5rem']}
              gap='sm'
              align='center'
              role='row'
              classNames='py-1.5 border-t border-separator text-sm'
              data-testid='lighthouse.model.term'
              data-term={term.id}
            >
              <Input.Switch
                aria-label={t('model-term-on.label', { term: term.label })}
                checked={!off}
                onCheckedChange={({ checked }) => setTerm(term.id, { off: !checked })}
              />
              <Layout.Flex column classNames={mx('min-w-0', off && 'opacity-45')} role='cell'>
                <Layout.Flex gap='sm' align='center'>
                  <span className={mx('font-medium', off && 'line-through')}>{term.label}</span>
                  {weight < 0 && (
                    <span className='text-[0.625rem] uppercase tracking-wide text-error-text'>
                      {t('model-penalty.label')}
                    </span>
                  )}
                  {term.own && <Own />}
                </Layout.Flex>
                <span className='text-xs text-fg-subtle'>
                  {describeValue(term.value)} · {describeShape(term.shape)}
                  {term.missing !== undefined && !isFlag(term.value)
                    ? ` · ${t('model-missing.label', { score: term.missing })}`
                    : ''}{' '}
                  ·{' '}
                  {'within' in term.value
                    ? t('model-coverage-inside.label', {
                        count: coverage,
                        total: items.length,
                        unlocated: items.length - located,
                      })
                    : t(isFlag(term.value) ? 'model-coverage-match.label' : 'model-coverage-have.label', {
                        count: coverage,
                        total: items.length,
                      })}
                  {'within' in term.value && onMap && (
                    <>
                      {' · '}
                      <Button.Root
                        variant='ghost'
                        classNames='h-auto p-0 min-h-0 text-xs text-accent-text font-normal hover:underline'
                        onClick={() => onMap()}
                        data-testid='lighthouse.model.areas.edit'
                      >
                        {t('model-areas-edit.label')}
                      </Button.Root>
                    </>
                  )}
                </span>
                <Expression
                  text={termExpression(term, boundsOf(model, term, items))}
                  title={t('model-term.description')}
                  note={'within' in term.value ? DIST_NOTE : undefined}
                />
              </Layout.Flex>
              <Layout.Grid
                cols={['min', 'fill', 'min', '2.6rem', 'min']}
                gap='xs'
                align='center'
                role='cell'
                classNames={off ? 'opacity-45' : undefined}
              >
                <Button.Root
                  variant='ghost'
                  iconOnly
                  icon='ph--minus--regular'
                  label={t('model-less.label', { term: term.label })}
                  disabled={off}
                  onClick={() => setTerm(term.id, { weight: roundWeight(weight - step) })}
                />
                <Input.Slider
                  aria-label={t('model-weight.label', { term: term.label })}
                  min={-range}
                  max={range}
                  step={step / 2}
                  value={[weight]}
                  disabled={off}
                  onValueChange={([value]) => value !== undefined && setTerm(term.id, { weight: roundWeight(value) })}
                />
                <Button.Root
                  variant='ghost'
                  iconOnly
                  icon='ph--plus--regular'
                  label={t('model-more.label', { term: term.label })}
                  disabled={off}
                  onClick={() => setTerm(term.id, { weight: roundWeight(weight + step) })}
                />
                <span
                  className={mx('text-end tabular-nums', nudged && 'font-semibold text-amber-text')}
                  title={nudged ? t('model-agent-weight.label', { weight: term.weight }) : undefined}
                >
                  {roundWeight(weight)}
                </span>
                {nudged ? (
                  <Button.Root
                    variant='ghost'
                    iconOnly
                    icon='ph--arrow-counter-clockwise--regular'
                    label={t('model-term-reset.label', { weight: term.weight })}
                    onClick={() => setTerm(term.id, { weight: undefined })}
                  />
                ) : (
                  <span />
                )}
              </Layout.Grid>
              <Layout.Grid cols={['fill', '2.4rem']} gap='xs' align='center' role='cell' classNames='tabular-nums'>
                <span className='h-1.5 rounded-full bg-separator overflow-hidden'>
                  <span
                    className={mx('block h-full rounded-full', weight < 0 ? 'bg-rose-fg' : 'bg-blue-fg')}
                    style={{ width: `${share * 100}%` }}
                  />
                </span>
                <span className='text-end text-xs'>{Math.round(share * 100)}%</span>
              </Layout.Grid>
            </Layout.Grid>
          );
        })}
      </Layout.Flex>

      {(model.require ?? []).length + ownRequire.length > 0 && (
        <Layout.Flex column gap='xs'>
          <span className='text-xs uppercase tracking-wide text-fg-subtle'>
            {t('model-requirements-heading.label', { penalty: model.penalty ?? 0.3 })}
          </span>
          {(model.require ?? []).map((requirement) => {
            const off = !!overrides.require?.[requirement.label]?.off;
            return (
              <Layout.Grid
                key={requirement.label}
                cols={['min', 'auto', 'fill']}
                gap='sm'
                align='center'
                classNames='text-sm'
                data-testid='lighthouse.model.requirement'
                data-requirement={requirement.label}
              >
                <Input.Switch
                  aria-label={t('model-requirement-on.label', { requirement: requirement.label })}
                  checked={!off}
                  onCheckedChange={({ checked }) =>
                    onChange(setRequirementOverride(overrides, requirement.label, !checked))
                  }
                />
                <span className={mx('font-medium', off && 'line-through opacity-45')}>{requirement.label}</span>
                <Expression text={requirementExpression(requirement)} />
              </Layout.Grid>
            );
          })}
          {ownRequire.map((requirement) => (
            <Layout.Grid
              key={requirement.label}
              cols={['min', 'auto', 'fill', 'min']}
              gap='sm'
              align='center'
              classNames='text-sm'
              data-testid='lighthouse.model.req.area'
            >
              <Icon.Icon icon='ph--map-trifold--regular' />
              <Layout.Flex gap='xs' align='center'>
                <span className='font-medium'>{requirement.label}</span>
                <Own />
              </Layout.Flex>
              <Expression text={requirementExpression(requirement)} note={DIST_NOTE} />
              <Button.Root
                variant='ghost'
                classNames='text-xs text-accent-text'
                onClick={() => onChange(setAreasMode(overrides, 'prefer'))}
                data-testid='lighthouse.model.req.prefer'
              >
                {t('model-areas-prefer.label')}
              </Button.Root>
            </Layout.Grid>
          ))}
        </Layout.Flex>
      )}

      {onMap && (
        <Layout.Flex gap='sm' align='center' wrap>
          <Button.Root
            variant='ghost'
            icon='ph--polygon--regular'
            label={t(hasAreas ? 'model-draw-another.label' : 'model-draw.label')}
            onClick={() => onMap(true)}
            data-testid='lighthouse.model.draw'
          />
          <span className='text-xs text-fg-subtle'>
            {t('model-located.label', { count: located, total: items.length })}
          </span>
        </Layout.Flex>
      )}

      <span className='text-xs text-fg-subtle'>{t('model-foot.message')}</span>
    </Layout.Flex>
  );
};
