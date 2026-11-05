// Run with: node test/transliterate.test.js
const { transliterate } = require('../js/transliterate.js');

const cases = [
  ['আমি তোমাকে ভালোবাসি', 'ami tomake bhalobasi'],
  ['কেমন আছো', 'kemon acho'],
  ['তুমি কি করছো', 'tumi ki korcho'],
  ['আমি ভাত খেয়েছি', 'ami bhat kheyechi'],
  ['আজকে অনেক গরম', 'ajke onek gorom'],
  ['বাংলাদেশ', 'bangladesh'],
  ['ঠিক আছে', 'thik ache'],
  ['কোথায় যাচ্ছ', 'kothay jaccho'],
  ['খুব ভালো লাগছে', 'khub bhalo lagche'],
  ['শুভ জন্মদিন', 'shubho jonmodin'],
  ['ধন্যবাদ', 'dhonnobad'],
  ['কিন্তু এখন সময় নেই', 'kintu ekhon somoy nei'],
  ['আমরা কাল সকালে যাব', 'amra kal sokale jabo'],
  ['আমি পরে কল করব', 'ami pore call korbo'],
  ['সে কী বলল', 'se ki bollo'],
  ['ও ছিল না', 'o chilo na'],
  ['তোমার জন্য', 'tomar jonno'],
  ['অন্য কিছু', 'onno kichu'],
  ['সমস্যা নেই', 'somossa nei'],
  ['ইচ্ছা', 'iccha'],
  ['পরীক্ষা', 'porikkha'],
  ['ক্ষমা করো', 'khoma koro'],
  ['দুঃখিত', 'dukkhito'],
  ['দুঃখ', 'dukkho'],
  ['খাওয়া দাওয়া', 'khawa dawa'],
  ['হওয়া', 'howa'],
  ['মেয়েটা', 'meyeta'],
  ['প্রিয় বন্ধু', 'priyo bondhu'],
  ['সুন্দর', 'sundor'],
  ['বিশ্বাস', 'bishwas'],
  ['স্বপ্ন', 'sopno'],
  ['এখনই', 'ekhoni'],
  ['বই', 'boi'],
  ['সবাই', 'sobai'],
  ['কত টাকা', 'koto taka'],
  ['মধ্যে', 'moddhe'],
  ['সন্ধ্যায়', 'sondhay'],
  ['অবস্থা', 'obostha'],
  ['কষ্ট', 'koshto'],
  ['মানুষ', 'manush'],
  ['কলম', 'kolom'],
  ['খবরটা', 'khoborta'],
  ['আপনার নাম কি', 'apnar nam ki'],
  ['বাসায় আসো', 'basay aso'],
  ['ফোনটা দাও', 'phone ta dao'],

  // English spoken inside Bangla (recognizer writes it in Bangla script)
  ['আই উইল কল ইউ লেটার', 'i will call you later'],
  ['আজকে অফিসে একটা ইম্পর্ট্যান্ট মিটিং আছে', 'ajke office e ekta important meeting ache'],
  ['প্রজেক্টটা ডেডলাইনের আগে সাবমিট করতে হবে', 'project ta deadline er age submit korte hobe'],
  ['ইমপর্টেন্ট', 'important'],
  ['মিটিংয়ে আছি', 'meeting e achi'],
  ['ফ্রেন্ডদের সাথে', 'friend der sathe'],
  ['ফ্রেন্ডস', 'friends'],
  ['চেকিং করছি', 'checking korchi'],
  ['আই লাভ ইউ', 'i love you'],
  ['ইউ আর রাইট', 'you are right'],
  ['দিস টাইম না', 'this time na'],
  ['ব্রো জাস্ট ওয়েট কর', 'bro just wait kor'],
  ['সিরিয়াসলি আমি অনেক বিজি', 'seriously ami onek busy'],
  ['ওকে আমি আসছি', 'ok ami aschi'],
  ['I am fine তুমি কেমন', 'I am fine tumi kemon'],
  ['হোয়াট আর ইউ ডুয়িং', 'what are you doing'],
  ['দে আর কামিং', 'they are coming'],
  ['হু ইজ দিস', 'who is this'],
  ['নেক্সট উইকে এক্সাম', 'next week e exam'],
  ['মেসেজটা সিন করছে', 'message ta seen korche'],

  // Bangla words that look like English must stay Bangla
  ['কোনো লাভ নাই', 'kono labh nai'],
  ['ফোন আর ল্যাপটপ', 'phone ar laptop'],
  ['কল দেন', 'call den'],
  ['কল দিস', 'call dis'],
  ['ওকে বলো', 'oke bolo'],
  ['বসে আছি', 'bose achi'],
  ['আসলে হলে', 'asle hole'],
  ['আমার পাশে', 'amar pashe'],
  ['ক্যান আসলা না', 'keno asla na'],
  ['ফেসবুকে দেখলাম', 'facebook e dekhlam'],
  ['১২টা বাজে', '12ta baje'],
  ['আমি ভালো আছি। তুমি?', 'ami bhalo achi. tumi?'],
  ['হ্যাঁ', 'ha'],
  ['ব্যস্ত', 'besto'],
  ['শিক্ষিত', 'shikkhito'],
  ['জ্ঞান', 'gyan'],
  ['বিজ্ঞান', 'biggan'],
  ['রং', 'rong'],
  ['সঙ্গে', 'songe'],
  ['আল্লাহ', 'allah'],
  ['পারবো না', 'parbo na'],
  ['পারব', 'parbo'],
  ['দেখব', 'dekhbo'],
  ['করছিলাম', 'korchilam'],
  ['কার্যকর', 'karjokor'],
  ['সূর্য', 'surjo'],
  ['হয়তো', 'hoyto'],
  ['নতুন', 'notun'],
  ['ভাইয়া', 'bhaiya'],
  ['আব্বু আম্মু', 'abbu ammu'],
];

let failed = 0;
for (const [bn, want] of cases) {
  const got = transliterate(bn);
  if (got !== want) {
    failed++;
    console.log(`FAIL  ${bn}\n      want: ${want}\n      got:  ${got}`);
  }
}

// style options
const styled = transliterate('আমি ভালো আছি, ফোন দিও', { bhAsV: true, phForF: true });
if (styled !== 'ami valo achi, phone dio') { failed++; console.log('FAIL  style options:', styled); }
const sh = transliterate('সব স্কুল', { shForS: true });
if (sh !== 'shob school') { failed++; console.log('FAIL  sh option:', sh); }

// user dictionary wins, and also applies with suffixes
const user = { 'আমি': 'mi', 'দোস্ত': 'dost' };
const u = transliterate('আমি দোস্তকে বলছি', {}, user);
if (u !== 'mi dostke bolchi') { failed++; console.log('FAIL  user dict:', u); }

console.log(failed ? `\n${failed} failed of ${cases.length + 3}` : `All ${cases.length + 3} passed`);
process.exit(failed ? 1 : 0);
