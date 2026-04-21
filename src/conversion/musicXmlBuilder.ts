import { collectVoicesFromTune, exportVoiceElements, type MeasureBlock } from "./voiceExporter";
import { midiToMusicXmlPitch } from "./pitchMidi";
import { devLog } from "./logger";

const DIVISIONS = 768;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function durationToDivisions(whole: number): number {
  return Math.max(1, Math.round(whole * 4 * DIVISIONS));
}

function keyToFifths(key: {
  accidentals?: { acc: string; note: string }[];
}): number {
  if (!key.accidentals?.length) return 0;
  let fifths = 0;
  for (const a of key.accidentals) {
    if (a.acc === "sharp" || a.acc === "dblsharp") fifths += a.acc === "dblsharp" ? 2 : 1;
    else if (a.acc === "flat" || a.acc === "dblflat") fifths -= a.acc === "dblflat" ? 2 : 1;
  }
  return Math.max(-7, Math.min(7, fifths));
}

function buildMeasureXml(
  block: MeasureBlock | undefined,
  measureNumber: number,
  attrXml: string,
): string {
  let inner = attrXml;
  if (!block || block.length === 0) {
    inner += `<note><rest/><duration>${DIVISIONS}</duration><voice>1</voice><type>quarter</type></note>`;
  } else {
    for (const n of block) {
      const dur = durationToDivisions(n.durationWhole);
      const typeName = approximateNoteType(n.durationWhole);
      if (n.isRest) {
        inner += `<note><rest/><duration>${dur}</duration><voice>1</voice><type>${typeName}</type></note>`;
      } else {
        for (let i = 0; i < n.midiNotes.length; i++) {
          const midi = n.midiNotes[i];
          const p = midiToMusicXmlPitch(midi);
          const alter =
            p.alter !== undefined ? `<alter>${p.alter}</alter>` : "";
          const chordTag = i > 0 ? "<chord/>" : "";
          inner += `<note>${chordTag}<pitch><step>${p.step}</step>${alter}<octave>${p.octave}</octave></pitch><duration>${dur}</duration><voice>1</voice><type>${typeName}</type></note>`;
        }
      }
    }
  }
  return `<measure number="${measureNumber}">${inner}</measure>`;
}

function approximateNoteType(whole: number): string {
  const q = whole * 4;
  const names = [
    { t: "whole", v: 4 },
    { t: "half", v: 2 },
    { t: "quarter", v: 1 },
    { t: "eighth", v: 0.5 },
    { t: "16th", v: 0.25 },
    { t: "32nd", v: 0.125 },
  ];
  let best = "quarter";
  let diff = Infinity;
  for (const { t, v } of names) {
    const d = Math.abs(q - v);
    if (d < diff) {
      diff = d;
      best = t;
    }
  }
  return best;
}

export interface MusicXmlResult {
  xml: string;
  warnings: string[];
  measureCount: number;
}

export function buildMusicXmlFromTune(
  tune: {
    lines: {
      staff?: { key?: unknown; clef?: { type?: string }; voices: unknown[][] }[];
    }[];
    deline?: (opt?: object) => unknown[];
    metaText?: Record<string, unknown>;
    getMeterFraction?: () => { num: number; den: number };
    getKeySignature?: () => { accidentals?: { acc: string; note: string }[] };
  },
  tuneIndex: number,
): MusicXmlResult {
  const warnings: string[] = [];

  const { voices, keys } = collectVoicesFromTune(tune as Parameters<typeof collectVoicesFromTune>[0]);
  if (voices.length === 0) {
    warnings.push(
      "לא זוהו תווים רגילים לייצוא (רק תווית טאב / TAB, או אין מקטע תווים אחרי K: ו־L:). " +
        "הוסיפו שורת תווים רגילה (לא רק טאב), או בצעו 'המרה' ל-MIDI אם יש.",
    );
    return {
      xml: "",
      warnings,
      measureCount: 0,
    };
  }

  const partMeasures: MeasureBlock[][] = [];
  for (let vi = 0; vi < voices.length; vi++) {
    const r = exportVoiceElements(voices[vi], keys[vi]);
    partMeasures.push(r.measures);
    warnings.push(...r.warnings);
  }

  const maxM = Math.max(...partMeasures.map((m) => m.length), 0);
  if (partMeasures.some((pm) => pm.length !== maxM)) {
    warnings.push(
      "אורך כמה קולות לא זהה לפי תיבות — המרנו עם ריפוד שקט כדי ש-MuseScore יוכל לפתוח את הקובץ.",
    );
  }

  const mf = tune.getMeterFraction?.() ?? { num: 4, den: 4 };
  const ks = tune.getKeySignature?.() ?? {};

  const attrBlock = `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>${keyToFifths(ks)}</fifths></key><time><beats>${mf.num}</beats><beat-type>${mf.den}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`;

  let scorePartwise = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1">`;

  const partList = `<part-list>${voices
    .map(
      (_, i) =>
        `<score-part id="P${i + 1}"><part-name>Voice ${i + 1}</part-name></score-part>`,
    )
    .join("")}</part-list>`;

  scorePartwise += `<work><work-title>${xmlEscape(String((tune.metaText?.title as string) ?? `Tune ${tuneIndex + 1}`))}</work-title></work>`;
  scorePartwise += partList;

  for (let p = 0; p < partMeasures.length; p++) {
    const pm = partMeasures[p];
    scorePartwise += `<part id="P${p + 1}">`;
    for (let m = 0; m < maxM; m++) {
      const attr = m === 0 ? attrBlock : "";
      const block = pm[m] as MeasureBlock | undefined;
      scorePartwise += buildMeasureXml(block, m + 1, attr);
    }
    scorePartwise += `</part>`;
  }

  scorePartwise += `</score-partwise>`;

  devLog.debug("MusicXML built, parts:", partMeasures.length, "measures:", maxM);

  return { xml: scorePartwise, warnings: [...new Set(warnings)], measureCount: maxM };
}
