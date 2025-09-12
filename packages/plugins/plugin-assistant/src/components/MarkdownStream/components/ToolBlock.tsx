//
// Copyright 2025 DXOS.org
//

import { ToolBlock } from '../../ToolBlock';
import { type XmlComponentProps } from '../extensions';

type SharedToolProps = { toolCallId: string; name: string };

type ToolCallProps = XmlComponentProps<SharedToolProps & { input: string }>;
type ToolResultProps = XmlComponentProps<SharedToolProps & { result: string }>;
type Summary = XmlComponentProps<{ children: string[] }>;

export type ToolBlockProps = XmlComponentProps<{
  children: (ToolCallProps | ToolResultProps | Summary)[];
}>;

export const ToolBlock = (props: ToolBlockProps) => {
  return <ToolBlock message={} />;
};
