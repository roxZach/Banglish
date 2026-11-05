/*
 * Built-in word list for the Banglish converter.
 *
 * `common` – Bangla words whose everyday Banglish spelling the pronunciation
 *            rules can't work out (compounds, irregular vowels, nouns that look
 *            like verbs). Values follow the default style ("bh", "f") and are
 *            adjusted when the user picks "v" / "ph".
 *
 * English words live in english-words.js.
 */
(function (root) {
  'use strict';

  const common = {
    // irregular final vowels
    'কেন': 'keno', 'যেন': 'jeno', 'ভাল': 'bhalo', 'বড়': 'boro', 'ছোট': 'choto',
    'হল': 'holo', 'শুভ': 'shubho', 'অথবা': 'othoba', 'উচিত': 'uchit', 'জিত': 'jit',
    'ক্ষেত': 'khet',

    // older spellings without ো
    'ভালবাসি': 'bhalobasi', 'ভালবাসা': 'bhalobasa', 'ভালবাসো': 'bhalobaso',
    'ভালবাসে': 'bhalobase', 'ভাললাগে': 'bhalo lage',

    // compounds
    'তারপর': 'tarpor', 'তারপরে': 'tarpore', 'এরপর': 'erpor', 'এরপরে': 'erpore',
    'সবসময়': 'sobsomoy', 'কখনও': 'kokhono', 'কখনো': 'kokhono',

    // habitual past (-ত) after a bare consonant
    'করত': 'korto', 'বলত': 'bolto', 'পারত': 'parto', 'থাকত': 'thakto',
    'চলত': 'cholto', 'দেখত': 'dekhto', 'শুনত': 'shunto', 'আসত': 'asto',
    'হয়ত': 'hoyto', 'যাইত': 'jaito',

    // nouns ending in ল (the rules read these as past-tense verbs)
    'পাগল': 'pagol', 'সকল': 'sokol', 'আসল': 'asol', 'বদল': 'bodol', 'দখল': 'dokhol',
    'কমল': 'komol', 'কোমল': 'komol', 'বাদল': 'badol', 'পটল': 'potol', 'ছাগল': 'chagol',
    'কাজল': 'kajol', 'সফল': 'sofol', 'বিফল': 'bifol', 'সরল': 'sorol', 'তরল': 'torol',
    'নকল': 'nokol', 'আমল': 'amol', 'মহল': 'mohol', 'তেল': 'tel', 'মিল': 'mil',
    'ঝিল': 'jhil', 'কিল': 'kil',

    // casual / colloquial
    'ব্যাপার': 'bepar', 'ক্যামনে': 'kemne', 'ক্যান': 'keno', 'ঈদ': 'eid',
  };

  const dict = { common };
  if (typeof module !== 'undefined' && module.exports) module.exports = dict;
  else root.BanglishDict = dict;
})(typeof window !== 'undefined' ? window : globalThis);
