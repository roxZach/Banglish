# Banglish

Speak Bangla, mixed with English if you like, and get it written in Banglish:
Bangla in English letters, the way we text on Facebook and Messenger.

> আই উইল কল ইউ লেটার, এখন অনেক বিজি → **i will call you later, ekhon onek busy**

**Use it: https://roxzach.github.io/Banglish/**

Every push to `main` updates the site automatically (GitHub Pages).

## Run it locally

```bash
python -m http.server 5500
```

Open <http://localhost:5500> in **Google Chrome or Microsoft Edge**, tap the mic
(or press Space) and talk. Voice input uses the browser's built-in speech
service, so it needs internet and doesn't work in Brave, Opera or Firefox.
Typing or pasting Bangla works in any browser.

## Install it like an app

Once it's hosted on an https address:

- **Android (Chrome):** open the link → ⋮ menu → **Add to Home screen** / **Install app**.
- **PC (Chrome or Edge):** open the link → click the install icon at the right end of the address bar.
- **iPhone (Safari):** Share → **Add to Home Screen**. Safari's built-in speech may not support Bangla; if the mic doesn't work, tap the Bangla box and use the keyboard's own mic button.

The app's files are cached on the device, so it opens instantly. Voice input still needs internet.

## Features

- **Live voice input** in Bangla (Bangladesh or West Bengal accent) with a voice visualizer
- **English inside Bangla speech**: Chrome writes your English words in Bangla
  script (মিটিং, আই উইল কল ইউ), and the app turns them back into English
  (meeting, i will call you). They're highlighted in blue.
- **Click any word** to teach the app your spelling. It remembers it (in your browser).
- **Spelling style**: ভ as v, ফ as ph, স as sh
- **AI mode (optional)**: Claude rewrites each sentence as natural Banglish and
  catches English words the built-in list misses. Needs your own Anthropic API
  key (Settings). The key stays in your browser and is only sent to Anthropic.
- Light and dark themes, works on phones

## How it works

| File | What it does |
|---|---|
| `js/transliterate.js` | The converter: Bangla pronunciation rules, English detection, Bangla endings on English words (মিটিংয়ে → meeting e) |
| `js/english-words.js` | ~560 English words as Bangla speech recognition spells them, plus words like আর / লাভ that are only English next to other English words |
| `js/dictionary.js` | Bangla words the rules get wrong |
| `js/ai.js` | Optional AI mode (Claude API, called from the browser) |
| `js/app.js` | UI, speech recognition, visualizer, settings |

Tests: `node test/transliterate.test.js`
