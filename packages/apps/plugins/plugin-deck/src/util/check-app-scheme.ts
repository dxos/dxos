//
// Copyright 2024 DXOS.org
//

// TODO(mjamesderocher): Factor out as part of NavigationPlugin.
export const checkAppScheme = (url: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  iframe.src = url + window.location.pathname.replace(/^\/+/, '') + window.location.search;

  const timer = setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);

  window.addEventListener('pagehide', (event) => {
    clearTimeout(timer);
    document.body.removeChild(iframe);
  });
};
