# Import ABC to MuseScore

אפליקציית שולחן עבודה שממירה **ABC notation** ל־**MusicXML** (יעד ראשי) ול־**MIDI** (גיבוי), לפתיחה ב־**MuseScore**. הממשק מנוסח לצרכן — לא מציג stack traces או חריקות טכניות.

## בחירת Stack (מומלץ) — למה?

| שכבה | בחירה | סיבות |
|------|--------|--------|
| Desktop shell | **Tauri 2** | חבילה קטנה יחסית, ביצועים טובים, Rust core לאבטחה/קבצים, build cross-platform (Windows + macOS) |
| UI | **React 19 + TypeScript + Vite** | מודרני, נפוץ, קל לתחזוקה |
| מנוע ABC | **abcjs** (MIT, mature) | פרסר ABC בשימוש רחב, כולל כבר יצירת MIDI פנימית; אין ספריית JS ציבורית חזקה ממנה להמרה ישירה ABC→MusicXML ברמת fidelity מלאה |

**Tradeoff מפורש:** המרה ל־MusicXML נבנית **מעל מודל ה־parse של abcjs** ושכבת ייצוא XML מותאמת אישית. אלמנטים מורכבים (חזרות מפורטות, קישוטים נדירים, כל שורות `w:`) עשויים לרדת בדיוק או לקבל אזהרה — ה־MIDI שמגיע מאותו מנוע משמש כ־**fallback** כשמשתמשים בייצוא MIDI.

## ארכיטקטורה (שכבות)

```
UI (React) ──► Application (hooks / state / history)
                    │
                    ▼
              abcPipeline (parse, batch, preview)
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 voiceExporter  musicXmlBuilder   abcjs.synth.getMidiFile
 (voices→measures)  (MusicXML 3.1)   (MIDI binary)
      │
      ▼
 Tauri commands: save/read text & binary, find MuseScore, open files
```

- **UI:** טפסים, Drag & Drop, תור ישן (localStorage), תצוגה מקדימה.
- **Application:** זרימת המרה, דיאלוגים (שמירה/פתיחה) דרך `@tauri-apps/plugin-dialog`.
- **Import/Parse:** `abcjs.parseOnly`.
- **Validation / הודעות:** הודעות בסגנון מוצר (מיפוי טקסט אזהרות abcjs).
- **Conversion:** חישוב משכי תווים, טריולות (כמו ב־`abc_midi_sequencer`), פיצ’ ברים.
- **Export:** בניית `score-partwise` MusicXML; MIDI מהספרייה.
- **Integration:** איתור MuseScore (נתיבים נפוצים / `MUSESCORE_PATH`), פתיחת קובץ.

## מבנה תיקיות

```
src/
  App.tsx, App.css, main.tsx
  conversion/
    abcPipeline.ts      — API ציבורי: convert, preview, count tunes
    voiceExporter.ts    — איסוף קולות ומידול תיבות
    musicXmlBuilder.ts  — MusicXML
    pitchMidi.ts        — מיפוי pitch/MIDI ↔ MusicXML
    logger.ts
src-tauri/
  src/lib.rs            — פקודות Rust
  tauri.conf.json
examples/abc/           — דוגמאות לבדיקה
```

## תלויות עיקריות

- `abcjs` — פענוח ABC + MIDI.
- `@tauri-apps/api`, `tauri-plugin-dialog`, `tauri-plugin-opener`.
- `react`, `react-dom`, `vite`, `typescript`.
- פיתוח: `vitest`, `happy-dom`.

## אסטרטגיית המרה ABC → MusicXML

1. **Parse** עם `parseOnly` → אובייקט tune (`lines`/`staff`/`voices`).
2. **איסוף קולות** באותו סדר כמו מחולל ה־MIDI של abcjs (קול מתחדש לכל שורת תווים, מצטברות יחד).
3. **לכל קול:** מעבר על `el_type`: `note`, `bar`, `key` — משכי תווים ביחידות “תווים שלמים” (whole = 1), כולל טיפול בסיסי בטריולות.
4. **מיפוי pitch:** נגזר מלוגיקת `abc_midi_flattener` (מפתח/סולם + בר אקידנטלים).
5. **ייצוג MusicXML:** `divisions=768`, יצירת `part` לכל קול, `measure` עבור כל תיבה (ריפוד אם אורכי תיבות לא תואמים — עם אזהרה).

## הרצה ופיתוח

דרישות:

- **Node.js** 18+ (מומלץ LTS)
- **Rust** + [Tauri prerequisites](https://tauri.app/start/prerequisites/) (חובה ל־`npm run tauri dev` / `tauri build`)

```bash
npm install
npm run dev          # קדמת בלבד (דפדפן)
npm run tauri dev    # האפליקציה המלאה
npm test
npm run tauri build  # חבילה להפצה
```

### MuseScore

- Windows: נסיון לאתר אוטומטית נתיבים תחת `Program Files`.
- macOS: `Applications/MuseScore 4.app/...`
- אפשר להגדיר משתנה סביבה **`MUSESCORE_PATH`** לנתיב ה־executable.

## בדיקות

```bash
npm test
```

כיסוי לייצוג MIDI בתווים פשוטים ולפונקציות pitch בסיסיות.

## שיפורים עתידיים (הצעות)

- תצוגה גרפית של התווים (SVG דרך `abcjs.renderAbc`).
- טיפול עשיר יותר בחזרות/סיומות/MusicXML `<barline>`.
- זיהוי אוטומטי לתיקון שגיאות נפוצות ב־ABC.
- ייצוא לפורמטים נוספים (MSCZ דרך MuseScore headless — תלוי בהתקנה).
- פיצול dynamic import ל־`abcjs` כדי להקטין chunk ראשי.

## רישיון

MIT (בהתאם ל־abcjs ולתלויות).
