/*
 * Bangla (Bengali script) → Banglish (Bangla written the way people text it).
 *
 *   আমি তোমাকে ভালোবাসি  →  ami tomake bhalobasi
 *
 * Bengali script doesn't write the inherent vowel "o" or mark when it is
 * silent (কলম = kolom, but করলাম = korlam), so most of the work here is
 * guessing that from the shape of the word. Words the rules get wrong live in
 * dictionary.js, and users can add their own spellings on top.
 */
(function (root) {
  'use strict';

  const IS_NODE = typeof module !== 'undefined' && module.exports;
  const DICT = IS_NODE ? require('./dictionary.js') : root.BanglishDict;
  const EN = IS_NODE ? require('./english-words.js') : root.BanglishEnglish;

  const HASANT = '্';
  const ANUSVARA = 'ং';   // ং
  const VISARGA = 'ঃ';    // ঃ
  const CHANDRABINDU = 'ঁ'; // ঁ
  const RRA = 'ড়';        // ড়
  const RHA = 'ঢ়';        // ঢ়
  const YYA = 'য়';        // য়
  const SIGN_AA = 'া', SIGN_I = 'ি', SIGN_II = 'ী', SIGN_E = 'ে';
  const SIGN_O = 'ো', SIGN_AU = 'ৌ';

  const INDEPENDENT_VOWELS = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  };

  const VOWEL_SIGNS = {
    [SIGN_AA]: 'a', [SIGN_I]: 'i', [SIGN_II]: 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    [SIGN_E]: 'e', 'ৈ': 'oi', [SIGN_O]: 'o', [SIGN_AU]: 'ou',
  };

  const CONSONANTS = {
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'ch', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    [RRA]: 'r', [RHA]: 'r', [YYA]: 'y', 'ৎ': 't',
    // two-letter clusters with their own sound, merged during parsing
    KSH: 'kkh', GY: 'gg',
  };

  const MODIFIERS = [ANUSVARA, VISARGA, CHANDRABINDU];

  // English (or user-taught) word + Bangla ending: মিটিংয়ে → meeting e, ফোনটা → phone ta.
  // The third field marks endings that only make sense on English words.
  const SUFFIXES = [
    ['গুলো', 'gulo'], ['গুলা', 'gula'], [YYA + SIGN_E + 'র', 'er'], ['দের', 'der'],
    ['টাও', 'tao'], ['টাই', 'tai'], ['টার', 'tar'], [YYA + SIGN_E, 'e'],
    ['টা', 'ta'], ['টি', 'ti'], ['কে', 'ke'], ['রা', 'ra'], ['তে', 'te'], [SIGN_E + 'র', 'er'],
    [SIGN_I + 'ং', 'ing', true], ['র', 'r'], [SIGN_E, 'e'], ['ই', 'i'], ['ও', 'o'], ['স', 's', true],
  ].sort((a, b) => a[0].length - b[0].length);  // longest stem first: উইকে → উইক + ে, not উই + কে

  function normalizeKeys(obj) {
    const out = {};
    for (const k of Object.keys(obj)) out[normalize(k)] = obj[k];
    return out;
  }

  // Speech engines and keyboards emit some letters in decomposed form, and
  // sprinkle zero-width joiners into clusters like অ্যা.
  function normalize(text) {
    return text
      .replace(/[‌‍]/g, '')
      .replace(/ো/g, SIGN_O)
      .replace(/ৌ/g, SIGN_AU)
      .replace(/ড়/g, RRA)
      .replace(/ঢ়/g, RHA)
      .replace(/য়/g, YYA);
  }

  // English spelled in Bangla script varies (ইম্পর্ট্যান্ট / ইমপর্টেন্ট), so English
  // words are also matched on a key that ignores hasant, ্য and vowel length.
  function looseKey(w) {
    return w
      .replace(/[ঁঃ]/g, '')                       // ঁ ঃ
      .replace(/[অএ]্যা/g, 'এ') // অ্যা, এ্যা → এ
      .replace(/্যা/g, SIGN_E)                // ্যা → ে
      .replace(/্য/g, '')                          // other য-ফলা
      .replace(/্/g, '')                                // hasant
      .replace(/ঈ/g, 'ই').replace(/ঊ/g, 'উ')
      .replace(/ী/g, SIGN_I).replace(/ূ/g, 'ু')
      .replace(/ঙ/g, ANUSVARA);                         // ঙ → ং
  }

  const COMMON = normalizeKeys(DICT.common);
  const ENGLISH = normalizeKeys(EN.words);
  const CONTEXTUAL = normalizeKeys(EN.contextual);
  const ENGLISH_LOOSE = new Map();
  for (const [k, v] of Object.entries(ENGLISH)) {
    const key = looseKey(k);
    if (!ENGLISH_LOOSE.has(key)) ENGLISH_LOOSE.set(key, v);
  }

  // ---------------------------------------------------------------- parsing

  // Split a word into units: an independent vowel, or a consonant cluster with
  // its vowel sign (or none) and any ং ঃ ঁ that follow.
  function parseWord(word) {
    const ch = Array.from(word).filter(c => c !== '‌' && c !== '‍');
    const units = [];
    let i = 0;
    while (i < ch.length) {
      const c = ch[i];
      if (c in INDEPENDENT_VOWELS) {
        const u = { type: 'V', char: c, mods: '' };
        i++;
        // অ্যা as in অ্যাপ
        if (ch[i] === HASANT && ch[i + 1] === 'য') {
          u.yaPhala = true;
          i += 2;
          if (ch[i] in VOWEL_SIGNS) i++;
        }
        while (MODIFIERS.includes(ch[i])) u.mods += ch[i++];
        units.push(u);
      } else if (c in CONSONANTS) {
        const u = { type: 'C', cons: [c], sign: '', hasant: false, mods: '' };
        i++;
        while (ch[i] === HASANT) {
          if (ch[i + 1] in CONSONANTS) {
            u.cons.push(ch[i + 1]);
            i += 2;
          } else {
            u.hasant = true;
            i++;
            break;
          }
        }
        if (ch[i] in VOWEL_SIGNS) u.sign = ch[i++];
        while (MODIFIERS.includes(ch[i])) u.mods += ch[i++];
        u.cons = mergeSpecialClusters(u.cons);
        units.push(u);
      } else if (c in VOWEL_SIGNS) {
        units.push({ type: 'V', latin: VOWEL_SIGNS[c], mods: '' });
        i++;
      } else {
        units.push({ type: 'X', text: c });
        i++;
      }
    }

    // ঃ before a consonant doubles it: দুঃখ → dukkho
    units.forEach((u, k) => {
      const next = units[k + 1];
      if (u.mods && u.mods.includes(VISARGA) && next && next.type === 'C') next.geminate = true;
    });
    return units;
  }

  function mergeSpecialClusters(cons) {
    const out = [];
    for (let j = 0; j < cons.length; j++) {
      if (cons[j] === 'ক' && cons[j + 1] === 'ষ') { out.push('KSH'); j++; }
      else if (cons[j] === 'জ' && cons[j + 1] === 'ঞ') { out.push('GY'); j++; }
      else out.push(cons[j]);
    }
    return out;
  }

  // ------------------------------------------------------- inherent vowels

  const hasVowelMod = u => !!u.mods && (u.mods.includes(ANUSVARA) || u.mods.includes(VISARGA));
  const isConjunct = u => u.type === 'C' && (u.cons.length > 1 || !!u.geminate);
  const isBare = u => u.type === 'C' && !u.sign && !u.hasant && !hasVowelMod(u);

  // Decide, right to left, whether each bare consonant is read with "o" or not.
  // Bangla alternates: a medial bare consonant is silent when the next one is
  // voiced (কর-লাম → korlam) and voiced when the next one is closed (ক-লম → kolom).
  function assignVowels(units) {
    // Trailing independent vowels (বই, এখনই, তুমিও) act like suffixes, so the
    // consonant before them is treated as the end of the word.
    let end = units.length;
    while (end > 0 && units[end - 1].type === 'V') end--;

    for (let k = end - 1; k >= 0; k--) {
      const u = units[k];
      if (u.type !== 'C') continue;
      if (u.sign) u.v = VOWEL_SIGNS[u.sign];
      else if (u.hasant) u.v = '';
      else if (hasVowelMod(u)) u.v = 'o';
      else if (k === end - 1) u.v = keepsFinalVowel(units, k, end) ? 'o' : '';
      else if (k === 0) u.v = 'o';
      else {
        const next = units[k + 1];
        const voiced = isConjunct(u) || next.type !== 'C' || isConjunct(next) || next.v === '';
        u.v = voiced ? 'o' : '';
      }
    }
  }

  // Word-final bare consonants are usually silent (amar, kolom), except in
  // patterns that are almost always verbs or adjectives.
  function keepsFinalVowel(units, k, n) {
    const u = units[k];
    if (n === 1 || isConjunct(u)) return true;            // ন, কষ্ট, জন্য
    const prev = units[k - 1];
    const prevBare = isBare(prev);
    const prevSign = prev.type === 'C' ? prev.sign : '';
    switch (u.cons[0]) {
      case 'ত':                                            // কত, এত, দিত, শিক্ষিত
        return (n === 2 && (prevBare || prev.type === 'V')) || prevSign === SIGN_I || prevSign === SIGN_E;
      case 'ছ':                                            // আছ, করছ
        return prevBare || (n === 2 && prev.type === 'V');
      case 'ল':                                            // ছিল, গেল, করল
        return prevSign === SIGN_I || prevSign === SIGN_E || (prevBare && !isConjunct(prev) && n >= 3);
      case 'ব':                                            // যাব, দিব, দেব, করব (but খুব)
        return (prevBare && n >= 3) || (n === 2 && [SIGN_AA, SIGN_I, SIGN_E].includes(prevSign));
      case 'হ':                                            // দেহ, সহ (but শাহ)
        return prev.type === 'C' && prevSign !== SIGN_AA;
      case YYA:                                            // প্রিয়, জাতীয়
        return prevSign === SIGN_I || prevSign === SIGN_II;
    }
    return false;
  }

  // ------------------------------------------------------------- rendering

  function consonantLatin(c, opts, endsCluster) {
    if (c === 'ভ' && opts.bhAsV) return 'v';
    if (c === 'ফ' && opts.phForF) return 'ph';
    if (c === 'স' && opts.shForS && endsCluster) return 'sh';
    return CONSONANTS[c];
  }

  function clusterLatin(u, initial, opts) {
    const cons = u.cons;
    let out = '';
    let initialYa = false;
    for (let j = 0; j < cons.length; j++) {
      const c = cons[j];
      const prev = cons[j - 1];
      const next = cons[j + 1];

      // য-ফলা: doubles the consonant mid-word (অন্য → onno, মধ্যে → moddhe)
      if (j > 0 && c === 'য' && prev !== 'র') {
        if (cons.length === 2 && initial) initialYa = true;
        else if (cons.length === 2 && prev !== 'KSH') out = out[0] + out;
        continue;
      }
      // ব-ফলা: silent at the start (স্বামী → sami), "w" inside (বিশ্বাস → bishwas)
      if (j > 0 && c === 'ব' && !['ব', 'ম', 'র'].includes(prev) && !(prev === 'দ' && !initial)) {
        if (!initial) out += 'w';
        continue;
      }
      if (j > 0 && c === 'ম' && prev === 'KSH') continue;  // লক্ষ্মী → lokkhi

      if (c === 'KSH') out += initial && j === 0 ? 'kh' : 'kkh';
      else if (c === 'GY') out += initial && j === 0 ? 'gy' : 'gg';
      else out += consonantLatin(c, opts, !next || next === 'য' || next === 'ব');
    }
    if (u.geminate) out = out[0] + out;
    return { text: out, initialYa };
  }

  function modsLatin(u, isLast) {
    let s = '';
    for (const m of u.mods || '') {
      if (m === ANUSVARA) s += 'ng';
      else if (m === VISARGA && isLast) s += 'h';
    }
    return s;
  }

  function renderUnits(units, opts) {
    let out = '';
    const n = units.length;
    for (let k = 0; k < n; k++) {
      const u = units[k];
      const next = units[k + 1];
      if (u.type === 'V') {
        let s = u.latin || (u.yaPhala ? 'a' : INDEPENDENT_VOWELS[u.char]);
        // ওয় → w: পাওয়া → pawa, ওয়ালা → wala, দেওয়া → deowa
        if (u.char === 'ও' && next && next.type === 'C' && next.cons[0] === YYA) {
          next.asW = true;
          if (k === 0 || out.endsWith('a')) s = '';
        }
        out += s + modsLatin(u, k === n - 1);
      } else if (u.type === 'C') {
        const { text, initialYa } = clusterLatin(u, k === 0, opts);
        let v = u.v || '';
        if (initialYa) v = u.sign === SIGN_AA ? 'a' : v === 'o' && !u.sign ? 'e' : 'y' + v;  // ব্যস্ত → besto
        out += (u.asW ? 'w' : text) + v + modsLatin(u, k === n - 1);
      } else if (u.text === ANUSVARA) {
        out += 'ng';
      }
    }
    return out
      .replace(/chch/g, 'cch')   // ইচ্ছা → iccha
      .replace(/ngg/g, 'ng')     // সঙ্গে → songe
      .replace(/ngk/g, 'nk')     // অঙ্ক → onko
      .replace(/oo/g, 'o');      // হওয়া → howa
  }

  function ruleTransliterate(word, opts) {
    const units = parseWord(word);
    assignVowels(units);
    return renderUnits(units, opts);
  }

  // ------------------------------------------------------------ dictionaries

  function restyle(latin, opts) {
    if (opts.bhAsV) latin = latin.replace(/bh/g, 'v');
    if (opts.phForF) latin = latin.replace(/f/g, 'ph');
    return latin;
  }

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  function lookupEnglish(word) {
    if (ENGLISH[word]) return { out: ENGLISH[word], source: 'english' };
    const key = looseKey(word);
    // short keys collide with Bangla words (অন্য → অন)
    if (Array.from(key).length >= 3 && ENGLISH_LOOSE.has(key)) return { out: ENGLISH_LOOSE.get(key), source: 'english' };
    return null;
  }

  function joinSuffix(stem, suffix, english) {
    if (english) {
      if (suffix === 's') return stem + 's';                          // ফ্রেন্ডস → friends
      if (suffix === 'ing') return stem.replace(/e$/, '') + 'ing';    // চেকিং → checking
      return stem + ' ' + suffix;                                     // meeting e, project ta
    }
    if (stem.endsWith('e') && suffix.startsWith('e')) return stem + suffix.slice(1);
    return stem + suffix;
  }

  function transliterateWord(word, opts = {}, userDict = {}) {
    const w = normalize(word);
    if (hasOwn(userDict, w)) return { out: userDict[w], source: 'user' };
    if (COMMON[w]) return { out: restyle(COMMON[w], opts), source: 'dict' };
    const en = lookupEnglish(w);
    if (en) return en;

    // Bangla endings are only split off English or user-taught stems; splitting
    // Bangla words goes wrong (হলে is "hole", not হল + e).
    for (const [suf, latin, englishOnly] of SUFFIXES) {
      if (!w.endsWith(suf)) continue;
      const stemWord = w.slice(0, -suf.length);
      const stemLen = Array.from(stemWord).length;
      // short stems need a real ending: বসে is "bose" (sitting), not boss + e
      if (stemLen < 2 || (Array.from(suf).length === 1 && stemLen < 3)) continue;
      const stem = !englishOnly && hasOwn(userDict, stemWord)
        ? { out: userDict[stemWord], source: 'user' }
        : lookupEnglish(stemWord);
      if (stem) return { out: joinSuffix(stem.out, latin, stem.source === 'english'), source: stem.source };
    }
    return { out: ruleTransliterate(w, opts), source: 'rule' };
  }

  // -------------------------------------------------------- English context

  // ওকে is "ok", except before a verb or object, where it means "to him/her".
  const OKE_FOLLOWERS = /^(বল|দা|দি|দে|জিজ্ঞ|চিন|দেখ|পাঠা|নি|ছাড়|সাথে|ডাক|বোঝ|বুঝ|কিছু|একটু)/;

  // The word token next to tokens[k], or null if punctuation is in the way.
  // Latin text (typed, or returned as-is by the recognizer) counts as English.
  function neighbour(tokens, k, dir) {
    for (let i = k + dir; i >= 0 && i < tokens.length; i += dir) {
      const t = tokens[i];
      if (t.word) return t;
      if (/[A-Za-z]/.test(t.out)) {
        const parts = t.out.trim().split(/\s+/);
        return { english: true, out: dir < 0 ? parts[parts.length - 1] : parts[0] };
      }
      if (!/^\s*$/.test(t.out)) return null;
    }
    return null;
  }

  function resolveContext(tokens) {
    const matches = (word, rule) => rule === true || rule.includes(word.toLowerCase());

    // Is the neighbour on this side English (and allowed by the rule)? An
    // undecided ambiguous neighbour counts if the word beyond it is English, so
    // "দে আর কামিং" (they are coming) resolves even though দে and আর wait on each other.
    function sideOk(k, dir, rule) {
      if (!rule) return false;
      const n = neighbour(tokens, k, dir);
      if (!n) return false;
      const words = n.out.split(/\s+/);
      const edge = dir < 0 ? words[words.length - 1] : words[0];
      if (n.english) return matches(edge, rule);
      if (n.word && n.source !== 'user' && CONTEXTUAL[n.src]) {
        const beyond = neighbour(tokens, tokens.indexOf(n), dir);
        return !!(beyond && beyond.english) && matches(CONTEXTUAL[n.src][0], rule);
      }
      return false;
    }

    for (let pass = 0; pass < 2; pass++) {
      tokens.forEach((t, k) => {
        if (!t.word || t.english || t.source === 'user' || !CONTEXTUAL[t.src]) return;
        const [en, { prev, next }] = CONTEXTUAL[t.src];
        if (sideOk(k, -1, prev) || sideOk(k, 1, next)) Object.assign(t, { out: en, source: 'english', english: true });
      });
    }
    tokens.forEach((t, k) => {
      if (t.src !== 'ওকে' || !t.english) return;
      const next = neighbour(tokens, k, 1);
      if (next && next.word && OKE_FOLLOWERS.test(next.src)) Object.assign(t, { out: 'oke', source: 'rule', english: false });
    });
  }

  // ------------------------------------------------------------------ public

  const BANGLA_WORD = /[ঀ-৿‌‍]+/g;

  // Returns tokens so the UI can make each word clickable:
  // [{ src: 'আমি', out: 'ami', word: true, source: 'rule', english: false }, { src: ' ', out: ' ', word: false }, ...]
  // source is 'user' | 'dict' | 'english' | 'rule'.
  function convert(text, opts = {}, userDict = {}) {
    const src = text.replace(/[০-৯]/g, d => String(d.charCodeAt(0) - 0x09E6));
    const tokens = [];
    let last = 0;
    const plain = s => s.replace(/[।॥]/g, '.');
    for (const m of src.matchAll(BANGLA_WORD)) {
      if (m.index > last) {
        const s = src.slice(last, m.index);
        tokens.push({ src: s, out: plain(s), word: false });
      }
      const r = transliterateWord(m[0], opts, userDict);
      tokens.push({ src: normalize(m[0]), out: r.out, word: true, source: r.source, english: r.source === 'english' });
      last = m.index + m[0].length;
    }
    if (last < src.length) {
      const s = src.slice(last);
      tokens.push({ src: s, out: plain(s), word: false });
    }
    resolveContext(tokens);
    return tokens;
  }

  function transliterate(text, opts, userDict) {
    return convert(text, opts, userDict).map(t => t.out).join('');
  }

  // Split text into sentence-sized pieces (keeping the separators) so AI mode
  // can convert and cache one sentence at a time.
  function segments(text) {
    return text.match(/[^।?!.\n]+[।?!.\n]*|[।?!.\n]+/g) || [];
  }

  const api = { convert, transliterate, transliterateWord, normalize, segments };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Banglish = api;
})(typeof window !== 'undefined' ? window : globalThis);
