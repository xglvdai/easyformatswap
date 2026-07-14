// Shared site behavior: mobile nav, ad-slot placeholder labels, footer year, active link.
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

  // Ad slots: render a friendly placeholder for any slot not yet filled with AdSense code.
  // When you integrate AdSense, replace the inner HTML of each .ad-slot with the
  // <ins class="adsbygoogle"> snippet — this placeholder is skipped automatically.
  document.querySelectorAll('.ad-slot').forEach((slot) => {
    if (slot.querySelector('ins.adsbygoogle')) return; // already integrated
    const fmt = slot.dataset.adFormat || 'leaderboard';
    const label = slot.dataset.adLabel || 'Ad space — connect Google AdSense';
    const inner = document.createElement('div');
    inner.className = 'ad-placeholder';
    inner.innerHTML =
      '<div style="font-size:22px;opacity:.5">📢</div>' +
      '<div>' + label + '</div>' +
      '<div style="font-size:11px;margin-top:4px">(' + fmt + ')</div>';
    slot.appendChild(inner);
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

  // Cookie consent banner
  // US CCPA / EU ePrivacy-compliant: shown until user accepts.
  // AdSense requires consent for personalized ads.
  if (!localStorage.getItem('cc_consent')) {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner show';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="cb-inner">' +
        '<div class="cb-text">' +
          '<strong>Cookie &amp; Privacy Notice</strong><br>' +
          'This site uses cookies and similar technologies for advertising (Google AdSense) and analytics to improve your experience. ' +
          'By clicking <em>Accept</em> you consent to our use of cookies. ' +
          'Your files are never uploaded — all conversions happen locally in your browser. ' +
          'Read our <a href="#">Privacy Policy</a> for details.' +
        '</div>' +
        '<div class="cb-btns">' +
          '<button id="cc-accept" class="btn btn-primary">Accept All Cookies</button>' +
          '<button id="cc-reject" class="btn btn-ghost">Essential Only</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cc-accept').addEventListener('click', function () {
      localStorage.setItem('cc_consent', 'all');
      banner.classList.remove('show');
      setTimeout(function () { banner.remove(); }, 300);
    });
    document.getElementById('cc-reject').addEventListener('click', function () {
      localStorage.setItem('cc_consent', 'essential');
      banner.classList.remove('show');
      setTimeout(function () { banner.remove(); }, 300);
    });
  }
})();
