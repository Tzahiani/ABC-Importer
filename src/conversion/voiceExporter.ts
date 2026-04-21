import {
  midiFromAbcPitch,
  resetBarAccidentals,
  setKeySignatureAccidentals,
} from "./pitchMidi";
import { devLog } from "./logger";

/** Mirrors abcjs key signature shape */
type KeySignature = {
  accidentals?: { acc: string; note: string }[];
  root?: string;
  mode?: string;
};

export interface ExportedNote {
  durationWhole: number;
  /** MIDI pitches for chord tones */
  midiNotes: number[];
  isRest: boolean;
}

export type MeasureBlock = ExportedNote[];

export interface VoiceExportResult {
  measures: MeasureBlock[];
  /** Human-facing messages */
  warnings: string[];
}

/** Process a single abcjs voice[] sequentially (same order as abc_midi_sequencer). */
export function exportVoiceElements(
  voice: unknown[],
  initialKey: KeySignature | undefined,
  transpose = 0,
): VoiceExportResult {
  const warnings: string[] = [];
  let keyAcc = setKeySignatureAccidentals(initialKey ?? {});
  let barAcc = resetBarAccidentals();

  let tripletMultiplier = 0;
  let tripletDurationTotal = 0;
  let tripletDurationCount = 0;

  const measures: MeasureBlock[] = [];
  let current: MeasureBlock = [];

  const pushNote = (n: ExportedNote) => {
    current.push(n);
  };

  for (let v = 0; v < voice.length; v++) {
    const elem = voice[v] as Record<string, unknown>;
    const elType = elem.el_type as string;

    switch (elType) {
      case "note": {
        if (elem.rest && (elem.rest as { type?: string }).type === "spacer") {
          break;
        }

        let dur = (elem.duration as number) === 0 ? 0.25 : (elem.duration as number);

        if (elem.startTriplet) {
          const st = elem as { startTriplet?: number; tripletMultiplier?: number; tripletR?: number; duration?: number };
          tripletMultiplier = st.tripletMultiplier ?? 2 / 3;
          tripletDurationTotal = (st.startTriplet ?? 0) * tripletMultiplier * dur;
          if (st.startTriplet !== st.tripletR && st.tripletR && voice.length > v + st.tripletR) {
            let durationTotal = 0;
            for (let w = v; w < v + st.tripletR; w++) {
              durationTotal += (voice[w] as { duration?: number }).duration ?? 0;
            }
            tripletDurationTotal = tripletMultiplier * durationTotal;
          }
          dur = dur * tripletMultiplier;
          dur = Math.round(dur * 1e6) / 1e6;
          tripletDurationCount = dur;
        } else if (tripletMultiplier) {
          const endT = (elem as { endTriplet?: boolean }).endTriplet;
          if (endT) {
            tripletMultiplier = 0;
            dur = Math.round((tripletDurationTotal - tripletDurationCount) * 1e6) / 1e6;
          } else {
            dur = dur * tripletMultiplier;
            dur = Math.round(dur * 1e6) / 1e6;
            tripletDurationCount += dur;
          }
        }

        const isRest = !!(elem as { rest?: unknown }).rest;
        const graces = (elem as { gracenotes?: unknown[] }).gracenotes;
        if (graces && graces.length) {
          warnings.push("נמצאו תווי עיטור — חלק מהגרסה הלאה לא ינותחו ב-MusicXML ויצאו בלי תווי העיטור (ניתן לנסות MIDI).");
        }
        if (
          (elem as { lyric?: unknown[] }).lyric &&
          ((elem as { lyric?: unknown[] }).lyric?.length ?? 0) > 0
        ) {
          warnings.push("נמצאו מילים בשורות (lyrics) — התמיכה ב-MusicXML בגרסה זו חלקית.");
        }

        if (isRest) {
          pushNote({ durationWhole: dur, midiNotes: [], isRest: true });
        } else {
          const pitches = (elem as { pitches?: { pitch: number; accidental?: string; midipitch?: number }[] })
            .pitches;
          if (!pitches || pitches.length === 0) {
            devLog.warn("note without pitches", elem);
            pushNote({ durationWhole: dur, midiNotes: [60], isRest: false });
            break;
          }
          const midis = pitches.map((p) => midiFromAbcPitch(p, barAcc, keyAcc, transpose));
          pushNote({ durationWhole: dur, midiNotes: midis, isRest: false });
        }
        break;
      }
      case "key":
      case "keySignature":
        keyAcc = setKeySignatureAccidentals((elem as { accidentals?: { acc: string; note: string }[] }) ?? {});
        break;
      case "bar": {
        barAcc = resetBarAccidentals();
        measures.push(current);
        current = [];
        break;
      }
      case "meter":
      case "clef":
      case "stem":
      case "scale":
      case "style":
      case "break":
      case "tempo":
      case "midi":
      case "transpose":
      case "overlay":
      case "part":
        break;
      default:
        break;
    }
  }

  if (current.length) {
    measures.push(current);
  }

  return { measures, warnings };
}

type StaffLine = {
  staff?: {
    key?: KeySignature;
    clef?: { type?: string };
    voices?: unknown[][];
  }[];
  columns?: { lines?: unknown[] };
};

function isTabClef(st: { clef?: { type?: string } }): boolean {
  const t = st.clef?.type;
  if (!t || typeof t !== "string") return false;
  return t.toUpperCase() === "TAB";
}

/**
 * שורות מוזיקה כמו ש־abcjs משתמש בפנים אחרי מיזוג שורות (deline).
 * בלי זה, קבצים מרובי שורות לפעמים לא נאספים נכון.
 */
export function getMusicLinesForExport(tune: {
  lines?: StaffLine[];
  deline?: (opt?: object) => StaffLine[];
}): StaffLine[] {
  const raw = tune.lines ?? [];
  try {
    if (typeof tune.deline === "function") {
      const merged = tune.deline({});
      if (Array.isArray(merged) && merged.length > 0) {
        return merged as StaffLine[];
      }
    }
  } catch (e) {
    devLog.warn("deline() failed, using raw lines", e);
  }
  return raw;
}

/**
 * Flatten tune lines into per-voice event streams (same ordering as abcjs `abc_midi_sequencer`).
 * `voiceNumber` resets each line; streams persist across lines.
 */
export function collectVoicesFromTune(tune: {
  lines?: StaffLine[];
  deline?: (opt?: object) => StaffLine[];
}): { voices: unknown[][]; keys: (KeySignature | undefined)[] } {
  const voices: unknown[][] = [];
  const keys: (KeySignature | undefined)[] = [];

  const lines = getMusicLinesForExport(tune);

  for (const line of lines) {
    if (!line.staff?.length) continue;
    let voiceNumber = 0;
    for (const st of line.staff) {
      if (!st) continue;
      if (isTabClef(st)) continue;
      const vlist = st.voices;
      if (!vlist || vlist.length === 0) continue;
      for (let k = 0; k < vlist.length; k++) {
        if (!voices[voiceNumber]) {
          voices[voiceNumber] = [];
          keys[voiceNumber] = st.key;
        }
        for (const ev of vlist[k] ?? []) {
          voices[voiceNumber].push(ev);
        }
        voiceNumber++;
      }
    }
  }

  return { voices, keys };
}
