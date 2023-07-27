//
// Copyright 2023 DXOS.org
//

import browser from 'webextension-polyfill';

const composerId = '__DXOS_COMPOSER__';
const baseUrl = new URL(import.meta.env.VITE_COMPOSER_URL ?? 'https://composer.dxos.org');

const srOnly = Object.entries({
  clip: 'rect(0 0 0 0)',
  'clip-path': 'inset(50%)',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  'white-space': 'nowrap',
  width: '1px',
}).reduce((acc, [key, value]) => `${acc}${key}: ${value};`, '');

const composerStyles = Object.entries({
  border: 0,
  'border-radius': '6px',
  width: '100%',
  height: '100%',
  'min-height': '30rem',
  'margin-bottom': '-5px',
}).reduce((acc, [key, value]) => `${acc}${key}: ${value};`, '');

let composer: HTMLIFrameElement;
const getComposerIFrame = (): HTMLIFrameElement => {
  if (!composer) {
    console.log('Creating composer iframe...');
    composer = document.createElement('iframe');
    composer.setAttribute('id', composerId);
    composer.setAttribute('src', `${baseUrl.href}github/embedded?location=${window.location.href}`);
    composer.setAttribute('style', composerStyles);
    composer.setAttribute('allow', 'clipboard-write *');
  }

  return composer;
};

const setupComposer = () => {
  if (document.getElementById(composerId)) {
    return;
  }

  console.log('Setting up composer...');

  const issueId = (document.getElementsByName('issue[id]')[0] as HTMLInputElement | undefined)?.value;
  const issueForm = document.getElementById(`issue-${issueId}-edit-form`);
  const commentForm = Array.from(document.getElementsByClassName('js-previewable-comment-form')).find((element) => {
    return issueForm?.contains(element);
  });
  const cancelButton = Array.from(document.getElementsByClassName('js-comment-cancel-button')).find((element) => {
    return issueForm?.contains(element);
  }) as HTMLButtonElement | undefined;
  const updateButton = Array.from(document.getElementsByClassName('Button--primary')).find((element) => {
    return issueForm?.contains(element);
  }) as HTMLButtonElement | undefined;
  const body = document.getElementById(`issue-${issueId}-body`) as HTMLTextAreaElement | undefined;
  const commentParent = Array.from(document.getElementsByClassName('timeline-comment')).find((element) => {
    return element.contains(issueForm);
  }) as HTMLDivElement | undefined;

  if (commentForm) {
    const composer = getComposerIFrame();
    Array.from(commentForm.children).forEach((element) => element.setAttribute('style', srOnly));

    let stale = false;
    const staleObserver = new MutationObserver((mutationsList) => {
      mutationsList.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (
            !stale &&
            mutation.target instanceof HTMLElement &&
            mutation.target.classList.contains('is-comment-stale')
          ) {
            stale = true;
            composer.contentWindow?.postMessage({ type: 'comment-stale' }, baseUrl.origin);
          }
        }
      });
    });
    commentParent && staleObserver.observe(commentParent, { attributes: true });

    window.addEventListener('message', (event) => {
      if (event.source !== composer.contentWindow) {
        return;
      }

      switch (event.data.type) {
        case 'request-initial-data': {
          composer.contentWindow?.postMessage({ type: 'initial-data', content: body?.value }, baseUrl.origin);
          break;
        }

        case 'close-embed': {
          cancelButton?.click();
          break;
        }

        case 'close-embed-after-api': {
          location.reload();
          break;
        }

        case 'save-data': {
          if (body) {
            body.value = event.data.content;
          }
          updateButton?.click();
          if (stale) {
            composer.contentWindow?.postMessage({ type: 'comment-stale' }, baseUrl.origin);
          }
          break;
        }
      }
    });

    commentForm.appendChild(composer);

    console.log('Composer setup completed.');
  }
};

const port = browser.runtime.connect({ name: 'content' });
port.onMessage.addListener(() => {
  setupComposer();
  const composerObserver = new MutationObserver(() => setupComposer());
  composerObserver.observe(document.body, { subtree: true, childList: true });
});

console.log('Content script initialized.');
