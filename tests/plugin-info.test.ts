import { describe, expect, it } from "vitest";

import { PLUGIN_ID } from "../src/plugin-info";

describe("Plugin-Metadaten", () => {
  it("verwendet die Manifest-ID", () => {
    expect(PLUGIN_ID).toBe("doctomd");
  });
});
