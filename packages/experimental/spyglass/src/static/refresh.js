/* eslint-disable */

/**
 * Connect to server to refresh the page.
 * https://javascript.info/websocket
 * https://dev.to/craigmorten/how-to-code-live-browser-refresh-in-deno-309o
 */
(() => {
  let socket, reconnectionTimerId;

  // Kick off the connection code on load.
  connect();

  /**
   * Info message logger.
   */
  function log(message) {
    console.info('[refresh]', message);
  }

  /**
   * Refresh the browser.
   */
  function refresh() {
    window.location.reload();
  }

  /**
   * Create WebSocket, connect to the server and
   * listen for refresh events.
   */
  function connect(callback) {
    // Close any existing sockets.
    if (socket) {
      socket.close();
    }

    // Create a new WebSocket pointing to the server.
    const requestUrl = `${window.location.origin.replace('http', 'ws')}/refresh`
    socket = new WebSocket(requestUrl);

    // When the connection opens, execute the callback.
    socket.addEventListener('open', () => {
      log('Connected');
      callback && callback();
    });

    // Log the loss of connection and set a timer to start the connection again after a second.
    socket.addEventListener('close', () => {
      log('Connection lost - reconnecting...');

      clearTimeout(reconnectionTimerId);
      reconnectionTimerId = setTimeout(() => {
        // Try to connect again, and if successful trigger a browser refresh.
        connect(refresh);
      }, 3000);
    });

    // Add a listener for messages from the server.
    socket.addEventListener('message', (event) => {
      // Check whether we should refresh the browser.
      if (event.data === 'refresh') {
        log('Refreshing...');
        refresh();
      }
    });

    socket.addEventListener('error', (error) => {
      log(error);
    });
  }
})();
