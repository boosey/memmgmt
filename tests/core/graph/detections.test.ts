import { describe, it, expect } from "vitest";
import { DetectionEmitter } from "@/core/graph/detections";
import { DETECTION_CONVENTIONS } from "@/core/entities";

describe("DetectionEmitter", () => {
  it("groups occurrences by convention", () => {
    const e = new DetectionEmitter();
    e.emit(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key, "/plug/a.json");
    e.emit(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key, "/plug/b.json");
    const out = e.flush();
    expect(out).toHaveLength(1);
    expect(out[0]!.occurrences).toHaveLength(2);
  });

  it("orders flushed detections by count desc then convention asc", () => {
    const e = new DetectionEmitter();
    e.emit(DETECTION_CONVENTIONS.SETTINGS_UNKNOWN_TOP_LEVEL.key, "/s.json");
    e.emit(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key, "/p.json");
    e.emit(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key, "/p2.json");
    const out = e.flush();
    expect(out[0]!.convention).toBe(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key);
    expect(out[1]!.convention).toBe(
      DETECTION_CONVENTIONS.SETTINGS_UNKNOWN_TOP_LEVEL.key,
    );
  });

  it("carries excerpts when provided", () => {
    const e = new DetectionEmitter();
    e.emit(
      DETECTION_CONVENTIONS.SETTINGS_UNKNOWN_TOP_LEVEL.key,
      "/s.json",
      "foobar",
    );
    const out = e.flush();
    expect(out[0]!.occurrences[0]).toEqual({
      sourceFile: "/s.json",
      excerpt: "foobar",
    });
  });

  it("count() reports per-convention counts without flushing", () => {
    const e = new DetectionEmitter();
    e.emit(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key, "/p.json");
    expect(e.count(DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key)).toBe(1);
  });
});
