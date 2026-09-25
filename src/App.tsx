import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  FileDown,
  FileUp,
  Package,
  PackagePlus,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { SELECTABLE_LICENSES, FAMILY_LABEL } from './license/catalog';
import { analyzeAll } from './license/analyze';
import { parseManifest } from './license/parse';
import { buildReport, downloadReport, DISTRIBUTION_LABEL, RISK_LABEL } from './license/report';
import type { Dependency, Distribution, RiskLevel } from './license/types';

type FilterKey = 'all' | RiskLevel;
type Tone = 'ok' | 'warn' | 'err';

const STORAGE_KEY = 'license-lens-deps';
const DIST_KEY = 'license-lens-distribution';

const SEED = [
  'react@18.3.1 MIT',
  'lodash@4.17.21 MIT',
  'sharp@0.33.4 Apache-2.0',
  'axios@1.7.2 MIT',
  'zod@3.23.8 MIT',
  'legacy-gpl@2.4.0 GPL-3.0',
  'font-awesome@6.5.2 CC-BY-4.0',
  'some-proprietary@1.0.0 Proprietary',
  'internal-sdk@0.2.0',
].join('\n');

function loadStoredDeps(): Dependency[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (d): d is Dependency =>
        d && typeof d.id === 'string' && typeof d.name === 'string' && typeof d.version === 'string',
    );
  } catch {
    return [];
  }
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pass', label: RISK_LABEL.pass },
  { key: 'review', label: RISK_LABEL.review },
  { key: 'risk', label: RISK_LABEL.risk },
  { key: 'unknown', label: RISK_LABEL.unknown },
];

const BADGE_CLASS: Record<RiskLevel, string> = {
  pass: 'ok',
  review: 'review',
  risk: 'risk',
  unknown: 'missing',
};

export default function App() {
  const [deps, setDeps] = useState<Dependency[]>(loadStoredDeps);
  const [distribution, setDistribution] = useState<Distribution>(
    () => (localStorage.getItem(DIST_KEY) as Distribution) || 'closed',
  );
  const [rawText, setRawText] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: Tone; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [manualLicense, setManualLicense] = useState('MIT');
  const fileInput = useRef<HTMLInputElement>(null);

  // 新增、筛选、导出共用同一份分析结果
  const results = useMemo(() => analyzeAll(deps, distribution), [deps, distribution]);
  const counts = useMemo(
    () => ({
      all: results.length,
      pass: results.filter((r) => r.risk === 'pass').length,
      review: results.filter((r) => r.risk === 'review').length,
      risk: results.filter((r) => r.risk === 'risk').length,
      unknown: results.filter((r) => r.risk === 'unknown').length,
    }),
    [results],
  );
  const filtered = useMemo(
    () =>
      results.filter(
        (r) =>
          (filter === 'all' || r.risk === filter) &&
          (r.dep.name.toLowerCase().includes(query.toLowerCase()) ||
            r.license.id.toLowerCase().includes(query.toLowerCase())),
      ),
    [results, filter, query],
  );
  const selected = results.find((r) => r.dep.id === selectedId) ?? null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deps));
  }, [deps]);
  useEffect(() => {
    localStorage.setItem(DIST_KEY, distribution);
  }, [distribution]);

  const applyText = (text: string, source: string) => {
    const parsed = parseManifest(text);
    if (parsed.length === 0) {
      setStatus({ tone: 'warn', text: '未从清单中解析出依赖，请检查格式后重试。' });
      return;
    }
    setDeps(parsed);
    setFilter('all');
    setSelectedId(null);
    setStatus({ tone: 'ok', text: `已从${source}导入 ${parsed.length} 条依赖，并按当前分发方式完成分析。` });
  };

  const handleAnalyze = () => {
    if (!rawText.trim()) {
      setStatus({ tone: 'warn', text: '清单为空：请先粘贴或上传依赖清单，或点击「加载示例」，再开始分析。' });
      return;
    }
    applyText(rawText, '输入内容');
  };

  const handleSample = () => {
    setRawText(SEED);
    applyText(SEED, '示例清单');
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setRawText(text);
      applyText(text, `文件 ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus({ tone: 'warn', text: '请先填写要添加的依赖名称。' });
      return;
    }
    const dep: Dependency = {
      id: (globalThis.crypto?.randomUUID?.() as string) || `dep-${Date.now()}`,
      name: trimmedName,
      version: version.trim() || '—',
      licenseId: manualLicense === 'Unknown' ? null : manualLicense,
    };
    setDeps((prev) => [...prev, dep]);
    setName('');
    setVersion('');
    setStatus({ tone: 'ok', text: `已添加 ${dep.name}，结论已按当前分发方式更新。` });
  };

  const handleRemove = (id: string) => {
    setDeps((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleFillLicense = (id: string, licenseId: string) => {
    setDeps((prev) =>
      prev.map((d) => (d.id === id ? { ...d, licenseId: licenseId === 'Unknown' ? null : licenseId } : d)),
    );
    setStatus({ tone: 'ok', text: '许可证已补录，风险结论已重新判定。' });
  };

  const handleExport = () => {
    if (results.length === 0) {
      setStatus({ tone: 'warn', text: '当前没有分析结果：请先导入依赖清单，再导出报告。' });
      return;
    }
    downloadReport(buildReport(results, distribution));
    setStatus(
      counts.unknown > 0
        ? {
            tone: 'warn',
            text: `Markdown 报告已导出；其中 ${counts.unknown} 条依赖许可证待补录，补录后请重新导出。`,
          }
        : { tone: 'ok', text: `Markdown 报告已导出，共 ${results.length} 条依赖。` },
    );
  };

  const summaryCards: { key: FilterKey; label: string; value: number; tone: string }[] = [
    { key: 'all', label: '已分析依赖', value: counts.all, tone: '' },
    { key: 'pass', label: '兼容通过', value: counts.pass, tone: 'good' },
    { key: 'review', label: '提醒复核', value: counts.review, tone: 'warn' },
    { key: 'risk', label: '高风险冲突', value: counts.risk, tone: 'bad' },
    { key: 'unknown', label: '待补录', value: counts.unknown, tone: 'missing' },
  ];

  return (
    <div className="ll-app">
      <header className="ll-top">
        <div className="ll-brand">
          <div className="ll-logo">
            <Scale size={19} />
          </div>
          <div>
            <h1>License Lens</h1>
            <small>依赖许可证兼容性分析</small>
          </div>
        </div>
        <div className="ll-top-actions">
          <div
            className="ll-seg"
            role="group"
            aria-label="分发方式"
            title="风险结论按分发方式判定"
          >
            {(['open', 'closed'] as Distribution[]).map((d) => (
              <button
                key={d}
                className={distribution === d ? 'active' : ''}
                onClick={() => setDistribution(d)}
              >
                {DISTRIBUTION_LABEL[d]}
              </button>
            ))}
          </div>
          <button onClick={handleSample}>
            <RotateCcw size={14} /> 加载示例
          </button>
          <button className="primary" onClick={handleExport}>
            <FileDown size={15} /> 导出 Markdown
          </button>
        </div>
      </header>

      <section className="ll-summary">
        {summaryCards.map((c) => (
          <button
            key={c.key}
            className={`ll-metric ${filter === c.key ? 'selected' : ''} ${c.tone}`}
            onClick={() => setFilter(c.key)}
          >
            <small>{c.label}</small>
            <b>{c.value}</b>
          </button>
        ))}
      </section>

      <section className="ll-grid">
        <aside className="ll-panel">
          <h3>导入依赖清单</h3>
          <textarea
            className="ll-textarea"
            spellCheck={false}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={'每行一个依赖，例如：\nreact@18.3.1 MIT\nlegacy-gpl@2.4.0 GPL-3.0\ninternal-sdk@0.2.0（不写许可证将标记待补录）\n\n也可粘贴 CSV：名称,版本,许可证，或直接导入 package.json'}
          />
          <button className="primary ll-analyze-btn" onClick={handleAnalyze}>
            <Search size={14} /> 开始分析
          </button>
          <div
            className={`ll-drop ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
          >
            <FileUp size={16} />
            <span>
              拖放 package.json 或许可证清单，或{' '}
              <label onClick={() => fileInput.current?.click()}>
                选择文件
                <input
                  ref={fileInput}
                  type="file"
                  accept=".txt,.json,.csv,.lock,package.json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readFile(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </span>
          </div>
          <p className="ll-hint">
            支持 <code>名称@版本 许可证</code>、CSV 与 package.json。MIT / Apache / BSD 直接放行；
            GPL 在开源分发时提醒复核、闭源分发为高风险；许可证缺失将标记为待补录。
          </p>

          <h3 className="ll-manual-title">
            <PackagePlus size={13} /> 手动添加依赖
          </h3>
          <div className="ll-manual">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="依赖名 *" />
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="版本（可空）"
            />
            <select value={manualLicense} onChange={(e) => setManualLicense(e.target.value)}>
              {SELECTABLE_LICENSES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
              <option value="Unknown">未识别（待补录）</option>
            </select>
            <button onClick={handleAdd}>添加</button>
          </div>

          {status && <p className={`ll-status ${status.tone}`}>{status.text}</p>}
        </aside>

        <section className="ll-panel">
          <div className="ll-result-head">
            <h3>分析结果 · {DISTRIBUTION_LABEL[distribution]}</h3>
            <div className="ll-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索依赖或许可证…"
              />
            </div>
          </div>
          <div className="ll-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? 'active' : ''}
                onClick={() => setFilter(f.key)}
              >
                {f.label} <span>{f.key === 'all' ? counts.all : counts[f.key as RiskLevel]}</span>
              </button>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="ll-empty">
              <Package size={26} />
              <p>尚未加载依赖清单，暂无分析结果。</p>
              <span>请先在左侧粘贴清单、上传文件，或直接加载示例清单。</span>
              <button className="primary" onClick={handleSample}>
                <RotateCcw size={14} /> 加载示例清单
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ll-empty ll-empty-soft">没有符合当前筛选条件的依赖。</div>
          ) : (
            <div className="ll-table">
              <div className="ll-row ll-row-head">
                <div>依赖</div>
                <div>版本</div>
                <div>许可证</div>
                <div>风险结论</div>
                <div>操作</div>
              </div>
              {filtered.map((r) => (
                <div
                  key={r.dep.id}
                  className={`ll-row ${selectedId === r.dep.id ? 'selected' : ''}`}
                >
                  <div className="ll-pkg">
                    <div className="ll-pkg-icon">{r.dep.name[0]?.toUpperCase()}</div>
                    <div className="ll-pkg-copy">
                      <b>{r.dep.name}</b>
                      <span>{FAMILY_LABEL[r.license.family]}</span>
                    </div>
                  </div>
                  <div className="ll-version">{r.dep.version}</div>
                  <div className="ll-license">
                    {r.risk === 'unknown' ? (
                      <select
                        className="ll-fill"
                        defaultValue=""
                        onChange={(e) => e.target.value && handleFillLicense(r.dep.id, e.target.value)}
                      >
                        <option value="" disabled>
                          补录许可证…
                        </option>
                        {SELECTABLE_LICENSES.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      r.license.id
                    )}
                  </div>
                  <div>
                    <span className={`ll-badge ${BADGE_CLASS[r.risk]}`}>{RISK_LABEL[r.risk]}</span>
                  </div>
                  <div className="ll-row-actions">
                    <button
                      className="ll-inspect"
                      onClick={() =>
                        setSelectedId(selectedId === r.dep.id ? null : r.dep.id)
                      }
                    >
                      <BookOpen size={13} /> 依据
                    </button>
                    <button
                      className="ll-del"
                      title="删除该依赖"
                      onClick={() => handleRemove(r.dep.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="ll-details">
              <div className="ll-details-head">
                <h4>
                  {selected.dep.name} <span>{selected.license.id}</span>
                </h4>
                <button onClick={() => setSelectedId(null)} title="关闭">
                  <X size={15} />
                </button>
              </div>
              <p className="ll-details-desc">{selected.license.description}</p>
              <div className="ll-details-grid">
                <div>
                  <small>许可证类别</small>
                  <span>{FAMILY_LABEL[selected.license.family]}</span>
                </div>
                <div>
                  <small>当前分发方式</small>
                  <span>{DISTRIBUTION_LABEL[distribution]}</span>
                </div>
                <div>
                  <small>风险结论</small>
                  <span className={`ll-badge ${BADGE_CLASS[selected.risk]}`}>
                    {RISK_LABEL[selected.risk]}
                  </span>
                </div>
              </div>
              <div className="ll-reason">
                <small>判定理由</small>
                <p>{selected.reason}</p>
              </div>
              <div className="ll-obligations">
                <small>关键条款 / 复核要点</small>
                <ul>
                  {selected.license.obligations.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
              {selected.risk === 'unknown' && (
                <div className="ll-refill">
                  <AlertTriangle size={14} />
                  <span>请补录该依赖的许可证：</span>
                  <select
                    defaultValue=""
                    onChange={(e) =>
                      e.target.value && handleFillLicense(selected.dep.id, e.target.value)
                    }
                  >
                    <option value="" disabled>
                      选择许可证…
                    </option>
                    {SELECTABLE_LICENSES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="ll-notice">
            <ShieldAlert size={15} />
            <div>
              {distribution === 'closed' ? (
                <b>闭源分发：</b>
              ) : (
                <b>开源分发：</b>
              )}
              {distribution === 'closed'
                ? 'GPL / AGPL 等强 copyleft 组件要求衍生作品整体开源，与闭源分发冲突，已标记高风险；LGPL / MPL 需复核链接方式。'
                : 'GPL / AGPL 组件仅在作品以相同许可证开源、并履行源码义务时才可分发，已标记提醒复核。'}
              专有组件与未知许可证请在发布前完成授权确认或补录，所有结论需由法务最终复核。
            </div>
            <ShieldCheck size={15} className="ll-notice-ok" />
          </div>
        </section>
      </section>
    </div>
  );
}
