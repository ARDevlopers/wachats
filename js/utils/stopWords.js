/* ============================================================
   ChatLens Stop Words
   Common English stop words filtered from word analytics
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.StopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're",
    "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself',
    'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those',
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
    'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
    'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
    'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
    't', 'can', 'will', 'just', 'don', "don't", 'should', "should've", 'now', 'd',
    'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't",
    'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't",
    'haven', "haven't", 'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn',
    "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't",
    'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't",
    // Additional common chat words to filter
    'ok', 'okay', 'yes', 'no', 'yeah', 'yep', 'nope', 'hey', 'hi', 'hello',
    'bye', 'lol', 'haha', 'hmm', 'oh', 'ah', 'um', 'uh', 'like', 'just',
    'got', 'get', 'go', 'going', 'gone', 'come', 'came', 'also', 'still',
    'already', 'yet', 'even', 'well', 'back', 'would', 'could', 'much',
    'really', 'right', 'good', 'know', 'think', 'want', 'see', 'way',
    'look', 'make', 'tell', 'say', 'said', 'let', 'thing', 'things',
    'one', 'two', 'new', 'time', 'day', 'take', 'give', 'may', 'might',
    'shall', 'must', 'need', 'k', 'na', 'ya', 'da', 'de',
    // WhatsApp specific
    'media', 'omitted', 'message', 'deleted', 'image', 'video', 'audio',
    'sticker', 'gif', 'document', 'contact', 'card', 'location', 'attached',
    'https', 'http', 'www', 'com'
  ]);
})();
