import { normalizeLicense } from './catalog';
import type { Dependency } from './types';

// 清单解析：把用户粘贴 / 上传的内容转换为统一的依赖记录。
// 支持：
//   1. package.json（dependencies / devDependencies / peerDependencies / optionalDependencies）
//   2. CSV：名称,版本,许可证（首行表头自动跳过）
//   3. 每行一条：名称@版本 许可证（许可证可省略，省略后标记为待补录）

function makeId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `dep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
}

function cleanVersion(v: string): string {
  return v.trim().replace(/^[\^~>=<v]+/, '').trim() || '—';
}

function tryParsePackageJson(text: string): Dependency[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  const looksLikePackage =
    'dependencies' in obj ||
    'devDependencies' in obj ||
    'peerDependencies' in obj ||
    'optionalDependencies' in obj;
  if (!looksLikePackage) return null;

  const groups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
  const out: Dependency[] = [];
  for (const group of groups) {
    const block = obj[group];
    if (!block || typeof block !== 'object') continue;
    for (const [name, version] of Object.entries(block as Record<string, unknown>)) {
      if (typeof version !== 'string') continue;
      out.push({ id: makeId(), name, version: cleanVersion(version), licenseId: null });
    }
  }
  return out;
}

/** 解析一行 “名称@版本 许可证” 或 “名称,版本,许可证” */
function parseLine(line: string): Omit<Dependency, 'id'> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // 优先按逗号/制表符分列（CSV）
  if (trimmed.includes(',') || trimmed.includes('\t')) {
    const [name, version, license] = trimmed.split(/[,\t]+/).map((s) => s.trim());
    if (!name) return null;
    return {
      name,
      version: cleanVersion(version || ''),
      licenseId: normalizeLicense(license),
    };
  }

  // 名称@版本 许可证；兼容 @scope/pkg@1.2.3
  const atMatch = trimmed.match(/^(@?[^\s@]+(?:\/[^\s@]+)?)@([\w.~+=-]+)\s*(.*)$/);
  if (atMatch) {
    const [, name, version, license] = atMatch;
    return { name, version: cleanVersion(version), licenseId: normalizeLicense(license) };
  }

  // 只有名称（或许可证写在第二列）
  const [name, license] = trimmed.split(/\s+/);
  return { name, version: '—', licenseId: normalizeLicense(license) };
}

const CSV_HEADER = /^(name|package|依赖|名称)/i;

/** 解析整份清单文本；package.json 无许可证信息时统一进入待补录 */
export function parseManifest(text: string): Dependency[] {
  const fromJson = tryParsePackageJson(text);
  if (fromJson) return fromJson;

  const deps: Dependency[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || CSV_HEADER.test(line)) continue;
    const parsed = parseLine(line);
    if (parsed && parsed.name) deps.push({ id: makeId(), ...parsed });
  }
  return deps;
}
