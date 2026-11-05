(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const micBtn = $('micBtn'), statusEl = $('status');
  const bangla = $('bangla'), interimEl = $('interim'), output = $('output'), examplesEl = $('examples');
  const copyBtn = $('copyBtn'), shareBtn = $('shareBtn'), clearBtn = $('clearBtn');
  const editor = $('editor'), editorSrc = $('editorSrc'), editorInput = $('editorInput');
  const drawer = $('drawer');

  // ============================================================ storage

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  }

  const opts = load('banglish.opts', { bhAsV: false, phForF: false, shForS: false });
  const userDict = load('banglish.userDict', {});
  const ai = load('banglish.ai', { enabled: false, key: '', model: 'claude-opus-5-5' });
  let lang = load('banglish.lang', 'bn-BD');
  bangla.value = load('banglish.draft', '');

  // ============================================================ toast

  let toastTimer;
  function toast(message, isError) {
    const el = $('toast');
    el.textContent = message;
    el.classList.toggle('error', !!isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 4200 : 1600);
  }

  // ============================================================ AI mode

  // The Claude SDK is only downloaded once AI mode is switched on.
  let aiModule = null;
  let aiLoading = null;
  function loadAI() {
    if (aiModule || aiLoading) return;
    aiLoading = import(new URL('js/ai.js', document.baseURI).href)
      .then(m => { aiModule = m; updateAiUi(); render(); scheduleAI(50); })
      .catch(() => toast('Could not load AI mode. Check your internet connection.', true))
      .finally(() => { aiLoading = null; });
  }

  const aiCache = new Map();    // cache key → Banglish from Claude
  const aiPending = new Set();
  const aiFailed = new Set();   // don't retry a failing sentence on every keystroke
  let aiTimer;

  const aiActive = () => ai.enabled && !!ai.key && !!aiModule;
  const aiKey = sentence => `${ai.model}|${opts.bhAsV}${opts.phForF}${opts.shForS}|${sentence}`;
  const hasBangla = s => /[ঀ-৿]/.test(s);

  function scheduleAI(delay) {
    if (!aiActive()) return;
    clearTimeout(aiTimer);
    aiTimer = setTimeout(runAI, delay);
  }

  function runAI() {
    if (!aiActive()) return;
    const sentences = Banglish.segments(bangla.value).map(s => s.trim()).filter(hasBangla);
    for (const s of sentences) {
      const key = aiKey(s);
      if (aiCache.has(key) || aiPending.has(key) || aiFailed.has(key)) continue;
      if (aiPending.size >= 3) break;
      aiPending.add(key);
      aiModule.convertSentence(s, { apiKey: ai.key, model: ai.model, opts, userDict })
        .then(out => aiCache.set(key, out))
        .catch(err => { aiFailed.add(key); toast(err.message, true); })
        .finally(() => { aiPending.delete(key); render(); scheduleAI(30); });
    }
    render();
  }

  // ============================================================ rendering

  let plainOutput = '';
  let interimText = '';

  function render() {
    const text = bangla.value;
    const frag = document.createDocumentFragment();
    let plain = '';

    for (const seg of Banglish.segments(text)) {
      const sentence = seg.trim();
      const lead = seg.slice(0, seg.length - seg.trimStart().length);
      const trail = seg.slice(seg.trimEnd().length);
      const useAI = aiActive() && hasBangla(sentence);

      if (useAI && aiCache.has(aiKey(sentence))) {
        const out = aiCache.get(aiKey(sentence));
        const span = document.createElement('span');
        span.className = 'seg-ai';
        span.title = 'Converted by AI: ' + sentence;
        span.textContent = out;
        frag.append(lead, span, trail);
        plain += lead + out + trail;
        continue;
      }

      const holder = useAI ? document.createElement('span') : frag;
      if (useAI) holder.className = 'seg-pending';
      for (const t of Banglish.convert(seg, opts, userDict)) {
        plain += t.out;
        if (!t.word) { holder.append(t.out); continue; }
        const span = document.createElement('span');
        span.className = 'w' + (t.source === 'user' ? ' custom' : t.english ? ' en' : '');
        span.textContent = t.out;
        span.dataset.src = t.src;
        span.title = t.src;
        holder.append(span);
      }
      if (useAI) frag.append(holder);
    }

    if (interimText) {
      const pending = document.createElement('span');
      pending.className = 'w pending';
      pending.textContent = (plain && !/\s$/.test(plain) ? ' ' : '') + Banglish.transliterate(interimText, opts, userDict);
      frag.append(pending);
    }

    output.replaceChildren(frag);
    plainOutput = plain;
    output.classList.toggle('empty', !plain.trim() && !interimText);
    examplesEl.hidden = !!text.trim() || !!interimText;
    interimEl.textContent = interimText;
    save('banglish.draft', text);
  }

  // ============================================================ examples

  const EXAMPLES = [
    'আজকে অফিসে একটা ইম্পর্ট্যান্ট মিটিং আছে',
    'ব্রো জাস্ট ওয়েট কর, আমি আসছি',
    'প্রজেক্টটা ডেডলাইনের আগে সাবমিট করতে হবে',
  ];
  for (const ex of EXAMPLES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.lang = 'bn';
    chip.textContent = ex;
    chip.addEventListener('click', () => { bangla.value = ex; render(); scheduleAI(100); });
    examplesEl.appendChild(chip);
  }

  // ============================================================ speech

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', kind === 'error');
    statusEl.classList.toggle('live', kind === 'live');
  }

  function updateMicUi() {
    document.body.classList.toggle('listening', listening);
    micBtn.setAttribute('aria-pressed', String(listening));
    micBtn.setAttribute('aria-label', listening ? 'Stop listening' : 'Start listening');
    if (listening) setStatus('Listening… Bangla + English is fine', 'live');
    else if (!statusEl.classList.contains('error')) setStatus('Tap the mic and talk');
  }

  function appendFinal(text) {
    text = text.trim();
    if (!text) return;
    const cur = bangla.value;
    bangla.value = cur + (cur && !/\s$/.test(cur) ? ' ' : '') + text;
    // each spoken phrase is its own sentence for AI mode
    if (aiActive() && !/[।?!.]$/.test(bangla.value)) bangla.value += '।';
    scheduleAI(150);
  }

  const SPEECH_ERRORS = {
    'not-allowed': 'Microphone access was blocked. Allow it from the address bar and try again.',
    'service-not-allowed': 'Microphone access was blocked. Allow it from the address bar and try again.',
    'audio-capture': 'No microphone found.',
    'language-not-supported': 'This browser does not support Bangla speech recognition.',
    // Chromium-based browsers other than Chrome/Edge (Brave, Opera, Vivaldi,
    // in-app previews) expose the API but have no speech service behind it.
    'network': navigator.brave
      ? "Brave doesn't include a speech service. Open this page in Google Chrome or Microsoft Edge."
      : "Couldn't reach the speech service. Use Google Chrome or Microsoft Edge (not Brave, Opera or an app's built-in browser), and check that a VPN or firewall isn't blocking Google.",
  };

  // Work out why the mic was refused, so the message names the right setting.
  async function micBlockedHelp() {
    const ua = navigator.userAgent;
    // Facebook, Messenger, Instagram etc. open links in their own browser, which can't use the mic
    if (/FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|; wv\)/.test(ua)) {
      return 'This in-app browser can\'t use the mic. Tap ⋮ → "Open in Chrome", then try again.';
    }
    let state = '';
    try { state = (await navigator.permissions.query({ name: 'microphone' })).state; } catch { /* unsupported */ }
    const android = /Android/.test(ua);
    if (state === 'denied') {
      return android
        ? 'The mic is blocked for this site. In Chrome: ⋮ → Settings → Site settings → Microphone → tap roxzach.github.io → Allow. Then reopen Banglish.'
        : 'The mic is blocked for this site. Click the icon left of the address bar → Microphone → Allow, then reload.';
    }
    // the site is allowed (or never asked), so the phone itself is blocking Chrome
    return android
      ? 'Your phone is blocking Chrome\'s mic. Open Android Settings → Apps → Chrome → Permissions → Microphone → Allow, then reopen Banglish.'
      : null;
  }

  function startListening() {
    recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) appendFinal(r[0].transcript);
        else interim += r[0].transcript;
      }
      interimText = interim.trim();
      render();
    };

    recognition.onerror = async e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      listening = false;
      const blocked = e.error === 'not-allowed' || e.error === 'service-not-allowed';
      setStatus((blocked && await micBlockedHelp()) || SPEECH_ERRORS[e.error] || `Speech error: ${e.error}`, 'error');
      updateMicUi();
    };

    // Chrome ends the session after a pause; keep going until the user stops.
    recognition.onend = () => {
      if (interimText) { appendFinal(interimText); interimText = ''; render(); }
      if (listening) {
        try { recognition.start(); } catch { listening = false; updateMicUi(); }
      } else {
        updateMicUi();
      }
    };

    statusEl.classList.remove('error');
    listening = true;
    recognition.start();
    updateMicUi();
  }

  function stopListening() {
    listening = false;
    if (recognition) recognition.stop();
    updateMicUi();
  }

  function toggleListening() {
    if (!SpeechRecognition) return toast('Voice input needs Chrome or Edge.', true);
    listening ? stopListening() : startListening();
  }

  if (SpeechRecognition) {
    micBtn.addEventListener('click', toggleListening);
  } else {
    micBtn.disabled = true;
    setStatus('Voice input needs Chrome or Edge. You can still type or paste Bangla.', 'error');
  }

  // Space toggles the mic when you're not typing somewhere
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, button, [contenteditable]') || !drawer.hidden || !editor.hidden) return;
    e.preventDefault();
    toggleListening();
  });

  // ============================================================ accent switch

  const segs = [...document.querySelectorAll('.accent-switch .seg')];
  function setLang(value) {
    lang = value;
    save('banglish.lang', lang);
    segs.forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === lang)));
  }
  segs.forEach(b => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    if (listening) { stopListening(); startListening(); }
  }));
  setLang(lang);

  // ============================================================ text & buttons

  // re-render on the next frame so fast typing never queues up work
  let renderQueued = false;
  bangla.addEventListener('input', () => {
    if (!renderQueued) {
      renderQueued = true;
      requestAnimationFrame(() => { renderQueued = false; render(); });
    }
    scheduleAI(900);
  });

  clearBtn.addEventListener('click', () => {
    bangla.value = '';
    interimText = '';
    render();
    bangla.focus();
  });

  copyBtn.addEventListener('click', async () => {
    const text = plainOutput.trim();
    if (!text) return toast('Nothing to copy yet');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      tmp.remove();
    }
    toast('Copied!');
  });

  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', () => {
      const text = plainOutput.trim();
      if (text) navigator.share({ text }).catch(() => {});
    });
  }

  // ============================================================ theme

  $('themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]').content = next === 'dark' ? '#0b1210' : '#f2f6f4';
    save('banglish.theme', next);
  });

  // ============================================================ custom words

  let editingSrc = null;

  function openEditor(span) {
    editingSrc = span.dataset.src;
    editorSrc.textContent = editingSrc;
    editorInput.value = span.textContent;
    $('editorReset').hidden = !(editingSrc in userDict);
    editor.hidden = false;

    const r = span.getBoundingClientRect();
    const width = editor.offsetWidth;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - width - 12;
    editor.style.left = Math.max(12, Math.min(r.left + window.scrollX + r.width / 2 - width / 2, maxLeft)) + 'px';
    editor.style.top = (r.bottom + window.scrollY + 6) + 'px';
    editorInput.focus();
    editorInput.select();
  }

  function closeEditor() {
    editor.hidden = true;
    editingSrc = null;
  }

  function saveWord(src, value) {
    value = value.trim();
    if (value) userDict[src] = value;
    else delete userDict[src];
    save('banglish.userDict', userDict);
    // sentences containing this word need a fresh AI pass with the new spelling
    for (const key of [...aiCache.keys()]) if (key.includes(src)) aiCache.delete(key);
    aiFailed.clear();
    renderWords();
    render();
    scheduleAI(100);
  }

  output.addEventListener('click', e => {
    const span = e.target.closest('.w');
    if (span && !span.classList.contains('pending')) openEditor(span);
  });

  $('editorSave').addEventListener('click', () => { saveWord(editingSrc, editorInput.value); closeEditor(); toast('Saved'); });
  $('editorReset').addEventListener('click', () => { saveWord(editingSrc, ''); closeEditor(); });
  editorInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { saveWord(editingSrc, editorInput.value); closeEditor(); }
    if (e.key === 'Escape') closeEditor();
  });
  document.addEventListener('pointerdown', e => {
    if (!editor.hidden && !editor.contains(e.target) && !e.target.closest('.w')) closeEditor();
  });

  function renderWords() {
    const list = $('wordsList');
    const entries = Object.entries(userDict).sort((a, b) => a[0].localeCompare(b[0], 'bn'));
    $('wordsCount').textContent = entries.length || '';
    $('wordsEmpty').hidden = entries.length > 0;
    list.textContent = '';
    for (const [bn, en] of entries) {
      const li = document.createElement('li');
      const b = document.createElement('span'); b.className = 'bn'; b.textContent = bn;
      const a = document.createElement('span'); a.className = 'arrow'; a.textContent = '→';
      const l = document.createElement('span'); l.className = 'en'; l.textContent = en;
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', `Remove ${bn}`);
      del.addEventListener('click', () => saveWord(bn, ''));
      li.append(b, a, l, del);
      list.appendChild(li);
    }
  }

  // ============================================================ settings drawer

  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    drawer.querySelector('.drawer-panel [data-close]').focus();
  }
  function closeDrawer() {
    drawer.hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  $('settingsBtn').addEventListener('click', openDrawer);
  $('modeBadge').addEventListener('click', openDrawer);
  drawer.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // spelling style
  for (const [id, key] of [['optV', 'bhAsV'], ['optPh', 'phForF'], ['optSh', 'shForS']]) {
    const box = $(id);
    box.checked = !!opts[key];
    box.addEventListener('change', () => {
      opts[key] = box.checked;
      save('banglish.opts', opts);
      render();
      scheduleAI(300);
    });
  }

  // AI settings
  const aiEnabled = $('aiEnabled'), aiKeyInput = $('aiKey'), aiModel = $('aiModel'), aiStatus = $('aiStatus');

  function updateAiUi() {
    const on = aiActive();
    document.body.classList.toggle('ai-on', on);
    $('modeBadge').classList.toggle('ai', on);
    $('modeText').textContent = on ? 'AI' : 'Offline';
    aiEnabled.checked = ai.enabled;
    if (!ai.key) aiStatus.textContent = 'Add an API key to turn this on';
    else if (ai.enabled && !aiModule) aiStatus.textContent = 'Loading…';
    else aiStatus.textContent = ai.enabled ? 'On: sentences are polished by Claude' : 'Off: using the built-in converter';
  }

  function saveAi() {
    save('banglish.ai', ai);
    if (ai.enabled && ai.key) loadAI();
    updateAiUi();
    render();
    scheduleAI(100);
  }

  aiKeyInput.value = ai.key;
  aiModel.value = ai.model;
  aiEnabled.addEventListener('change', () => {
    if (aiEnabled.checked && !aiKeyInput.value.trim()) {
      aiEnabled.checked = false;
      aiKeyInput.focus();
      return toast('Paste your Anthropic API key first', true);
    }
    ai.enabled = aiEnabled.checked;
    aiFailed.clear();
    saveAi();
  });
  aiKeyInput.addEventListener('change', () => {
    ai.key = aiKeyInput.value.trim();
    if (ai.key && !ai.enabled) ai.enabled = true;
    aiFailed.clear();
    saveAi();
  });
  $('aiKeyToggle').addEventListener('click', e => {
    const show = aiKeyInput.type === 'password';
    aiKeyInput.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Hide' : 'Show';
  });
  aiModel.addEventListener('change', () => { ai.model = aiModel.value; aiFailed.clear(); saveAi(); });

  // ============================================================ start

  renderWords();
  updateAiUi();
  render();
  if (ai.enabled && ai.key) loadAI();

  // offline support + "install app" on phones and PCs
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
