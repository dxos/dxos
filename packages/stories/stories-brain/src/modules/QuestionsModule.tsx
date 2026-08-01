//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type Question, QuestionStore } from '@dxos/pipeline-discord';
import { type ModuleProps } from '@dxos/story-modules';

import { QuestionsPanel } from '../components';
import { CrawlerStores } from '../testing';

/** LEFT (bottom): standing questions the crawl attempts as targets drain (from the crawler runtime). */
export const QuestionsModule = (_: ModuleProps) => {
  const crawler = useCapability(CrawlerStores);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const listed = await crawler.runPromise(QuestionStore.pipe(Effect.flatMap((store) => store.list())));
    setQuestions(listed);
  }, [crawler]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = useCallback(
    (text: string) => {
      setBusy(true);
      void crawler
        .runPromise(QuestionStore.pipe(Effect.flatMap((store) => store.add(text))))
        .then(() => refresh())
        .finally(() => setBusy(false));
    },
    [crawler, refresh],
  );

  return <QuestionsPanel questions={questions} disabled={busy} onAdd={handleAdd} />;
};
