//
// Copyright 2026 DXOS.org
//

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Trans } from 'react-i18next';
import { describe, expect, test } from 'vitest';

import { useTranslation } from './TranslationsContext.ts';
import { TranslationsProvider } from './TranslationsProvider.tsx';

const ns = 'org.dxos.test.translations-context';

const resources = [{ 'en-US': { [ns]: { 'greeting.message': 'Hello <b>world</b>' } } }];

const Greeting = () => {
  const { t } = useTranslation(ns);
  return <Trans t={t} i18nKey='greeting.message' components={{ b: <b /> }} />;
};

describe('useTranslation', () => {
  test('Trans resolves keys in the namespace of the returned t', () => {
    render(
      <TranslationsProvider resourceExtensions={resources}>
        <Greeting />
      </TranslationsProvider>,
    );
    expect(screen.getByText('world').tagName).toBe('B');
    expect(screen.queryByText('greeting.message')).toBeNull();
  });
});
