// Inject with: https://chrome.google.com/webstore/detail/javascript-injector/knmnopfmccchnnfdoiddbihbcboeedll/
// target url = github.com

const inject = () => {
  Array.from(document.getElementsByTagName('details-menu'))
  .filter(m => !!m.getAttribute('src')?.includes('/actions_menu') && m.getElementsByTagName('include-fragment').length === 0)
  .forEach(m => {
    if (m.innerHTML.includes('comment-menu-open-in-kai')) return;

    m.innerHTML = `
    <a 
      aria-label="Open in Kai"
      role="menuitem"
      class="dropdown-item btn-link"
      data-test-selector="comment-menu-open-in-kai"
      href="http://kai.dev.dxos.org/import?content_url=${encodeURIComponent(location.href)}"
      target="_blank"
    >
      Open in Kai
    </a>
    ` + m.innerHTML
  })
};

new MutationObserver(inject).observe(document.body, {
  subtree: true,
  childList: true,
});

inject();