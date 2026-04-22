import { describe, it, expect } from "vitest";
import {
  parseKeybindings,
  serializeKeybindings,
} from "@/core/parsers/keybindings";

const SAMPLE = `{ "Ctrl+S": "save", "Ctrl+Shift+P": "command-palette" }`;

describe("keybindings parser", () => {
  it("extracts entries", () => {
    expect(parseKeybindings(SAMPLE).entries).toEqual([
      { chord: "Ctrl+S", action: "save" },
      { chord: "Ctrl+Shift+P", action: "command-palette" },
    ]);
  });

  it("round-trips via JSON parity", () => {
    const parsed = parseKeybindings(SAMPLE);
    expect(JSON.parse(serializeKeybindings(parsed))).toEqual(JSON.parse(SAMPLE));
  });
});
