console.log('Service Worker running!');

const worker = new Worker(new URL('./worker.ts', import.meta.url));

self.addEventListener('message', (event) => {
  console.log('Message received:', event.data);
});
