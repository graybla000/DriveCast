// Commit the server's warm cache back to server/cache-seed.json, via the GitHub
// contents API.
//
// The problem this solves: the live cache is in-memory and Render's free plan spins
// the instance down when idle, so everything warmed by real browsing is lost on the
// next cold start. If that start lands on a day whose quota is already spent, the
// app comes up with nothing to serve. The seed file survives restarts *because* it
// is in the repo — so the durable version of "share the cache" is to keep putting
// the warm cache back into the repo.
//
// Inert unless GITHUB_TOKEN is set, which means local dev and anyone forking this
// get nothing surprising: no network calls, no commits.
//
// Setup on Render: add GITHUB_TOKEN (a fine-grained token with Contents: read and
// write on this repo, nothing else). The token is never logged, and its value never
// reaches a response body.

const API = "https://api.github.com";

// Long by default. Each commit is a real repo write, and content this evergreen
// doesn't need a tighter loop; the point is to survive a restart, not to be current
// to the minute.
const DEFAULT_INTERVAL_HOURS = 6;

// Let the instance actually serve some traffic before the first commit, so a cold
// start doesn't immediately push a nearly-empty snapshot.
const FIRST_RUN_DELAY_MS = 20 * 60 * 1000;

const config = () => ({
  token: process.env.GITHUB_TOKEN,
  repo: process.env.SEED_REPO || "graybla000/DriveCast",
  branch: process.env.SEED_BRANCH || "main",
  path: process.env.SEED_PATH || "server/cache-seed.json",
  intervalHours: Number(process.env.SEED_COMMIT_INTERVAL_HOURS) || DEFAULT_INTERVAL_HOURS,
});

function gh(path, { token, ...init } = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
}

/** The committed file plus its blob sha, which the API needs to accept an update. */
async function readCommitted({ token, repo, path, branch }) {
  const res = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`, { token });
  if (res.status === 404) return { sha: null, content: {} };
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);

  const body = await res.json();
  let content = {};
  try {
    content = JSON.parse(Buffer.from(body.content ?? "", "base64").toString("utf8"));
  } catch {
    // A malformed committed file shouldn't stop us replacing it with a good one.
  }
  return { sha: body.sha ?? null, content: content && typeof content === "object" ? content : {} };
}

async function writeCommitted({ token, repo, path, branch }, { sha, merged, addedKeys }) {
  const summary =
    addedKeys.length === 1
      ? `Cache ${addedKeys.length} more query from live browsing`
      : `Cache ${addedKeys.length} more queries from live browsing`;

  const res = await gh(`/repos/${repo}/contents/${encodeURI(path)}`, {
    token,
    method: "PUT",
    body: JSON.stringify({
      message: `${summary}\n\nWritten by the running server so the warm cache survives a restart.`,
      content: Buffer.from(JSON.stringify(merged, null, 2) + "\n", "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (res.status === 409 || res.status === 422) return "conflict";
  if (!res.ok) throw new Error(`GitHub write failed (${res.status})`);
  return "written";
}

/**
 * One pass: read what's committed, add whatever this process warmed that the file
 * lacks, and write it back. Returns a short status for the log.
 *
 * Only *new* keys count as a reason to commit. Rewriting an existing query with
 * fresher results would mean a commit on every pass forever, for content that is
 * evergreen by design — noise in the history for no gain.
 */
async function runOnce(getSnapshot) {
  const cfg = config();
  const snapshot = getSnapshot();
  const keys = Object.keys(snapshot);
  if (!keys.length) return "nothing warmed yet";

  const { sha, content } = await readCommitted(cfg);
  const addedKeys = keys.filter((k) => !content[k]);
  if (!addedKeys.length) return `no new queries (${keys.length} warm, all already committed)`;

  const merged = { ...content };
  for (const k of addedKeys) merged[k] = snapshot[k];
  const ordered = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));

  const result = await writeCommitted(cfg, { sha, merged: ordered, addedKeys });
  if (result === "conflict") return "someone else updated the file; will retry next pass";
  return `committed ${addedKeys.length} new quer${addedKeys.length === 1 ? "y" : "ies"} (${Object.keys(ordered).length} total)`;
}

/**
 * Start the periodic push. Safe to call unconditionally: without a token it logs
 * once and does nothing further.
 *
 * `getSnapshot` supplies the warm cache — injected rather than imported so this
 * module has no opinion about where the cache lives, and so a test can drive it.
 */
export function startSeedPersistence(getSnapshot) {
  const { token, intervalHours, repo, path } = config();
  if (!token) {
    console.log("[seed] GITHUB_TOKEN not set — the warm cache won't be committed back (fine for local dev).");
    return () => {};
  }

  console.log(`[seed] will commit new cache entries to ${repo}:${path} every ${intervalHours}h`);

  const pass = async () => {
    try {
      console.log(`[seed] ${await runOnce(getSnapshot)}`);
    } catch (err) {
      // Never fatal: this is a durability nicety, not part of serving a request.
      // The message is deliberately the error's own — a token is never in it.
      console.warn(`[seed] skipped this pass: ${err.message}`);
    }
  };

  const first = setTimeout(pass, FIRST_RUN_DELAY_MS);
  const repeat = setInterval(pass, intervalHours * 60 * 60 * 1000);
  // Don't hold the process open on their account.
  first.unref?.();
  repeat.unref?.();

  return () => {
    clearTimeout(first);
    clearInterval(repeat);
  };
}

// Exported for the smoke test in scripts/, which drives a single pass without
// waiting out the timer.
export { runOnce as runSeedPersistenceOnce };
