//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

export type Source = {
  text?: string;
  /**
   * The Text object behind the source, when there is one. Extraction takes a Text ref, so an
   * object whose text is only reachable through the TextContent capability can be read but not
   * harvested.
   */
  textRef?: Ref.Ref<Text.Text>;
};

/**
 * Reads the text of whatever object the reader is companion to.
 *
 * Markdown documents and Text objects are resolved directly; anything else goes through the
 * app-wide `TextContent` capability, which is how an email or a transcript becomes readable here
 * without this plugin knowing those types exist.
 */
export const useSourceText = (subject: Obj.Unknown | undefined): Source => {
  const extractors = useCapabilities(AppCapabilities.TextContent);
  const document = Obj.instanceOf(Markdown.Document, subject) ? subject : undefined;
  const [content] = useObject(document?.content);
  const [extracted, setExtracted] = useState<string | undefined>();

  const typename = subject ? Obj.getTypename(subject) : undefined;
  const direct = document || Obj.instanceOf(Text.Text, subject);

  useEffect(() => {
    if (!subject || direct) {
      setExtracted(undefined);
      return;
    }

    let cancelled = false;
    const extractor = extractors.find(({ id }) => id === typename);
    if (!extractor) {
      setExtracted(undefined);
      return;
    }

    void extractor
      .getTextContent(subject)
      .then((text) => !cancelled && setExtracted(text))
      .catch((err) => log.catch(err));

    return () => {
      cancelled = true;
    };
  }, [subject, typename, direct, extractors]);

  if (document) {
    return { text: content?.content, textRef: document.content };
  }
  if (Obj.instanceOf(Text.Text, subject)) {
    return { text: subject.content };
  }

  return { text: extracted };
};
