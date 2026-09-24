//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { QuestionStore } from '@dxos/pipeline-discord';

import { QuestionsPanel } from '../components/index.ts';
import { CrawlerStores } from '../testing/index.ts';

/** LEFT (bottom): standing questions the crawl attempts as targets drain (from the crawler runtime). */
export const QuestionsModule = () => {
  const crawler = useCapability(CrawlerStores);
  const [questions, setQuestions] = useState<QuestionStore.Question[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const listed = await crawler.runPromise(QuestionStore.list());
    setQuestions(listed);
  }, [crawler]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAdd = useCallback(
    (text: string) => {
      setBusy(true);
      void crawler
        .runPromise(QuestionStore.add(text))
        .then(() => refresh())
        .finally(() => setBusy(false));
    },
    [crawler, refresh],
  );

  return <QuestionsPanel questions={questions} disabled={busy} onAdd={handleAdd} />;
};
