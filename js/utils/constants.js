/* ============================================================
   ChatLens Constants & Pattern Engine
   Full WhatsApp export regexes, file extensions, tagging rules
   ============================================================ */

(function() {
  'use strict';

  const WCA = window.WCA = window.WCA || {};

  WCA.Constants = {
    // Local storage key prefix
    STORAGE_PREFIX: 'chatlens_',

    // Virtual scroll parameters
    VIRTUAL_SCROLL: {
      ITEM_HEIGHT: 72,
      BUFFER_SIZE: 20,
      SCROLL_THROTTLE: 16
    },

    // Search settings
    SEARCH: {
      DEBOUNCE_MS: 250,
      MAX_RESULTS: 500
    },

    // Parser parameters
    PARSER: {
      CHUNK_SIZE: 5000,
      AUTO_DETECT_LINES: 50
    },

    // Comprehensive File Type Extension Mappings
    FILE_TYPES: {
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'],
      videos: ['mp4', 'm4v', 'mov', 'avi', 'mkv', '3gp', 'webm', 'wmv'],
      audio: ['opus', 'ogg', 'mp3', 'm4a', 'aac', 'wav', 'amr', 'wma', 'flac'],
      pdf: ['pdf'],
      excel: ['xlsx', 'xls', 'csv', 'ods'],
      word: ['doc', 'docx', 'odt', 'rtf', 'txt'],
      ppt: ['ppt', 'pptx', 'odp'],
      apk: ['apk', 'aab'],
      zip: ['zip', 'rar', '7z', 'tar', 'gz'],
      contacts: ['vcf', 'vcard']
    },

    // UI File Icons
    FILE_ICONS: {
      images: '🖼️',
      videos: '🎥',
      audio: '🎙️',
      pdf: '📕',
      excel: '📊',
      word: '📘',
      ppt: '📙',
      apk: '🤖',
      zip: '📦',
      contacts: '👤',
      location: '📍',
      link: '🔗',
      otp: '🔑',
      sensitive: '🔒',
      other: '📎'
    },

    // Categorized Social & Web Domains
    SOCIAL_DOMAINS: {
      google_maps: ['maps.google.com', 'maps.app.goo.gl', 'goo.gl/maps'],
      youtube: ['youtube.com', 'youtu.be'],
      instagram: ['instagram.com', 'instagr.am'],
      facebook: ['facebook.com', 'fb.watch', 'fb.me'],
      google_drive: ['drive.google.com', 'docs.google.com'],
      amazon: ['amazon.com', 'amazon.in', 'amzn.to', 'amzn.in'],
      flipkart: ['flipkart.com', 'fkrt.it'],
      github: ['github.com', 'gist.github.com'],
      whatsapp: ['chat.whatsapp.com', 'wa.me', 'api.whatsapp.com'],
      webex: ['webex.com'],
      google_meet: ['meet.google.com']
    },

    // Comprehensive Regular Expression Library
    REGEX: {
      // Message line start: supports DD/MM/YY, DD/MM/YYYY, MM/DD/YY, YYYY-MM-DD, 12h/24h with brackets or dashes
      // Handles U+202E, U+200E, non-breaking space (U+00A0), narrow no-break space (U+202F)
      MESSAGE_LINE: /^\[?(\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})[,\s\u00A0\u202F]+(\d{1,2}[:\.]\d{2}(?:[:\.]\d{2})?\s*(?:[AaPp][Mm])?)\]?\s*[\-–—]?\s*/,

      // Sender and message text splitter
      SENDER_MSG: /^([^:\n\r]+):\s*([\s\S]*)$/,

      // Attachment text pattern (e.g. IMG-20240513-WA0005.jpg (file attached))
      ATTACHMENT: /([a-zA-Z0-9_\-\.\s]+\.(?:jpg|jpeg|png|webp|gif|mp4|mov|opus|ogg|mp3|m4a|pdf|xlsx|xls|doc|docx|ppt|pptx|apk|zip|vcf))\s*\(file attached\)/i,

      // Media omitted indicator
      MEDIA_OMITTED: /<Media omitted>|<Medien weggelassen>|<Médias omis>/i,

      // Deleted message patterns
      DELETED_MSG: /You deleted this message|This message was deleted|Dieses Signal wurde gelöscht|Ce message a été supprimé|message deleted/i,

      // Edited tag
      EDITED_MSG: /\(edited\)\s*$/i,

      // Forwarded tag
      FORWARDED_MSG: /^\u200E?\[?Forwarded\]?\s*/i,

      // Standard URL regex
      URL: /(?:https?:\/\/|www\.)[^\s<>\u200E"]+/gi,

      // Email address regex
      EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,

      // Phone number regex (international or local format)
      PHONE: /(?:\+|\b)(?:\d{1,3}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}\b/g,

      // OTP code regex (4 to 8 digit standalone numbers or OTP keyword + code)
      OTP: /^\b\d{4,8}\b$|\b(?:OTP|code|verification code|pin)\s*(?:is|:)?\s*(\d{4,8})\b/i,

      // Sensitive / Password-like messages (e.g. Adm@8529, DccRajkot#2, Pass@123)
      SENSITIVE: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@#$%^&+=!_\-]).{6,25}$|^(?:password|pass|pin|secret|adm|admin)[:=]\s*\S+/i,

      // Geographic Coordinates (e.g. 22.267434,70.794146)
      COORDINATES: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,

      // Live location indicator
      LIVE_LOCATION: /live location shared|shared live location|location: https:\/\/maps/i,

      // WhatsApp Chat TXT Export Filename Pattern
      CHAT_FILE: /^WhatsApp Chat with .+\.txt$|^_chat\.txt$/i,

      // Unicode Script Ranges for Language Detection
      GUJARATI: /[\u0A80-\u0AFF]/,
      HINDI: /[\u0900-\u097F]/,
      ENGLISH: /[a-zA-Z]/
    },

    // Chart Palette & Aesthetics
    CHART_COLORS: {
      primary: ['#6c5ce7', '#00cec9', '#fdcb6e', '#e84393', '#00b894', '#e17055', '#0984e3', '#6c5ce7'],
      senders: [
        '#6c5ce7', '#00cec9', '#e84393', '#fdcb6e', '#00b894',
        '#e17055', '#0984e3', '#a29bfe', '#55efc4', '#ff7675'
      ],
      heatmap: {
        dark: ['#1a1a2e', '#2d1b69', '#4a1a8a', '#6c5ce7', '#a29bfe'],
        light: ['#f0f2f7', '#d5d0f5', '#b3a8f0', '#6c5ce7', '#4a3cb5']
      }
    },

    // Date & Time Constants
    DAY_NAMES: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    DAY_NAMES_SHORT: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    MONTH_NAMES: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    MONTH_NAMES_SHORT: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    TIME_PERIODS: {
      MORNING: { label: 'Morning (6 AM - 12 PM)', emoji: '🌅' },
      AFTERNOON: { label: 'Afternoon (12 PM - 5 PM)', emoji: '☀️' },
      EVENING: { label: 'Evening (5 PM - 9 PM)', emoji: '🌆' },
      NIGHT: { label: 'Night (9 PM - 6 AM)', emoji: '🌙' }
    }
  };
})();
