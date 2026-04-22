import { describe, it, expect } from "vitest";
import { parsePluginManifest } from "@/core/parsers/pluginManifest";

describe("pluginManifest parser", () => {
  it("reads .claude-plugin/plugin.json fields", () => {
    const src = JSON.stringify({
      name: "acme",
      version: "1.0.0",
      description: "A",
      author: "Acme Corp",
      publisher: "acme",
    });
    expect(parsePluginManifest(src, "/abs/plugin.json")).toMatchObject({
      name: "acme",
      version: "1.0.0",
      author: "Acme Corp",
      publisher: "acme",
    });
  });

  it("falls back to package.json claudePlugin field", () => {
    const src = JSON.stringify({
      name: "pkg",
      claudePlugin: { description: "C", author: "X" },
    });
    const p = parsePluginManifest(src, "/abs/package.json");
    expect(p).toMatchObject({ name: "pkg", description: "C", author: "X" });
  });

  it("returns author=null for minimal manifest", () => {
    const p = parsePluginManifest(
      JSON.stringify({ name: "anon" }),
      "/abs/plugin.json",
    );
    expect(p.author).toBeNull();
  });
});
