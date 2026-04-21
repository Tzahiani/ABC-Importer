export type Locale = "he" | "en";

const STR = {
  heroTitle: { he: "ייבוא ABC ל-MuseScore", en: "Import ABC to MuseScore" },
  heroSubtitle: {
    he: "המרת תווים מ-ABC ל־MusicXML לפתיחה ב-MuseScore — בלי מונחים טכניים ובלי שורות שגיאה מבהילות.",
    en: "Turn ABC notation into MusicXML for MuseScore — plain language, calm error hints.",
  },
  langToHe: { he: "עברית", en: "עברית" },
  langToEn: { he: "English", en: "English" },
  langSwitchToEnAria: { he: "החלפה לאנגלית", en: "Switch to English" },
  langSwitchToHeAria: { he: "החלפה לעברית", en: "Switch to Hebrew" },
  tabsAria: { he: "מקור קלט", en: "Input source" },
  tabDrop: { he: "גרירה / קובץ", en: "Drop / file" },
  tabPaste: { he: "הדבקת טקסט", en: "Paste text" },
  tabBatch: { he: "המרה קבוצתית", en: "Batch convert" },
  batchIntro: {
    he: "בחרו כמה קבצי ‎.abc — לכל קובץ ייווצר ‎.musicxml באותה תיקייה עם אותו שם בסיס.",
    en: "Pick several ‎.abc files — each gets a ‎.musicxml beside it with the same base name.",
  },
  batchPick: { he: "בחר קבצים להמרה קבוצתית", en: "Choose files for batch" },
  dropDrag: { he: "גררו לכאן קובץ ‎.abc", en: "Drop an ‎.abc file here" },
  dropPick: { he: "בחירת קובץ…", en: "Choose file…" },
  dropRegionAria: { he: "אזור גרירה", en: "Drop zone" },
  labelAbc: { he: "טקסט ABC", en: "ABC text" },
  tuneInFile: { he: "לחן בתוך הקובץ", en: "Tune in file" },
  tuneOf: { he: "{{n}} מתוך {{total}}", en: "{{n}} of {{total}}" },
  converting: { he: "ממיר…", en: "Converting…" },
  convert: { he: "המרה", en: "Convert" },
  resultOk: { he: "ההמרה הצליחה", en: "Conversion succeeded" },
  resultCheck: { he: "יש מה לבדוק", en: "Something to review" },
  saveMusicXml: { he: "שמירת MusicXML", en: "Save MusicXML" },
  openMuseScore: { he: "פתיחה ב-MuseScore", en: "Open in MuseScore" },
  exportMidi: { he: "ייצוא MIDI", en: "Export MIDI" },
  midiUnavailableTitle: {
    he: "אין קובץ MIDI זמין — נסו שוב אחרי המרה",
    en: "No MIDI available — try again after converting",
  },
  recentFiles: { he: "קבצים אחרונים", en: "Recent files" },
  historyLocalLabel: { he: "פרופיל היסטוריה מקומית", en: "Local history profile" },
  historyLocalHint: {
    he: "ההיסטוריה נשמרת רק במכשיר ובדפדפן הזה ולא נשלחת לשרת. אנשים במכשירים שונים לא רואים זה את זה. אם כמה אנשים משתמשים באותו דפדפן, בחרו פרופיל שונה לכל אחד.",
    en: "History stays on this device and browser only—nothing is sent to a server. People on other devices won’t see each other’s list. If several people share this browser, pick a different profile for each person.",
  },
  historyProfileP1: { he: "משתמש 1 (ברירת מחדל)", en: "Profile 1 (default)" },
  historyProfileP2: { he: "משתמש 2", en: "Profile 2" },
  historyProfileP3: { he: "משתמש 3", en: "Profile 3" },
  historyProfileP4: { he: "משתמש 4", en: "Profile 4" },
  footer: {
    he: "יש המרות שלא ממפות אחד-לאחד ל-MusicXML — תמיד אפשר לשמור ולבדוק ב-MuseScore. לפיתוח: לוגים בקונסולה בלבד.",
    en: "Some conversions don’t map one-to-one to MusicXML — save and check in MuseScore. Dev: logs in the console only.",
  },
  footerCopyright: {
    he: "© {{year}} א.צ יזמות. כל הזכויות שמורות.",
    en: "© {{year}} A.Tz Yozmot. All rights reserved.",
  },
  footerIpNotice: {
    he: "שם המוצר ‎ABC NoteMate®‎, סימני המסחר, הלוגואים והמיתוג של היישום (כולל עיצוב ממשק ומדיה) מוגנים בדין. הפרה אסורה. אין להעתיק, לשכפל, לפרסם, להפיץ, לבצע הנדסה לאחור או לעשות שימוש מסחרי ללא רשות מפורשת בכתב מאת בעלי הזכויות. כל האמור לעיל חל גם על קוד המקור, קבצי עיצוב, טקסטים ותיעוד.",
    en: "The product name ABC NoteMate®, trademarks, logos, and application branding (including UI design and media) are protected by law. Unauthorized copying, reproduction, publication, distribution, reverse engineering, or commercial use without express written permission from the rights holders is strictly prohibited. This also applies to source code, design assets, copy, and documentation.",
  },
  previewAria: { he: "תצוגה מקדימה", en: "Preview" },
  previewHeading: { he: "מידע לפני ההמרה", en: "Before conversion" },
  previewTitle: { he: "כותרת", en: "Title" },
  previewComposer: { he: "מלחין / מחבר", en: "Composer" },
  previewMeter: { he: "משקל (Meter)", en: "Meter" },
  previewKey: { he: "סולם (Key)", en: "Key" },
  previewTempo: { he: "קצב", en: "Tempo" },
  previewVoices: { he: "מספר קולות", en: "Voices" },
  previewDash: { he: "—", en: "—" },
  saveXmlFailed: { he: "שמירת MusicXML נכשלה: {{e}}", en: "Saving MusicXML failed: {{e}}" },
  saveMidiFailed: { he: "שמירת MIDI נכשלה: {{e}}", en: "Saving MIDI failed: {{e}}" },
  openMuseFailed: { he: "פתיחה ב-MuseScore נכשלה: {{e}}", en: "Open in MuseScore failed: {{e}}" },
  browserMuseHint: {
    he: "במצב דפדפן הורדנו קובץ — פתחו אותו ידנית ב-MuseScore. לחלונות שמירה/פתיחה של המערכת הריצו ‎npm run tauri dev‎.",
    en: "In the browser we downloaded a file — open it in MuseScore manually. For native save/open dialogs run ‎npm run tauri dev‎.",
  },
  batchSaved: { he: "נשמר: {{path}}", en: "Saved: {{path}}" },
  batchNotConverted: { he: "לא הומר: {{path}}", en: "Not converted: {{path}}" },
} as const;

export type TranslationKey = keyof typeof STR;

export function t(locale: Locale, key: TranslationKey): string {
  return STR[key][locale];
}

export function ti(
  locale: Locale,
  key: TranslationKey,
  vars: Record<string, string>,
): string {
  let s: string = STR[key][locale];
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(v);
  }
  return s;
}
