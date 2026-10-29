//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';

import { type Feature } from '#types';

import { FEATURE_FIELD_MAP, FeatureValues, useFeatureValues } from '../FeatureArticle/index.ts';

export type FeatureSectionProps = {
  subject: Feature.Feature;
};

/**
 * What a feature says (its name, description, requirements and status) as a form, edited in place where the feature is
 * embedded. Its card is the read-only version; how it relates to the rest is in its article and the companion.
 */
export const FeatureSection = ({ subject }: FeatureSectionProps) => {
  const { values, onValuesChanged } = useFeatureValues(subject);

  return (
    <Form.Root
      db={Obj.getDatabase(subject)}
      schema={FeatureValues}
      values={values}
      fieldMap={FEATURE_FIELD_MAP}
      onValuesChanged={onValuesChanged}
    >
      <div className='p-2'>
        <Form.Content>
          <Form.Fields />
        </Form.Content>
      </div>
    </Form.Root>
  );
};
