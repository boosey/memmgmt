import { describe, it, expect } from "vitest";
import {
  extractMcpServers,
  parseMcpServerEntry,
} from "@/core/parsers/mcpServer";

describe("mcpServer parser", () => {
  it("extracts one entity per server with stdio transport inferred", () => {
    const raw = {
      mcpServers: {
        foo: { command: "node", args: ["server.js"] },
        bar: { url: "https://api.example.com/mcp" },
      },
    };
    const out = extractMcpServers(raw);
    expect(out).toHaveLength(2);
    const foo = out.find((s) => s.name === "foo")!;
    expect(foo.transport).toBe("stdio");
    expect(foo.command).toBe("node");
    expect(foo.args).toEqual(["server.js"]);
    const bar = out.find((s) => s.name === "bar")!;
    expect(bar.transport).toBe("http");
    expect(bar.url).toBe("https://api.example.com/mcp");
  });

  it("honors explicit transport type", () => {
    const s = parseMcpServerEntry("x", { type: "sse", url: "http://x" });
    expect(s.transport).toBe("sse");
  });

  it("captures env as strings", () => {
    const s = parseMcpServerEntry("x", {
      command: "node",
      env: { A: "1", B: 2 },
    });
    expect(s.env).toEqual({ A: "1", B: "2" });
  });

  it("treats disabled=true as enabled=false", () => {
    const s = parseMcpServerEntry("x", { command: "node", disabled: true });
    expect(s.enabled).toBe(false);
  });

  it("preserves raw object for round-tripping", () => {
    const raw = { command: "node", custom: "hello" };
    const s = parseMcpServerEntry("x", raw);
    expect(s.raw).toEqual(raw);
  });

  it("returns empty when no mcpServers key", () => {
    expect(extractMcpServers({})).toEqual([]);
  });
});
