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
  const [error, setError] = useState();

  useEffect(() => {
    setTimeout(async () => {
      if (ref.current) {
        try {
          const valid = await mermaid.parse(source);
          if (valid) {
            const result = await mermaid.render('test', source, ref.current);
            setError(undefined);
            setSvg(result.svg);
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message);
        }
      }
    });
  }, [ref, source]);

  if (error) {
    return <div className='flex text-sm p-2'>{error}</div>;
  }

  return (
    <div ref={ref} className='flex w-full items-center justify-center py-2' dangerouslySetInnerHTML={{ __html: svg }} />
  );
};
