# ABC NoteMate

**ABC NoteMate®** עוזר להפוך קבצי **ABC** ל־**MusicXML** (לפתיחה ב־**MuseScore**) ול־**MIDI**. הממשק זמין בעברית ובאנגלית.

---

## להשתמש בדפדפן (הכי פשוט)

אין צורך להתקין כלום — רק דפדפן (Chrome, Edge, Firefox וכו’).

**פתחו את הכתובת:**

**https://Tzahiani.github.io/ABC-Importer/**

שמרו את התוצאות כמו הורדת קובץ רגילה מהאינטרנט.  
אם האתר עדיין לא עלה, בעל הפרויקט צריך להפעיל את האתר ב־GitHub (פעם אחת בהגדרות; אין צורך שאתם תדעו את הפרטים).

---

## להריץ על המחשב כאפליקציית חלונות (דסקטופ)

כאן נוח לפתוח קבצים ולשמור ישר לתיקייה, ובדרך כלל מתאים למי שעובד הרבה עם קבצים.

### אם יש קובץ התקנה מוכן

בעתיד אפשר יהיה לפרסם קובץ התקנה תחת **Releases** ב־GitHub — אז מורידים את הקובץ (`*.exe` בווינדוס) ומתקינים כמו כל תוכנה.

### לבנות והרצה מהמחשב שלכם (מפתחים / מתנסים)

נדרשים כלים חינמיים: **Node.js** (מהאתר הרשמי) ו־**Rust** — לפי [מדריך הקדם־דרישות של Tauri](https://tauri.app/start/prerequisites/) (פעם אחת בהתקנה).

בטרמינל:

```bash
git clone https://github.com/Tzahiani/ABC-Importer.git
cd ABC-Importer
npm install
npm run tauri dev
```

כדי לייצר קובץ התקנה אצלכם:

```bash
npm run tauri build
```

**MuseScore:** אם התוכנה מותקנת במחשב, האפליקציה מנסה למצוא אותה אוטומטית.

---

## English (short)

- **In the browser:** open **https://Tzahiani.github.io/ABC-Importer/** — no install.
- **Desktop:** with dev tools installed, clone the repo, `npm install`, then `npm run tauri dev` (or `npm run tauri build` for an installer).

---

## רישיון

MIT (עם תלויות בקוד הפתוח של הספריות שבשימוש).
