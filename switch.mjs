#!/usr/bin/env node
// Branch switcher for live-coding lessons. Every checkpoint (V0, V1, ...) is
// its own branch, created ahead of time in the template repo, so a student's
// work on a checkpoint lives on that checkpoint's branch and can be picked
// back up any time by switching to it again.
//
// Usage (from anywhere in the repo):
//   node switch.mjs V1
//
// What it does, in order:
//   0. Checks that the named branch exists (locally, or on origin — a plain
//      `git checkout` creates the local tracking branch from origin the first
//      time). Unknown name: lists what's available and stops, nothing touched.
//   1. If HEAD isn't on a branch (detached — e.g. a student went looking at
//      old history with `git checkout <sha>`), says so and asks before
//      leaving. Uncommitted edits made there can't be saved to a branch by
//      this script, so if there are any it stops and says how to keep them.
//   2. If the current branch has uncommitted changes or commits that haven't
//      been pushed, shows them and asks before saving: add everything,
//      commit, push. Answering no stops — nothing committed, nothing
//      switched. A failed push (offline?) is only a warning: the work is
//      committed locally, so switching away from it is safe.
//   3. Switches to the branch. No commit is made for the switch itself — the
//      branch already holds the checkpoint, so only real work gets commits.
//   4. If client/package.json or server/package.json differs between the two
//      branches, prints a note to run `npm install` in that folder yourself
//      (node_modules/ is untracked and shared by every branch, so it doesn't
//      change on a switch).
//
// Uses .mjs (not .js) on purpose: there is no package.json at the repo root
// (only in client/ and server/), so nothing here says "type": "module".

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const REMOTE = "origin";

// Run everything from the repo root so status/add cover the whole repo, no
// matter where the script was invoked from.
const dir = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: scriptDir,
})
  .toString()
  .trim();

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  return execFileSync(cmd, args, { cwd: dir, stdio: "inherit" });
}

function runCapture(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: dir,
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();
}

// True if the git command exits 0, false otherwise.
function succeeds(args) {
  try {
    runCapture("git", args);
    return true;
  } catch {
    return false;
  }
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

// null when HEAD is detached (not on a branch).
function currentBranch() {
  try {
    return runCapture("git", ["symbolic-ref", "-q", "--short", "HEAD"]).trim();
  } catch {
    return null;
  }
}

// Local branches plus origin's, deduplicated (origin/HEAD left out).
function listBranches() {
  const local = runCapture("git", [
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
  ]);
  const remote = runCapture("git", [
    "for-each-ref",
    "--format=%(refname:lstrip=3)",
    `refs/remotes/${REMOTE}`,
  ]);
  const names = `${local}\n${remote}`
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && s !== "HEAD");
  return [...new Set(names)].sort();
}

// The ref to compare against for the branch: the local one if it exists yet,
// otherwise origin's (what `git checkout` will create it from).
function refFor(branch) {
  return succeeds(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])
    ? `refs/heads/${branch}`
    : `refs/remotes/${REMOTE}/${branch}`;
}

// Commits on HEAD that its upstream doesn't have. 0 if there's no upstream.
function unpushedCount() {
  try {
    return Number(runCapture("git", ["rev-list", "--count", "@{u}..HEAD"]).trim());
  } catch {
    return 0;
  }
}

async function main() {
  const requested = process.argv[2];
  const branches = listBranches();

  if (!requested) {
    console.error(`Usage: node switch.mjs <branch>`);
    console.error(`Available: ${branches.join(", ")}`);
    process.exit(1);
  }

  // 0. The branch has to exist before anything else happens. Accept "v1"
  // for "V1".
  const target = branches.find(
    (b) => b.toLowerCase() === requested.toLowerCase(),
  );
  if (!target) {
    console.error(`✗ No branch "${requested}"`);
    console.error(`Available: ${branches.join(", ")}`);
    process.exit(1);
  }

  const from = currentBranch();
  if (from === target) {
    console.log(`Already on ${target}.`);
    return;
  }

  const status = runCapture("git", ["status", "--porcelain"]);

  // 1. Detached HEAD: nothing here belongs to a branch, so there's nothing
  // this script can safely commit.
  if (from === null) {
    console.log(
      `⚠ You're not on a branch right now (detached HEAD) — probably from looking at old history.`,
    );
    if (status.trim()) {
      console.log("You have uncommitted changes here:");
      console.log(status);
      console.log(
        `They aren't on any branch, so this won't save them. To keep them, put them on a new branch first:`,
      );
      console.log(`  git checkout -b my-rescued-work`);
      console.log(`  git add -A`);
      console.log(`  git commit -m "rescued work"`);
      console.log(`Then run this again.`);
      process.exit(1);
    }
    const ok = await confirm(`Leave this old version and switch to ${target}?`);
    if (!ok) {
      console.log("Stopped — nothing changed.");
      process.exit(1);
    }
  } else {
    // 2. Save work on the current branch: commit anything uncommitted, push
    // anything unpushed. One prompt covers both.
    const dirty = Boolean(status.trim());
    const unpushed = unpushedCount();

    if (dirty || unpushed) {
      if (dirty) {
        console.log(`You have uncommitted work on ${from}:`);
        console.log(status);
      }
      if (unpushed) {
        console.log(`${unpushed} commit(s) on ${from} haven't been pushed yet.`);
      }
      const ok = await confirm(
        dirty
          ? `Commit and push this on ${from}, then switch to ${target}?`
          : `Push ${from}, then switch to ${target}?`,
      );
      if (!ok) {
        console.log("Stopped — nothing changed. Your work is still here.");
        process.exit(1);
      }
      if (dirty) {
        run("git", ["add", "-A"]);
        run("git", ["commit", "-m", `work on ${from}`]);
      }
      try {
        run("git", ["push", "-u", REMOTE, from]);
      } catch {
        console.log(
          `⚠ Push failed (offline?) — your work is committed locally, continuing. Run "git push" later.`,
        );
      }
    } else {
      console.log(`(no changes to save on ${from})`);
    }
  }

  // Compare before switching, while both refs are easy to name.
  const pkgChanged = ["client", "server"].filter(
    (dir) => !succeeds(["diff", "--quiet", "HEAD", refFor(target), "--", `${dir}/package.json`]),
  );

  // 3. Switch. Creates the local tracking branch from origin on first visit.
  run("git", ["checkout", target]);

  console.log(`✓ Switched to ${target}`);

  // 4.
  for (const dir of pkgChanged) {
    console.log();
    console.log(`${dir}/package.json has changed — run npm install in ${dir}/ to update packages.`);
  }
}

main().catch((err) => {
  // A git command failed; its own error output has already been shown.
  console.error(`✗ Stopped: ${err.message.split("\n")[0]}`);
  process.exit(1);
});
