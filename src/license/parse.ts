// 依赖清单解析层：把文本 / package.json / license-checker JSON / CSV 等输入
// 归一为 DependencyEntry[]。不包含风险判定与界面逻辑。

import type { DependencyEntry } from './rules';

let seq = 0;
export function nextId(): string {
  seq += 1;
  return `${Date.now().toString(36)}-${seq}`;
}

function cleanVersion(raw: string): string {
  const value = raw.trim().replace(/^[\^~>=<\s]+/, '');
  if (!value || value === '*' || value === 'x') return '—';
  return value;
}

/** 解析带 @ 版本的包名，正确处理 @scope/name@version 形式。 */
function splitNameVersion(token: string): { name: string; version: string } {
  if (token.startsWith('@')) {
    const at = token.indexOf('@', 1);
    if (at > 1) return { name: token.slice(0, at), version: token.slice(at + 1) };
    return { name: token, version: '—' };
  }
  const at = token.indexOf('@');
  if (at > 0) return { name: token.slice(0, at), version: token.slice(at + 1) };
  return { name: token, version: '—' };
}

/** 解析纯文本行，兼容 `name@version LICENSE`、`name,version,license`、制表符分隔等。 */
function parseLine(line: string): DependencyEntry | null {
  let text = line.trim();
  if (!text || text.startsWith('#') || text.startsWith('//')) return null;
  // 跳过 CSV / license-checker 表格表头
  if (/^(name|package name)\s*[,\t].*(version).*(license)/i.test(text)) return null;

  let name = '';
  let version = '—';
  let license = '';

  // 形如 name,version,license 或 name<TAB>version<TAB>license
  const parts = text.split(/\s*[,\t]\s*/);
  if (parts.length >= 2) {
    name = parts[0];
    if (parts.length >= 3 && /^[\w~^]|^[0-9]/.test(parts[1])) {
      version = cleanVersion(parts[1]);
      license = parts.slice(2).join(' ');
    } else {
      license = parts.slice(1).join(' ');
    }
  } else {
    // 许可证与包信息之间至少用空格分隔；包名中除 scope 外不含空格
    const words = text.split(/\s+/);
    const { name: parsedName, version: parsedVersion } = splitNameVersion(words[0]);
    name = parsedName;
    version = parsedVersion === '—' ? '—' : cleanVersion(parsedVersion);
    license = words.slice(1).join(' ');
  }

  if (!name) return null;
  return { id: nextId(), name, version, license: license.trim() };
}

function isPlainStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/** 从单个依赖对象提取名称、版本、许可证。 */
function fromObject(obj: Record<string, unknown>, fallbackName?: string): DependencyEntry | null {
  const name =
    typeof obj.name === 'string' ? obj.name
    : typeof obj.packageName === 'string' ? obj.packageName
    : fallbackName;
  if (!name) return null;

  const version =
    typeof obj.version === 'string' ? cleanVersion(obj.version)
    : typeof obj.installedVersion === 'string' ? cleanVersion(obj.installedVersion)
    : '—';

  let license = '';
  const lic = obj.licenses ?? obj.license;
  if (typeof lic === 'string') {
    license = lic;
  } else if (Array.isArray(lic)) {
    license = lic.map(item => (typeof item === 'string' ? item : (item as Record<string, unknown>)?.type)).filter(Boolean).join(' OR ');
  } else if (lic && typeof lic === 'object') {
    license = String((lic as Record<string, unknown>).type ?? '');
  }

  return { id: nextId(), name, version, license };
}

/** 去掉 JSON 中的 // 与 /* 注释，兼容 .npmrc 风格的非严格 JSON（package-lock v1）。 */
function stripJsonComments(text: string): string {
  return text
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function tryParseJson(text: string): DependencyEntry[] | null {
  let data: unknown;
  try {
    data = JSON.parse(stripJsonComments(text));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return [];
  if (isPlainStringArray(data)) {
    return data
      .map(item => parseLine(item))
      .filter((entry): entry is DependencyEntry => entry !== null);
  }

  const out: DependencyEntry[] = [];
  const record = data as Record<string, unknown>;

  // package-lock v2/v3：{"packages": {"node_modules/react": {"version": "...", "license": "..."}}}
  const packages = record.packages;
  if (packages && typeof packages === 'object') {
    for (const [path, spec] of Object.entries(packages as Record<string, unknown>)) {
      const match = path.match(/(?:^|node_modules\/)(@[^/]+\/[^/]+|[^/]+)$/);
      if (match && spec && typeof spec === 'object') {
        const entry = fromObject(spec as Record<string, unknown>, match[1]);
        if (entry) out.push(entry);
      }
    }
  }

  // license-checker 风格：键恒为 "name@version"（含 scoped 包 "@scope/name@version"）
  const isCheckerKey = (key: string): boolean =>
    key.startsWith('@') ? key.indexOf('@', 1) > 1 : key.includes('@');
  if (out.length === 0) {
    for (const [key, value] of Object.entries(record)) {
      if (!isCheckerKey(key) || !value || typeof value !== 'object' || Array.isArray(value)) continue;
      const { name: keyName, version: keyVersion } = splitNameVersion(key);
      const entry = fromObject(value as Record<string, unknown>, keyName);
      if (entry && keyVersion !== '—') {
        entry.name = keyName;
        entry.version = cleanVersion(keyVersion);
        out.push(entry);
      }
    }
  }

  // package.json：dependencies / devDependencies / peerDependencies
  for (const group of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const section = record[group];
    if (section && typeof section === 'object') {
      for (const [name, spec] of Object.entries(section as Record<string, unknown>)) {
        if (typeof spec === 'string') {
          out.push({ id: nextId(), name, version: cleanVersion(spec), license: '' });
        } else if (spec && typeof spec === 'object') {
          const entry = fromObject(spec as Record<string, unknown>, name);
          if (entry) out.push(entry);
        }
      }
    }
  }

  // 单个包描述对象：{"name": "...", "version": "...", "license": "..."}
  if (out.length === 0 && typeof record.name === 'string' && typeof record.version === 'string') {
    const entry = fromObject(record);
    if (entry) out.push(entry);
  }

  return out;
}

/** 同名同版本去重：优先保留带有许可证信息的条目。 */
function dedupe(entries: DependencyEntry[]): DependencyEntry[] {
  const map = new Map<string, DependencyEntry>();
  for (const entry of entries) {
    const key = `${entry.name}@${entry.version}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, entry);
    } else if (!existing.license && entry.license) {
      existing.license = entry.license;
    }
  }
  return [...map.values()];
}

export interface ParseResult {
  entries: DependencyEntry[];
  /** 实际跳过的空行/注释行数之外，无法解析的内容 */
  format: 'json' | 'text';
}

export function parseManifest(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const entries = tryParseJson(trimmed);
    if (entries !== null) return { entries: dedupe(entries), format: 'json' };
  }
  const entries = raw
    .split(/\r?\n|,(?=\s*[^\s@,]+@)/)
    .map(line => parseLine(line))
    .filter((entry): entry is DependencyEntry => entry !== null);
  return { entries: dedupe(entries), format: 'text' };
}
