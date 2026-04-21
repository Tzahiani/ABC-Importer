/** abcjs internal pitch uses diatonic steps + octave encoded in `pitch` number (see abc_midi_flattener). */

const CHROMATIC = [0, 2, 4, 5, 7, 9, 11];

function extractOctave(pitch: number): number {
  return Math.floor(pitch / 7);
}

function extractNote(pitch: number): number {
  let p = pitch % 7;
  if (p < 0) p += 7;
  return p;
}

export function setKeySignatureAccidentals(key: {
  accidentals?: { acc: string; note: string }[];
}): number[] {
  const accidentals = [0, 0, 0, 0, 0, 0, 0];
  if (!key.accidentals) return accidentals;
  for (const acc of key.accidentals) {
    let d = 0;
    switch (acc.acc) {
      case "flat":
        d = -1;
        break;
      case "quarterflat":
        d = -0.25;
        break;
      case "sharp":
        d = 1;
        break;
      case "quartersharp":
        d = 0.25;
        break;
      default:
        d = 0;
    }
    const lowercase = acc.note.toLowerCase();
    const idx = (lowercase.charCodeAt(0) - "c".charCodeAt(0) + 7) % 7;
    accidentals[idx] += d;
  }
  return accidentals;
}

export function midiFromAbcPitch(
  note: {
    pitch: number;
    accidental?: string;
    midipitch?: number;
  },
  barAccidentals: Record<number, number>,
  keyAccidentals: number[],
  transpose = 0,
): number {
  if (note.midipitch !== undefined) return note.midipitch + transpose;

  if (note.accidental) {
    switch (note.accidental) {
      case "sharp":
        barAccidentals[note.pitch] = 1;
        break;
      case "flat":
        barAccidentals[note.pitch] = -1;
        break;
      case "natural":
        barAccidentals[note.pitch] = 0;
        break;
      case "dblsharp":
        barAccidentals[note.pitch] = 2;
        break;
      case "dblflat":
        barAccidentals[note.pitch] = -2;
        break;
      case "quartersharp":
        barAccidentals[note.pitch] = 0.25;
        break;
      case "quarterflat":
        barAccidentals[note.pitch] = -0.25;
        break;
    }
  }

  const actualPitch =
    extractOctave(note.pitch) * 12 +
    CHROMATIC[extractNote(note.pitch)] +
    60;

  let midi = actualPitch;
  if (barAccidentals[note.pitch] !== undefined) {
    midi += barAccidentals[note.pitch];
  } else {
    midi += keyAccidentals[extractNote(note.pitch)];
  }
  midi += transpose;
  return Math.round(midi);
}

export function resetBarAccidentals(): Record<number, number> {
  return {};
}

/** Convert MIDI note to MusicXML step / alter / octave (middle C = 60 → C4). */
export function midiToMusicXmlPitch(midi: number): { step: string; alter?: number; octave: number } {
  const pitchNames = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const step = pitchNames[pc];
  const alter = alters[pc] === 0 ? undefined : alters[pc];
  return { step, alter, octave };
}
