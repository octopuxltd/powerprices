// Progressive enhancement for the region and time-range switchers.
//
// Without this script every pill is an ordinary link to a static page, and
// that still works. With it, a click fetches the target page and swaps the
// page content in place, so there's no full navigation and no flash between
// pages. The URL and title update so back/forward and sharing behave as
// they would with real navigation.

const SWITCHER_LINK = '.switcher a[href]';

async function swapTo(url, { push }) {
  // 'no-cache' revalidates with the server (cheap: the host answers 304 when
  // unchanged) instead of reusing a copy the browser cached before the last
  // deploy. Without it a switch could serve a page from before a deploy for up
  // to the host's cache lifetime.
  const res = await fetch(url, { headers: { Accept: 'text/html' }, cache: 'no-cache' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const nextMain = doc.querySelector('main');
  if (!nextMain) throw new Error('No <main> in fetched page');

  const apply = () => {
    document.querySelector('main').replaceWith(nextMain);
    document.title = doc.title;
    if (push) history.pushState({}, '', url);
  };

  // Same-document view transition where supported; a plain swap elsewhere.
  if (document.startViewTransition) {
    await document.startViewTransition(apply).finished;
  } else {
    apply();
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest(SWITCHER_LINK);
  if (!link || event.defaultPrevented) return;
  // Leave modified clicks (new tab, etc.) to the browser.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

  const target = new URL(link.href);
  if (target.origin !== location.origin) return;
  // The #daily-prices anchor exists for the no-script path; with the swap the
  // page doesn't move, so drop it from the URL we record.
  target.hash = '';

  event.preventDefault();
  swapTo(target.href, { push: true }).catch(() => {
    location.href = link.href; // fall back to a normal navigation
  });
});

// Phone drop-downs: each option's value is the page path.
document.addEventListener('change', (event) => {
  const select = event.target.closest('.switcher-select');
  if (!select) return;
  const target = new URL(select.value, location.href);
  target.hash = '';
  swapTo(target.href, { push: true }).catch(() => {
    location.href = select.value;
  });
});

window.addEventListener('popstate', () => {
  swapTo(location.href, { push: false }).catch(() => location.reload());
});
