/*
 * English words as Bangla speech recognition writes them.
 *
 * When you mix English into Bangla speech, Chrome's Bangla recognizer hears the
 * English words fine but spells them in Bangla script (মিটিং, আই উইল কল ইউ).
 * This list maps them back to English. Spelling variants are matched loosely
 * (hasant, vowel length, ্যা vs ে), so one entry covers most of them.
 *
 * `words`      – always English.
 * `contextual` – also a Bangla word (আর = "ar"/and, লাভ = "labh"/profit), so it is
 *                only English next to English words: [english, { prev, next }]
 *                where each side is `true` (any English word there) or a list
 *                of English words that must be there.
 */
(function (root) {
  'use strict';

  const words = {
    // pronouns, helpers, little words
    'আই': 'i', 'আইম': "i'm", 'আইল': "i'll", 'ইউ': 'you', 'ইয়ু': 'you', 'উই': 'we',
    'শি': 'she', 'হিম': 'him', 'দেম': 'them', 'মাই': 'my', 'ইয়োর': 'your', 'ইওর': 'your',
    'আওয়ার': 'our', 'দেয়ার': 'their', 'দেয়ারস': "there's", 'ইটস': "it's", 'দ্যাটস': "that's",
    'দ্যাট': 'that', 'দিজ': 'these', 'দোজ': 'those', 'দ্য': 'the', 'অ্যান': 'an',
    'ইজ': 'is', 'অ্যাম': 'am', 'ওয়াজ': 'was', 'ওয়্যার': 'were', 'বি': 'be', 'বিন': 'been',
    'হ্যাভ': 'have', 'হ্যাজ': 'has', 'হ্যাড': 'had', 'ডু': 'do', 'ডাজ': 'does', 'ডিড': 'did',
    'ডোন্ট': "don't", 'ডিডন্ট': "didn't", 'ক্যান্ট': "can't", 'উইল': 'will',
    'উড': 'would', 'কুড': 'could', 'শুড': 'should', 'মাস্ট': 'must', 'নট': 'not',
    'অ্যান্ড': 'and', 'অর': 'or', 'বাট': 'but', 'ইফ': 'if', 'সো': 'so', 'বিকজ': 'because',
    'কজ': 'cause', 'টু': 'to', 'ফর': 'for', 'অফ': 'off', 'অন': 'on', 'ইন': 'in', 'অ্যাট': 'at',
    'উইথ': 'with', 'উইদাউট': 'without', 'ফ্রম': 'from', 'অ্যাবাউট': 'about', 'আপ': 'up',
    'ডাউন': 'down', 'আউট': 'out', 'ওভার': 'over', 'অল': 'all', 'সাম': 'some', 'এনি': 'any',
    'মোর': 'more', 'মোস্ট': 'most', 'মাচ': 'much', 'মেনি': 'many', 'ভেরি': 'very',
    'হোয়াট': 'what', 'হোয়াই': 'why', 'হাউ': 'how', 'হোয়েন': 'when', 'হোয়ার': 'where',
    'হুইচ': 'which', 'লেটস': "let's", 'লেট': 'late', 'নো': 'no', 'ইয়েস': 'yes', 'ইয়া': 'yeah',
    'ইয়াহ': 'yeah', 'ইয়েপ': 'yep', 'নোপ': 'nope', 'ওকে': 'ok', 'ওকেই': 'okay', 'ওকেহ': 'okay',
    'হাই': 'hi', 'হ্যালো': 'hello', 'হেলো': 'hello', 'বাই': 'bye', 'প্লিজ': 'please',
    'সরি': 'sorry', 'থ্যাংকস': 'thanks', 'থ্যাঙ্কস': 'thanks', 'থ্যাংক': 'thank',
    'থ্যাঙ্ক': 'thank', 'ওয়েলকাম': 'welcome', 'ওয়াও': 'wow', 'ওএমজি': 'omg', 'লোল': 'lol',
    'ব্রো': 'bro', 'ডুড': 'dude', 'গাইজ': 'guys', 'ডিয়ার': 'dear', 'হানি': 'honey', 'বেবি': 'baby',

    // time
    'টাইম': 'time', 'টুডে': 'today', 'টুমরো': 'tomorrow', 'ইয়েস্টারডে': 'yesterday',
    'নাউ': 'now', 'লেটার': 'later', 'সুন': 'soon', 'আগেইন': 'again', 'অলরেডি': 'already',
    'স্টিল': 'still', 'ইয়েট': 'yet', 'জাস্ট': 'just', 'অনলি': 'only', 'অলসো': 'also',
    'অলওয়েজ': 'always', 'নেভার': 'never', 'এভার': 'ever', 'সামটাইমস': 'sometimes',
    'মর্নিং': 'morning', 'আফটারনুন': 'afternoon', 'ইভনিং': 'evening', 'নাইট': 'night',
    'উইকেন্ড': 'weekend', 'উইকএন্ড': 'weekend', 'উইক': 'week', 'মান্থ': 'month', 'ইয়ার': 'year',
    'মিনিট': 'minute', 'সেকেন্ড': 'second', 'আওয়ার্স': 'hours', 'ডেট': 'date',
    'শিডিউল': 'schedule', 'ডেডলাইন': 'deadline', 'হলিডে': 'holiday', 'ভ্যাকেশন': 'vacation',

    // adverbs / feelings
    'রিয়েলি': 'really', 'অ্যাকচুয়ালি': 'actually', 'অ্যাকচুয়ালী': 'actually',
    'বেসিক্যালি': 'basically', 'সিরিয়াসলি': 'seriously', 'অবভিয়াসলি': 'obviously',
    'ডেফিনিটলি': 'definitely', 'প্রোবাবলি': 'probably', 'মেবি': 'maybe', 'অ্যাবসোলিউটলি': 'absolutely',
    'লিটারেলি': 'literally', 'হোপফুলি': 'hopefully', 'এক্সাক্টলি': 'exactly', 'টোটালি': 'totally',
    'নাইস': 'nice', 'কুল': 'cool', 'অসাম': 'awesome', 'গ্রেট': 'great', 'পারফেক্ট': 'perfect',
    'বিউটিফুল': 'beautiful', 'কিউট': 'cute', 'ফানি': 'funny', 'বোরিং': 'boring',
    'ইন্টারেস্টিং': 'interesting', 'ইম্পর্ট্যান্ট': 'important', 'আর্জেন্ট': 'urgent',
    'ইজি': 'easy', 'হার্ড': 'hard', 'ডিফিকাল্ট': 'difficult', 'সিম্পল': 'simple', 'ফ্রি': 'free',
    'বিজি': 'busy', 'টায়ার্ড': 'tired', 'হাংরি': 'hungry', 'স্যাড': 'sad', 'হ্যাপি': 'happy',
    'অ্যাংরি': 'angry', 'সিক': 'sick', 'ফাইন': 'fine', 'রেডি': 'ready', 'শিওর': 'sure',
    'সিওর': 'sure', 'রাইট': 'right', 'ট্রু': 'true', 'ফেক': 'fake', 'রিয়েল': 'real',
    'আর্লি': 'early', 'ফাস্ট': 'fast', 'স্লো': 'slow', 'বিগ': 'big', 'স্মল': 'small',
    'লং': 'long', 'শর্ট': 'short', 'হট': 'hot', 'কোল্ড': 'cold', 'নিউ': 'new', 'ওল্ড': 'old',
    'ফার্স্ট': 'first', 'লাস্ট': 'last', 'নেক্সট': 'next', 'স্পেশাল': 'special', 'নরমাল': 'normal',
    'সেফ': 'safe', 'ক্লিয়ার': 'clear', 'ক্লোজ': 'close', 'ওপেন': 'open', 'সিরিয়াস': 'serious',
    'ক্রেজি': 'crazy', 'পসিবল': 'possible', 'ইম্পসিবল': 'impossible', 'অলরাইট': 'alright',
    'গুড': 'good', 'ব্যাড': 'bad', 'বেটার': 'better', 'বেস্ট': 'best', 'ওয়ার্স্ট': 'worst',
    'সেম': 'same', 'ডিফারেন্ট': 'different', 'অফিশিয়াল': 'official', 'প্রাইভেট': 'private',
    'টেনশন': 'tension', 'স্ট্রেস': 'stress', 'মুড': 'mood', 'ফিলিং': 'feeling', 'ফিল': 'feel',
    'লাইফ': 'life', 'ড্রিম': 'dream', 'প্রবলেম': 'problem', 'ইস্যু': 'issue', 'সলিউশন': 'solution',
    'আইডিয়া': 'idea', 'অপশন': 'option', 'চান্স': 'chance', 'রিজন': 'reason', 'কোয়েশ্চেন': 'question',
    'কোশ্চেন': 'question', 'আনসার': 'answer', 'ডিসিশন': 'decision', 'এক্সপেরিয়েন্স': 'experience',

    // people
    'ফ্রেন্ড': 'friend', 'বেস্টফ্রেন্ড': 'bestfriend', 'ফ্যামিলি': 'family', 'ব্রাদার': 'brother',
    'সিস্টার': 'sister', 'মম': 'mom', 'ড্যাড': 'dad', 'গার্লফ্রেন্ড': 'girlfriend',
    'বয়ফ্রেন্ড': 'boyfriend', 'ক্রাশ': 'crush', 'হাজব্যান্ড': 'husband', 'ওয়াইফ': 'wife',
    'পিপল': 'people', 'ম্যান': 'man', 'গার্ল': 'girl', 'বয়': 'boy', 'বস': 'boss', 'টিম': 'team',
    'ক্লায়েন্ট': 'client', 'কাস্টমার': 'customer', 'ম্যানেজার': 'manager', 'টিচার': 'teacher',
    'স্যার': 'sir', 'ম্যাডাম': 'madam', 'ম্যাম': "ma'am", 'স্টুডেন্ট': 'student',
    'ডাক্তার': 'doctor', 'ডক্টর': 'doctor', 'ড্রাইভার': 'driver', 'প্লেয়ার': 'player',

    // work & study
    'অফিস': 'office', 'জব': 'job', 'ওয়ার্ক': 'work', 'কোম্পানি': 'company', 'ইন্টারভিউ': 'interview',
    'স্যালারি': 'salary', 'বোনাস': 'bonus', 'মিটিং': 'meeting', 'প্রজেক্ট': 'project',
    'প্রোজেক্ট': 'project', 'রিপোর্ট': 'report', 'প্রেজেন্টেশন': 'presentation',
    'অ্যাসাইনমেন্ট': 'assignment', 'এক্সাম': 'exam', 'কুইজ': 'quiz', 'ক্লাস': 'class',
    'কোর্স': 'course', 'সেমিস্টার': 'semester', 'রেজাল্ট': 'result', 'সিজিপিএ': 'cgpa',
    'নোট': 'note', 'নোটস': 'notes', 'লাইব্রেরি': 'library', 'হোমওয়ার্ক': 'homework',
    'টিউশন': 'tuition', 'কোচিং': 'coaching', 'ক্যাম্পাস': 'campus', 'স্কুল': 'school',
    'কলেজ': 'college', 'ভার্সিটি': 'varsity', 'ইউনিভার্সিটি': 'university', 'হোস্টেল': 'hostel',
    'মার্কস': 'marks', 'গ্রেড': 'grade', 'পাস': 'pass', 'ফেল': 'fail', 'টেস্ট': 'test',
    'প্ল্যান': 'plan', 'টার্গেট': 'target', 'সাকসেস': 'success', 'টাস্ক': 'task',
    'ডকুমেন্ট': 'document', 'ফাইল': 'file', 'ফোল্ডার': 'folder', 'প্রিন্ট': 'print',
    'ডিজাইন': 'design', 'কোড': 'code', 'বাগ': 'bug', 'সিস্টেম': 'system', 'সফটওয়্যার': 'software',
    'ওয়েবসাইট': 'website', 'সার্ভার': 'server', 'ডেভেলপার': 'developer', 'প্রোগ্রামিং': 'programming',
    'এআই': 'AI', 'চ্যাটজিপিটি': 'ChatGPT', 'ক্লড': 'Claude',

    // tech & social
    'ফোন': 'phone', 'মোবাইল': 'mobile', 'ল্যাপটপ': 'laptop', 'কম্পিউটার': 'computer',
    'পিসি': 'pc', 'চার্জার': 'charger', 'চার্জ': 'charge', 'ব্যাটারি': 'battery',
    'হেডফোন': 'headphone', 'ইয়ারফোন': 'earphone', 'নেটওয়ার্ক': 'network', 'সিগন্যাল': 'signal',
    'ওয়াইফাই': 'wifi', 'ইন্টারনেট': 'internet', 'নেট': 'net', 'ডাটা': 'data', 'রিচার্জ': 'recharge',
    'অ্যাকাউন্ট': 'account', 'আইডি': 'id', 'পাসওয়ার্ড': 'password', 'ইমেইল': 'email',
    'নাম্বার': 'number', 'লিংক': 'link', 'পেজ': 'page', 'গ্রুপ': 'group', 'চ্যানেল': 'channel',
    'পোস্ট': 'post', 'স্টোরি': 'story', 'রিল': 'reel', 'রিলস': 'reels', 'লাইভ': 'live',
    'ফেসবুক': 'facebook', 'মেসেঞ্জার': 'messenger', 'হোয়াটসঅ্যাপ': 'whatsapp', 'ইমো': 'imo',
    'ভাইবার': 'viber', 'ইউটিউব': 'youtube', 'গুগল': 'google', 'টিকটক': 'tiktok',
    'ইনস্টাগ্রাম': 'instagram', 'টুইটার': 'twitter', 'লিংকডইন': 'linkedin', 'জুম': 'zoom',
    'বিকাশ': 'bkash', 'অ্যাপ': 'app', 'গেম': 'game', 'ভিডিও': 'video', 'ফটো': 'photo',
    'পিক': 'pic', 'পিকচার': 'picture', 'সেলফি': 'selfie', 'ক্যামেরা': 'camera',
    'মেসেজ': 'message', 'ম্যাসেজ': 'message', 'টেক্সট': 'text', 'কল': 'call',
    'নোটিফিকেশন': 'notification', 'স্ক্রিনশট': 'screenshot',

    // verbs
    'সেন্ড': 'send', 'রিপ্লাই': 'reply', 'চেক': 'check', 'ওয়েট': 'wait', 'স্টার্ট': 'start',
    'স্টপ': 'stop', 'ফিনিশ': 'finish', 'কমপ্লিট': 'complete', 'সাবমিট': 'submit',
    'আপলোড': 'upload', 'ডাউনলোড': 'download', 'শেয়ার': 'share', 'লাইক': 'like',
    'কমেন্ট': 'comment', 'ট্রাই': 'try', 'হেল্প': 'help', 'ম্যানেজ': 'manage',
    'কনফার্ম': 'confirm', 'ক্যান্সেল': 'cancel', 'অর্ডার': 'order', 'পে': 'pay',
    'অ্যাপ্লাই': 'apply', 'জয়েন': 'join', 'লিভ': 'leave', 'মিস': 'miss', 'মিট': 'meet',
    'প্লে': 'play', 'ওয়াচ': 'watch', 'রিড': 'read', 'লার্ন': 'learn', 'স্টাডি': 'study',
    'প্র্যাকটিস': 'practice', 'চেঞ্জ': 'change', 'আপডেট': 'update', 'ইনস্টল': 'install',
    'রিস্টার্ট': 'restart', 'সেভ': 'save', 'ডিলিট': 'delete', 'ব্লক': 'block', 'ফলো': 'follow',
    'আনফলো': 'unfollow', 'সাবস্ক্রাইব': 'subscribe', 'লগইন': 'login', 'লগআউট': 'logout',
    'ভিজিট': 'visit', 'শিফট': 'shift', 'ড্রাইভ': 'drive', 'রাইড': 'ride', 'ড্রপ': 'drop',
    'ক্লিক': 'click', 'সিলেক্ট': 'select', 'সার্চ': 'search', 'ফিক্স': 'fix', 'রান': 'run',
    'ডিসাইড': 'decide', 'হেট': 'hate', 'ট্রাভেল': 'travel', 'এনজয়': 'enjoy', 'রিল্যাক্স': 'relax',
    'থিংক': 'think', 'নিড': 'need', 'ওয়ান্ট': 'want', 'গেট': 'get', 'গট': 'got',
    'গোয়িং': 'going', 'কামিং': 'coming', 'ডুয়িং': 'doing', 'সিন': 'seen', 'ইটিং': 'eating',
    'ওয়েটিং': 'waiting', 'ট্রায়িং': 'trying', 'প্লেয়িং': 'playing', 'ওয়ার্কিং': 'working', 'লুক': 'look', 'টক': 'talk', 'টেল': 'tell',
    'ওয়ান': 'one', 'থ্রি': 'three', 'ফোর': 'four', 'ফাইভ': 'five', 'সিক্স': 'six',
    'সেভেন': 'seven', 'এইট': 'eight', 'নাইন': 'nine', 'টেন': 'ten',

    // places, things, food
    'রুম': 'room', 'বাথরুম': 'bathroom', 'কিচেন': 'kitchen', 'ফ্ল্যাট': 'flat', 'হোম': 'home',
    'রোড': 'road', 'ট্রাফিক': 'traffic', 'জ্যাম': 'jam', 'উবার': 'uber', 'বাইক': 'bike',
    'বাস': 'bus', 'ট্রেন': 'train', 'প্লেন': 'plane', 'ফ্লাইট': 'flight', 'এয়ারপোর্ট': 'airport',
    'স্টেশন': 'station', 'টিকেট': 'ticket', 'টিকিট': 'ticket', 'হোটেল': 'hotel',
    'রেস্টুরেন্ট': 'restaurant', 'ক্যাফে': 'cafe', 'কফি': 'coffee', 'বার্গার': 'burger',
    'পিজ্জা': 'pizza', 'পিৎজা': 'pizza', 'চিকেন': 'chicken', 'ফ্রাই': 'fry', 'আইসক্রিম': 'ice cream',
    'কেক': 'cake', 'চকলেট': 'chocolate', 'ডিনার': 'dinner', 'লাঞ্চ': 'lunch',
    'ব্রেকফাস্ট': 'breakfast', 'পার্টি': 'party', 'ট্রিট': 'treat', 'গিফট': 'gift',
    'বার্থডে': 'birthday', 'অ্যানিভার্সারি': 'anniversary', 'ওয়েডিং': 'wedding', 'ট্যুর': 'tour',
    'ট্রিপ': 'trip', 'মুভি': 'movie', 'সিরিজ': 'series', 'ড্রামা': 'drama', 'সং': 'song',
    'মিউজিক': 'music', 'নিউজ': 'news', 'ম্যাচ': 'match', 'ক্রিকেট': 'cricket', 'ফুটবল': 'football',
    'স্কোর': 'score', 'লেভেল': 'level', 'উইন': 'win', 'জিম': 'gym', 'ওয়ার্কআউট': 'workout',
    'ডায়েট': 'diet', 'হসপিটাল': 'hospital', 'মেডিসিন': 'medicine', 'ফিভার': 'fever',
    'হেডেক': 'headache', 'মার্কেট': 'market', 'শপিং': 'shopping', 'শপ': 'shop', 'অনলাইন': 'online',
    'অফলাইন': 'offline', 'ডেলিভারি': 'delivery', 'প্রাইস': 'price', 'অফার': 'offer',
    'ডিসকাউন্ট': 'discount', 'ক্যাশ': 'cash', 'কার্ড': 'card', 'ব্যাংক': 'bank', 'লোন': 'loan',
    'বিল': 'bill', 'ডলার': 'dollar', 'পেমেন্ট': 'payment', 'সিট': 'seat', 'লাইন': 'line',
    'রেল': 'rail', 'ড্রেস': 'dress', 'সারপ্রাইজ': 'surprise', 'সাইড': 'side', 'লেফট': 'left',
    'টপ': 'top', 'বেড': 'bed', 'নেম': 'name', 'কেয়ার': 'care', 'ফান': 'fun',
  };

  const PRONOUNS = ['you', 'we', 'they', 'these', 'those', 'there', 'what', 'how', 'where', 'who', 'why', 'when', 'which'];

  const OBJECT_TAKERS = ['is', 'was', 'like', 'do', 'does', 'did', 'about', 'for', 'with', 'see', 'check',
    'try', 'watch', 'read', 'in', 'on', 'at', 'of', 'from', 'love', 'want', 'need', 'take', 'get'];

  const contextual = {
    'আর': ['are', { prev: PRONOUNS }],                         // ফোন আর ল্যাপটপ stays "ar"
    'দে': ['they', { next: true }],                            // কল দে stays "de"
    'দেন': ['then', { prev: ['and', 'so', 'since', 'back', 'till', 'until', 'ok', 'okay'] }],
    'দিস': ['this', { next: true, prev: OBJECT_TAKERS }],      // কল দিস stays "dis"
    'হু': ['who', { next: ['is', 'are', 'was', 'were', 'cares', 'knows', 'will', 'did', 'does'] }],
    'দা': ['the', { next: true }],
    'ইট': ['it', { prev: true, next: true }],
    'হি': ['he', { next: true }],
    'হার': ['her', { prev: true, next: true }],
    'আস': ['us', { prev: true }],
    'গো': ['go', { prev: true, next: true }],
    'কাম': ['come', { prev: true, next: true }],
    'সি': ['see', { prev: true, next: true }],
    'মি': ['me', { prev: true, next: true }],
    'ক্যান': ['can', { prev: true, next: true }],
    'লাভ': ['love', { prev: true, next: true }],
    'বুক': ['book', { prev: true, next: true }],
    'কার': ['car', { prev: true }],
    'রং': ['wrong', { prev: true }],
    'ডান': ['done', { prev: true }],
    'মানি': ['money', { prev: true }],
    'পাওয়ার': ['power', { prev: true, next: true }],
    'শো': ['show', { prev: true, next: true }],
    'ওয়ে': ['way', { prev: true, next: true }],
    'টাচ': ['touch', { prev: true, next: true }],
    'সেট': ['set', { prev: true, next: true }],
  };

  const english = { words, contextual };
  if (typeof module !== 'undefined' && module.exports) module.exports = english;
  else root.BanglishEnglish = english;
})(typeof window !== 'undefined' ? window : globalThis);
