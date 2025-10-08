//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { createQuickJS } from '@dxos/vendor-quickjs';

const QuickJSDemo = () => {
  const [globalName, setGlobalName] = useState('world');
  const [code, setCode] = useState('"Hello " + NAME + "!"');
  const [result, setResult] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [vmReady, setVmReady] = useState(false);
  const [vmInstance, setVmInstance] = useState<any>(null);

  useEffect(() => {
    const initQuickJS = async () => {
      const QuickJS = await createQuickJS();
      const vm = QuickJS.newContext();
      setVmInstance(vm);
      setVmReady(true);

      return () => {
        vm.dispose();
      };
    };

    initQuickJS();
  }, []);

  const runCode = useCallback(() => {
    if (!vmInstance || !vmReady) {
      setResult('QuickJS is still initializing...');
      return;
    }

    setIsRunning(true);

    try {
      // Set the global variable
      const nameValue = vmInstance.newString(globalName);
      vmInstance.setProp(vmInstance.global, 'NAME', nameValue);
      nameValue.dispose();

      // Execute the code
      const evalResult = vmInstance.evalCode(code);

      if (evalResult.error) {
        const errorMessage = vmInstance.dump(evalResult.error);
        setResult(`Error: ${errorMessage}`);
        evalResult.error.dispose();
      } else {
        const successMessage = vmInstance.dump(evalResult.value);
        setResult(`Success: ${successMessage}`);
        evalResult.value.dispose();
      }
    } catch (error: any) {
      setResult(`Exception: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [vmInstance, vmReady, globalName, code]);

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold'>QuickJS Sandbox Demo</h3>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>Global Variable NAME:</label>
          <input
            value={globalName}
            onChange={(e) => setGlobalName(e.target.value)}
            placeholder='Enter value for global NAME variable'
          />
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium'>JavaScript Code:</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='Enter JavaScript code to execute'
            rows={5}
          />
        </div>

        <button onClick={runCode} disabled={!vmReady || isRunning}>
          {isRunning ? 'Running...' : 'Execute Code'}
        </button>

        {result && (
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Result:</label>
            <pre className='p-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto'>{result}</pre>
          </div>
        )}
      </div>

      <div className='mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md'>
        <h4 className='font-medium mb-2'>About this demo:</h4>
        <p className='text-sm'>
          This demonstrates QuickJS, a JavaScript engine that runs in the browser. You can set a global variable and
          execute JavaScript code in an isolated sandbox environment.
        </p>
      </div>
    </div>
  );
};

const meta = {
  title: 'echo/echo-query/QuickJS',
  render: QuickJSDemo,
} satisfies Meta<typeof QuickJSDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
