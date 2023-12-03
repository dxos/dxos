//
// Copyright 2023 DXOS.org
//

import mermaid from 'mermaid';
import React, { useEffect, useRef, useState } from 'react';

export type MermaidDiagramProps = {
  source: string;
};

/**
 * https://github.com/mermaid-js/mermaid
 */
export const MermaidDiagram = ({ source }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    setTimeout(async () => {
      if (ref.current) {
        const result = await mermaid.render('test', source, ref.current);
        setSvg(result.svg);
      }
    });
  }, [ref, source]);

  return (
    <div ref={ref} className='flex w-full items-center justify-center py-2' dangerouslySetInnerHTML={{ __html: svg }} />
  );
};
