import { describe, it, expect } from "vitest";
import { midiToMusicXmlPitch } from "./pitchMidi";

describe("midiToMusicXmlPitch", () => {
  it("maps middle C (MIDI 60)", () => {
    const p = midiToMusicXmlPitch(60);
    expect(p.step).toBe("C");
    expect(p.octave).toBe(4);
  });
});
