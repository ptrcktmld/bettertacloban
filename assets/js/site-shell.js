(function () {
  const pages = [
    ['Home', '/'],
    ['Services', '/services/'],
    ['Government', '/government/'],
    ['Statistics', '/statistics/'],
    ['Projects', '/projects/'],
    ['Legislative', '/legislative/'],
    ['Transparency', '/budget/'],
    ['Contact', '/contact/']
  ];

  const currentPath = window.location.pathname.replace(/index\.html$/, '');
  const nav = pages.map(([label, href]) => {
    const active = href === '/' ? currentPath === '/' : currentPath.startsWith(href);
    return `<li><a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('');

  const shellHeader = document.querySelector('[data-site-header]');
  if (shellHeader) {
    shellHeader.innerHTML = `
      <a class="bb-skip" href="#main-content">Skip to main content</a>
      <header class="bb-header"><nav class="bb-nav bb-container" aria-label="Primary navigation">
        <a class="bb-logo" href="/" aria-label="Better Baguio home"><img src="/assets/images/logo/better-baguio-mark.png" alt="" width="512" height="512"><span class="bb-logo-text"><strong>Better</strong><span>Baguio</span></span></a>
        <button class="bb-menu-button" type="button" aria-expanded="false" aria-controls="bb-menu">Menu</button>
        <ul class="bb-menu" id="bb-menu">${nav}</ul>
      </nav></header>`;
  }

  const shellFooter = document.querySelector('[data-site-footer]');
  if (shellFooter) {
    shellFooter.innerHTML = `
      <footer class="bb-footer"><div class="bb-container">
        <div class="bb-footer-grid">
          <div><div class="bb-footer-brand"><img src="/assets/images/logo/better-baguio-mark.png" alt="" width="512" height="512"><div><strong>Better Baguio</strong><span>Independent civic information</span></div></div><p>Civic content verification is in progress. This volunteer-built project is independent and does not process government transactions.</p></div>
          <div><h2>Explore</h2><ul>${pages.slice(1).map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></div>
          <div><h2>Project</h2><ul><li><a href="https://github.com/ashier/betterbaguio" target="_blank" rel="noopener">BetterBaguio source code</a></li></ul></div>
        </div>
        <div class="bb-footer-bottom">Free to use · Civic content verification in progress · Open-source, MIT-licensed code</div>
      </div></footer>`;
  }

  const button = document.querySelector('.bb-menu-button');
  const menu = document.querySelector('.bb-menu');
  if (button && menu) button.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
  });

  const header = document.querySelector('.bb-header');
  if (header) {
    let compactFrame = null;
    const updateHeader = () => {
      header.classList.toggle('is-compact', window.scrollY > 40);
      compactFrame = null;
    };
    updateHeader();
    window.addEventListener('scroll', () => {
      if (compactFrame === null) compactFrame = window.requestAnimationFrame(updateHeader);
    }, { passive: true });
  }
})();
