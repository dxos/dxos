//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useAnimatedText } from './useAnimatedText';

export type TextBlockProps = ThemedClassName<{ text: string }>;

export const TextBlock = ({ classNames, text }: TextBlockProps) => {
  const animatedText = useAnimatedText(text);
  return <div className={mx(classNames)}>{animatedText}</div>;
};
