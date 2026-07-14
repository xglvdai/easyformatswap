// Shared site behavior: mobile nav, footer year, active link, smart guide redirect.
(function () {
  'use strict';

  // Mobile nav toggle
  const toggle = document.querySelector('[data-nav-toggle]');
  const links = document.querySelector('[data-nav-links]');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') links.classList.remove('open');
    });
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Mark active nav link based on current path
  const path = location.pathname.replace(/\/index\.html$/, '/').replace(/^\/$/, '/');
  document.querySelectorAll('[data-nav-links] a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const norm = href.replace(/^\.\//, '/').replace(/^index\.html$/, '/');
    if (norm === path || (href !== '/' && path.endsWith(href.replace(/^\.\//, '/')))) {
      a.classList.add('active');
    }
  });

  // Smart guide link: jump to tool-specific guide page based on current tool page
  const guideLink = document.querySelector('[data-guide-link]');
  if (guideLink) {
    var toolMap = {
      'image-converter': '/guide/image-converter.html',
      'pdf-converter': '/guide/pdf-converter.html',
      'media-converter': '/guide/media-converter.html',
      'unit-converter': '/guide/unit-converter.html',
      'compress-tool': '/guide/compress-tool.html'
    };
    for (var key in toolMap) {
      if (path.indexOf(key) !== -1) {
        guideLink.href = toolMap[key];
        break;
      }
    }
  }
})();
