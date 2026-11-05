//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React, { useMemo, useState } from 'react';

import { type Verdict } from '@dxos/deus/review';
import { useObject } from '@dxos/echo-react';
import { CollaborativeTextEditor } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { Feature } from '#types';

import { CodeNamespace } from '../../namespace.ts';
import * as FeatureAnchor from '../../util/feature-anchor.ts';
import { STATUS_STYLE } from '../SpecModel/review.ts';
import { RequirementIcon, RequirementId, RowIcon } from './fields.tsx';

/** Extensions for the editor of the feature's string at `path`, such as comments on it. */
export type RequirementEditorExtensions = (field: { path: readonly (string | number)[] }) => Extension[];

export type RequirementEditorProps = {
  /** The live feature, whose requirement texts the rows edit in place. */
  feature: Feature.Feature;
  /** Added to each row's editor, by the requirement text's path (the feature form's `extensions`). */
  extensions?: RequirementEditorExtensions;
  /** `plain` rows read as text until a row is focused. */
  variant?: 'default' | 'plain';
  /** Whether the remove and add actions show; the rows stay editable either way. */
  actions?: boolean;
  inert?: boolean;
  /** Each requirement's newest review verdict, by requirement id (`F-3.2`). */
  verdicts?: Readonly<Record<string, Verdict>>;
};

/**
 * A feature's requirements, each an editor bound to its text that wraps to the whole of it, with the spec id it came
 * from before it and a remove action after. Typing edits the requirement in place, so comments on it stay anchored. A
 * requirement that loses focus without text is removed. Render it inside a grid `Card.Root`; its icons sit in that card's rail.
 */
export const RequirementEditor = ({
  feature,
  extensions,
  variant,
  actions = true,
  inert,
  verdicts,
}: RequirementEditorProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const [snapshot] = useObject(feature);
  const requirements = snapshot ? Feature.getRequirements(snapshot) : [];
  // Numbered under the feature's block id, as the spec would number it.
  const onAdd = () =>
    Feature.setRequirements(feature, [...Feature.getRequirements(feature), { text: '' }], {
      blockId: Feature.getBlockId(feature),
    });
  const onRemove = (key: string) =>
    Feature.setRequirements(
      feature,
      Feature.getRequirements(feature).filter((requirement) => requirement.key !== key),
    );
  // The row just added takes focus once, so a new requirement is written before anything else; a row that later
  // mounts at that index, or is rebuilt there, leaves the focus where it is.
  const [focusIndex, setFocusIndex] = useState<number>();
  const reviewed = verdicts && Object.keys(verdicts).length > 0;
  return (
    <Card.Section inert={inert} data-testid='requirement-editor'>
      {requirements.map((requirement, index) => (
        <Card.Row
          key={requirement.key}
          // The column's content clips overflow (for truncation), which would cut off the field's box.
          classNames='[&_.dx-card-row-content]:overflow-visible'
          leading={<RequirementIcon />}
          trailing={
            <Layout.Flex gap='sm' classNames='items-center'>
              {/* One width for every row's verdict, so the fields end on one line whatever their status. */}
              {reviewed && (
                <span className='flex justify-end w-20'>
                  {requirement.id && verdicts[requirement.id] && (
                    <RequirementVerdict verdict={verdicts[requirement.id]} />
                  )}
                </span>
              )}
              {actions && (
                <Card.Action
                  icon='ph--x--regular'
                  label={t('requirement-editor.remove.label')}
                  data-testid={`requirement-editor.${index}.remove`}
                  onClick={() => onRemove(requirement.key)}
                />
              )}
            </Layout.Flex>
          }
        >
          {/* The spec id leads the text, as it does in the read-only list; the field takes the rest of the row. */}
          <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
            {requirement.id && <RequirementId id={requirement.id} />}
            {/* A requirement left without text is removed, as one cleared of its text is. */}
            <div
              className='grow min-w-0'
              onFocus={() => setFocusIndex(undefined)}
              onBlur={() => {
                if (!feature.requirements?.[requirement.key]?.text.trim()) {
                  onRemove(requirement.key);
                }
              }}
            >
              <RequirementText
                feature={feature}
                requirementKey={requirement.key}
                extensions={extensions}
                placeholder={t('requirement-editor.text.label')}
                variant={variant}
                autoFocus={index === focusIndex}
                testId={`requirement-editor.${index}.text`}
              />
            </div>
          </Layout.Flex>
        </Card.Row>
      ))}
      {actions && (
        <Card.Row
          leading={<RowIcon icon='ph--plus--regular' />}
          data-testid='requirement-editor.add'
          onClick={() => {
            setFocusIndex(requirements.length);
            onAdd();
          }}
        >
          <Card.Text variant='muted'>{t('requirement-editor.add.label')}</Card.Text>
        </Card.Row>
      )}
    </Card.Section>
  );
};

/** A requirement's newest review verdict, naming its review on hover. */
const RequirementVerdict = ({ verdict }: { verdict: Verdict }) => {
  const { label, hue, icon } = STATUS_STYLE[verdict.status];
  const reviewed = [verdict.review?.date, verdict.review?.commit?.slice(0, 7)].filter(Boolean).join(' · ');
  return (
    <Tag.Tag
      hue={hue}
      title={[verdict.summary, verdict.note, reviewed].filter(Boolean).join('\n\n')}
      data-testid='requirement-editor.verdict'
      data-status={verdict.status}
    >
      <Icon.Icon icon={icon} size='xs' />
      {label}
    </Tag.Tag>
  );
};

type RequirementTextProps = {
  feature: Feature.Feature;
  requirementKey: string;
  extensions?: RequirementEditorExtensions;
  placeholder?: string;
  variant?: RequirementEditorProps['variant'];
  autoFocus?: boolean;
  testId?: string;
};

/** One requirement's text, edited as collaborative text. */
const RequirementText = ({ feature, requirementKey, extensions, ...props }: RequirementTextProps) => {
  const path = useMemo(() => FeatureAnchor.getPath({ field: 'requirement', key: requirementKey }), [requirementKey]);
  const fieldExtensions = useMemo(() => extensions?.({ path }), [extensions, path]);
  return <CollaborativeTextEditor object={feature} path={path} extensions={fieldExtensions} {...props} />;
};
