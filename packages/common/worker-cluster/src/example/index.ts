console.log('Hello World!');

navigator.serviceWorker.register('sw.ts', { type: 'module' });

const registration = await navigator.serviceWorker.getRegistration();

registration?.active?.postMessage({ type: 'GREETING', message: 'Hello from the main thread!' });
