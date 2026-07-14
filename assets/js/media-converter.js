// Media Converter — ffmpeg.wasm, lazy-loaded only on this page.
// Converts audio/video fully client-side. Requires cross-origin isolation
// (COOP/COEP headers, already set in _headers for this page).
(function () {
  'use strict';

  const uploader = document.getElementById('uploader');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const preset = document.getElementById('preset');
  const convertBtn = document.getElementById('convertBtn');
  const progress = document.getElementById('progress');
  const progressBar = progress.querySelector('span');
  const statusEl = document.getElementById('status');
  const results = document.getElementById('results');

  let file = null;
  let ffmpeg = null;

  function setStatus(m, k) { statusEl.textContent = m; statusEl.className = 'status show ' + (k || 'info'); }

  uploader.addEventListener('click', () => fileInput.click());
  uploader.addEventListener('dragover', (e) => { e.preventDefault(); uploader.classList.add('drag'); });
  uploader.addEventListener('dragleave', () => uploader.classList.remove('drag'));
  uploader.addEventListener('drop', (e) => { e.preventDefault(); uploader.classList.remove('drag'); fileInput.files = e.dataTransfer.files; handle(); });
  fileInput.addEventListener('change', handle);
  function handle() {
    if (!fileInput.files.length) return;
    file = fileInput.files[0];
    fileList.innerHTML = '<div class="file-chip"><span class="fc-name">🎬 ' + escapeHtml(file.name) +
      ' · ' + formatBytes(file.size) + '</span></div>';
  }

  convertBtn.addEventListener('click', async () => {
    if (!file) { setStatus('Please add a media file.', 'err'); return; }
    convertBtn.disabled = true;
    progress.classList.add('show'); progressBar.style.width = '5%';
    results.innerHTML = '';
    try {
      await ensureFfmpeg();
      progressBar.style.width = '25%';
      setStatus('Converting…', 'info');

      const inputName = 'input' + (file.name.match(/\.[^.]+$/) || [''])[0];
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const fmt = preset.value;
      const map = {
        mp3: { out: 'out.mp3', args: ['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'out.mp3'] },
        mp4: { out: 'out.mp4', args: ['-i', inputName, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', 'out.mp4'] },
        wav: { out: 'out.wav', args: ['-i', inputName, '-vn', 'out.wav'] },
        webm: { out: 'out.webm', args: ['-i', inputName, '-c:v', 'libvpx', '-c:a', 'libvorbis', 'out.webm'] },
        m4a: { out: 'out.m4a', args: ['-i', inputName, '-vn', '-c:a', 'aac', 'out.m4a'] },
      }[fmt];

      await ffmpeg.exec(map.args);
      progressBar.style.width = '80%';
      const data = await ffmpeg.readFile(map.out);
      const mime = ({ mp3: 'audio/mpeg', mp4: 'video/mp4', wav: 'audio/wav', webm: 'video/webm', m4a: 'audio/mp4' })[fmt];
      const blob = new Blob([data.buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      progressBar.style.width = '100%';
      setStatus('Done!', 'ok');
      const base = (file.name || 'media').replace(/\.[^.]+$/, '');
      renderResult(base + '.' + fmt, url, blob);
    } catch (err) {
      setStatus('Error: ' + err.message, 'err');
    } finally {
      convertBtn.disabled = false;
    }
  });

  async function ensureFfmpeg() {
    if (ffmpeg) return ffmpeg;
    setStatus('Loading ffmpeg engine (first time only)…', 'info');
    const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
    const { FFmpeg } = await import(base + '/index.js');
    const { toBlobURL } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress: p }) => {
      const pct = Math.round(Math.min(1, p) * 50) + 25;
      progressBar.style.width = pct + '%';
    });
    const coreURL = await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js', 'text/javascript');
    const wasmURL = await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm', 'application/wasm');
    await ffmpeg.load({ coreURL, wasmURL });
    return ffmpeg;
  }

  async function fetchFile(f) {
    const { fetchFile: ff } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
    return ff(f);
  }

  function renderResult(name, url, blob) {
    const card = document.createElement('div');
    card.className = 'result-preview';
    card.innerHTML =
      '<div class="row between"><strong>' + escapeHtml(name) + '</strong>' +
      '<span class="muted">' + formatBytes(blob.size) + '</span></div>' +
      '<div class="row" style="margin-top:10px"><a class="btn btn-primary" download="' + escapeHtml(name) + '" href="' + url + '">Download</a></div>';
    results.appendChild(card);
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
