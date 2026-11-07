// Downloads the pinned upstream files into data/raw/ and checks their sha256.
//   node pipeline/fetch.ts           use the commits in data/sources.lock.json
//   node pipeline/fetch.ts --update  resolve the latest commits and rewrite the lock
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LOCK_PATH, SOURCES, rawFilePath, readLock, type Lock, type LockEntry, type SourceName } from "./sources.ts";

const USER_AGENT = "pogo-stat-translation-pipeline";

function sha256(buf: Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function githubJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function latestCommit(repo: string, branch: string): Promise<string> {
  const body = (await githubJson(`https://api.github.com/repos/${repo}/commits/${branch}`)) as { sha?: string };
  if (!body.sha) throw new Error(`No commit sha returned for ${repo}@${branch}`);
  return body.sha;
}

async function download(repo: string, commit: string, upstreamPath: string): Promise<Uint8Array> {
  const url = `https://raw.githubusercontent.com/${repo}/${commit}/${upstreamPath}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function syncSource(name: SourceName, commit: string, expected?: Record<string, string>): Promise<LockEntry> {
  const spec = SOURCES[name];
  const files: Record<string, string> = {};
  for (const upstream of spec.files) {
    const target = rawFilePath(name, commit, upstream);
    const want = expected?.[upstream];
    if (expected && !want) {
      throw new Error(`${name}: ${upstream} is missing from sources.lock.json. Run "npm run fetch:update".`);
    }
    if (want && existsSync(target) && sha256(readFileSync(target)) === want) {
      files[upstream] = want;
      continue;
    }
    const buf = await download(spec.repo, commit, upstream);
    const got = sha256(buf);
    if (want && got !== want) {
      throw new Error(`${name}: sha256 mismatch for ${upstream} at ${commit}\n  expected ${want}\n  got      ${got}`);
    }
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, buf);
    files[upstream] = got;
    console.log(`  downloaded ${name}/${path.basename(upstream)} (${buf.length.toLocaleString("en")} bytes)`);
  }
  return { repo: spec.repo, commit, files };
}

async function main(): Promise<void> {
  const update = process.argv.includes("--update");
  const names = Object.keys(SOURCES) as SourceName[];

  if (update) {
    const lock = {} as Lock;
    for (const name of names) {
      const spec = SOURCES[name];
      const commit = await latestCommit(spec.repo, spec.branch);
      console.log(`${name}: ${spec.repo}@${commit}`);
      lock[name] = await syncSource(name, commit);
    }
    writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
    console.log(`Wrote ${path.relative(process.cwd(), LOCK_PATH)}`);
    return;
  }

  if (!existsSync(LOCK_PATH)) {
    throw new Error('data/sources.lock.json does not exist. Run "npm run fetch:update" first.');
  }
  const lock = readLock();
  for (const name of names) {
    const entry = lock[name];
    if (!entry) throw new Error(`sources.lock.json has no entry for ${name}`);
    console.log(`${name}: ${entry.repo}@${entry.commit}`);
    await syncSource(name, entry.commit, entry.files);
  }
  console.log("All pinned files present and verified.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
