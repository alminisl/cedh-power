// Sequential Reviewer — implement-then-review loop
//
// This template drives a two-phase workflow per issue:
//   Phase 1 (Implement): A sonnet agent picks an open GitHub issue, works on it
//                        on a dedicated branch, commits the changes, and signals
//                        completion.
//   Phase 2 (Review):    A second sonnet agent reviews the branch diff and either
//                        approves it or makes corrections directly on the branch.
//
// The outer loop repeats up to MAX_ITERATIONS times, processing one issue per
// iteration. This is a middle-complexity option between the simple-loop (no review
// gate) and the parallel-planner (concurrent execution with a planning phase).
//
// Usage:
//   npx tsx .sandcastle/main.ts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.ts" }

import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// ---------------------------------------------------------------------------
// Claude subscription credentials
//
// macOS Claude Code stores OAuth in the Keychain, which Linux Claude Code in
// the container can't read. Instead, the container has its own ~/.claude
// directory persisted to .sandcastle/claude-home on the host. Run a one-time
// interactive `claude /login` inside a container with this directory mounted
// (see error message below) to populate credentials.json.
// ---------------------------------------------------------------------------

const claudeHomePath = resolve(import.meta.dirname, "claude-home");
mkdirSync(claudeHomePath, { recursive: true });

if (!existsSync(resolve(claudeHomePath, ".credentials.json"))) {
  console.error(
    `\nNo credentials found at ${claudeHomePath}/.credentials.json.\n` +
      `Run a one-time interactive login inside the container:\n\n` +
      `  docker run -it --rm --user $(id -u):$(id -g) -e HOME=/home/agent \\\n` +
      `    -v "${claudeHomePath}:/home/agent/.claude" \\\n` +
      `    --entrypoint /home/agent/.local/bin/claude \\\n` +
      `    sandcastle:cedh-power\n\n` +
      `Then type /login inside the Claude session, complete the OAuth flow,\n` +
      `exit, and re-run npm run sandcastle.\n`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of implement→review cycles to run before stopping.
// Each cycle works on one issue. Raise this to process more issues per run.
const MAX_ITERATIONS = 10;

// Hooks run inside the sandbox before the agent starts each iteration.
// npm install ensures the sandbox always has fresh dependencies.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install" }] },
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full npm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
const copyToWorktree = ["node_modules"];

// Mount the host claude-home directory into the container's ~/.claude so
// Claude Code authenticates as the subscription user. Mounting the whole
// directory lets in-container token refreshes persist back to the host.
const credentialsMount = {
  hostPath: claudeHomePath,
  sandboxPath: "/home/agent/.claude",
};

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // Implementer commits to this named branch. Using a fresh branch (rather
  // than `merge-to-head`) keeps the changes off master so the reviewer can
  // create its own worktree on the same branch — `merge-to-head` would land
  // commits on master and delete the temp branch, leaving the reviewer with
  // nothing distinct to check out and triggering a worktree collision.
  const featureBranch = `sandcastle/iteration-${Date.now()}`;

  // -------------------------------------------------------------------------
  // Phase 1: Implement
  // -------------------------------------------------------------------------
  const implement = await sandcastle.run({
    hooks,
    copyToWorktree,
    sandbox: docker({ mounts: [credentialsMount] }),
    branchStrategy: { type: "branch", branch: featureBranch },
    name: "implementer",
    maxIterations: 100,
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/implement-prompt.md",
  });

  if (!implement.commits.length) {
    console.log("Implementation agent made no commits. Skipping review.");
    continue;
  }

  console.log(`\nImplementation complete on branch: ${featureBranch}`);
  console.log(`Commits: ${implement.commits.length}`);

  // -------------------------------------------------------------------------
  // Phase 2: Review
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks,
    copyToWorktree,
    sandbox: docker({ mounts: [credentialsMount] }),
    branchStrategy: { type: "branch", branch: featureBranch },
    name: "reviewer",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/review-prompt.md",
    promptArgs: {
      BRANCH: featureBranch,
    },
  });

  console.log("\nReview complete.");
  console.log(
    `\nBranch ready for merge: ${featureBranch}\n` +
      `To merge into master:\n` +
      `  git merge --no-ff ${featureBranch} && git branch -d ${featureBranch}\n`,
  );
}

console.log("\nAll done.");
