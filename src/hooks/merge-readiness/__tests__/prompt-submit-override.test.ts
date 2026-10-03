import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createInitialMergeReadinessState,
  handleMergeReadinessPromptSubmit,
  readMergeReadinessState,
} from "../runtime.js";

// Carrier for the `--override` spelling of handleMergeReadinessPromptSubmit
// (merge-readiness runtime, the `/^\/(?:oh-my-qoder:|omq:|oh-my-claudecode:|omc:)?merge-readiness\s+--override\s+(.+)$/i`
// site). The widening from the ancestor-only prefix to the four-prefix union
// previously shipped with no test, because the state reachable from
// createInitialMergeReadinessState alone is result:"blocked" in a bare temp
// dir, and overrideMergeReadiness refuses blocked gates — which makes every
// spelling return handled:false and any fixture asserting on it assert
// nothing. What the state machine needs is evidence: a git repo with an
// uncommitted change makes createInitialMergeReadinessState produce a
// result:"pending" (non-blocked) active gate, which overrideMergeReadiness
// accepts once a maintainer principal is configured.

const COMMAND_FORMS = [
  '/merge-readiness',
  '/omq:merge-readiness',
  '/oh-my-qoder:merge-readiness',
  '/omc:merge-readiness',
  '/oh-my-claudecode:merge-readiness',
] as const;

describe("handleMergeReadinessPromptSubmit --override spelling", () => {
  let tempDir: string;
  const sessionId = "prompt-submit-override-session";
  const originalPrincipal = process.env.OMQ_MERGE_READINESS_AUTHENTICATED_PRINCIPAL;
  const originalMaintainers = process.env.OMQ_MERGE_READINESS_MAINTAINERS;

  beforeEach(() => {
    process.env.OMQ_MERGE_READINESS_AUTHENTICATED_PRINCIPAL = "github:trusted-maintainer";
    process.env.OMQ_MERGE_READINESS_MAINTAINERS = "github:trusted-maintainer";
    tempDir = mkdtempSync(join(tmpdir(), "omq-mr-override-"));
    execFileSync("git", ["init"], { cwd: tempDir, stdio: "ignore", windowsHide: true });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir, stdio: "ignore", windowsHide: true });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd: tempDir, stdio: "ignore", windowsHide: true });
    writeFileSync(join(tempDir, "README.md"), "before\n");
    execFileSync("git", ["add", "README.md"], { cwd: tempDir, stdio: "ignore", windowsHide: true });
    execFileSync("git", ["commit", "-m", "initial"], { cwd: tempDir, stdio: "ignore", windowsHide: true });
    writeFileSync(join(tempDir, "README.md"), "after\n");
  });

  afterEach(() => {
    if (originalPrincipal === undefined) delete process.env.OMQ_MERGE_READINESS_AUTHENTICATED_PRINCIPAL;
    else process.env.OMQ_MERGE_READINESS_AUTHENTICATED_PRINCIPAL = originalPrincipal;
    if (originalMaintainers === undefined) delete process.env.OMQ_MERGE_READINESS_MAINTAINERS;
    else process.env.OMQ_MERGE_READINESS_MAINTAINERS = originalMaintainers;
    rmSync(tempDir, { recursive: true, force: true });
  });

  function seedPendingGate(): void {
    const state = createInitialMergeReadinessState(
      tempDir,
      "/merge-readiness --quick change",
      sessionId,
    );
    // The precondition the ledger's #50 note demanded, made explicit: an
    // evidence-complete gate is result:"pending", not "blocked". A blocked
    // gate is exactly the shape every spelling returns handled:false for.
    expect(state.result).toBe("pending");
    expect(state.active).toBe(true);
  }

  describe.each(COMMAND_FORMS)("override via %s", (command) => {
    it("handles the prompt and records the override on the gate", () => {
      seedPendingGate();

      const result = handleMergeReadinessPromptSubmit(
        tempDir,
        `${command} --override Ship under documented risk`,
        sessionId,
      );

      expect(result.handled).toBe(true);
      expect(result.message).toContain("MERGE READINESS");

      const persisted = readMergeReadinessState(tempDir, sessionId);
      expect(persisted?.active).toBe(false);
      expect(persisted?.result).toBe("overridden");
      expect(persisted?.override_reason).toBe("Ship under documented risk");
      expect(persisted?.override_owner).toBe("github:trusted-maintainer");
    });
  });

  it("negative control: --override without a reason is not handled and leaves the gate armed", () => {
    seedPendingGate();

    const result = handleMergeReadinessPromptSubmit(
      tempDir,
      "/omq:merge-readiness --override",
      sessionId,
    );

    expect(result.handled).toBe(false);
    const persisted = readMergeReadinessState(tempDir, sessionId);
    expect(persisted?.active).toBe(true);
    expect(persisted?.result).toBe("pending");
  });

  it("negative control: a mistyped command word does not reach the override", () => {
    seedPendingGate();

    const result = handleMergeReadinessPromptSubmit(
      tempDir,
      "/omq:merge-readinss --override not a merge-readiness command",
      sessionId,
    );

    expect(result.handled).toBe(false);
    const persisted = readMergeReadinessState(tempDir, sessionId);
    expect(persisted?.active).toBe(true);
    expect(persisted?.result).toBe("pending");
  });

  it("negative control: an ordinary prompt is never an override", () => {
    seedPendingGate();

    const result = handleMergeReadinessPromptSubmit(
      tempDir,
      "please explain why the gate exists",
      sessionId,
    );

    expect(result.handled).toBe(false);
    const persisted = readMergeReadinessState(tempDir, sessionId);
    expect(persisted?.active).toBe(true);
    expect(persisted?.result).toBe("pending");
  });
});
