import { useEffect, useMemo, useState } from 'react';
import { Download, Globe, Lock, Scale, RotateCcw } from 'lucide-react';
import ImportPanel from './components/ImportPanel';
import ResultsPanel from './components/ResultsPanel';
import {
  analyzeLicenses,
  type DependencyEntry,
  type Distribution,
  type LicenseFinding,
  type RiskLevel,
} from './license/rules';
import { nextId, parseManifest } from './license/parse';
import { buildMarkdownReport, DISTRIBUTION_LABEL } from './license/report';

type StatusTone = 'info' | 'warn' | 'ok';
type Filter = 'all' | RiskLevel;

const SAMPLE = [
  'react@18.3.1 MIT',
  'lodash@4.17.21 MIT',
  'sharp@0.33.4 Apache-2.0',
  'some-proprietary@1.0.0 Proprietary',
  'legacy-gpl@2.4.0 GPL-3.0',
  'net-service@5.1.0 AGPL-3.0',
  'linked-codec@1.8.2 LGPL-2.1-only',
  'axios@1.7.2 MIT',
  'zod@3.23.8 MIT',
  'mystery-lib@0.9.0',
].join('\n');

const STORAGE_KEY = 'license-lens:v1';

function loadStored(): { entries: DependencyEntry[]; distribution: Distribution } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { entries?: unknown; distribution?: unknown };
    if (!Array.isArray(data.entries)) return null;
    const entries: DependencyEntry[] = data.entries
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(item => ({
        id: String(item.id ?? nextId()),
        name: String(item.name ?? ''),
        version: String(item.version ?? '—'),
        license: String(item.license ?? ''),
      }))
      .filter(item => item.name);
    return {
      entries,
      distribution: data.distribution === 'open' ? 'open' : 'closed',
    };
  } catch {
    return null;
  }
}

export default function App() {
  // 新增、筛选、导出共用的唯一结果来源：findings 由 entries + 分发方式统一推导。
  const stored = useMemo(loadStored, []);
  const [entries, setEntries] = useState<DependencyEntry[]>(stored?.entries ?? []);
  const [distribution, setDistribution] = useState<Distribution>(stored?.distribution ?? 'closed');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('info');
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const findings: LicenseFinding[] = useMemo(
    () => analyzeLicenses(entries, distribution),
    [entries, distribution],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, distribution }));
  }, [entries, distribution]);

  const flash = (message: string, tone: StatusTone = 'info') => {
    setStatus(message);
    setStatusTone(tone);
  };

  const runAnalysis = (text: string): boolean => {
    if (!text.trim()) {
      setEntries([]);
      flash('清单为空：请先粘贴或上传依赖清单，也可点击“载入示例”。', 'warn');
      return false;
    }
    const { entries: parsed, format } = parseManifest(text);
    if (parsed.length === 0) {
      flash('未能从清单中解析出任何依赖，请检查格式（名称@版本 许可证）。', 'warn');
      return false;
    }
    setEntries(parsed);
    setSelectedId(null);
    setFilter('all');
    const unknown = parsed.filter(e => !e.license).length;
    const note = format === 'json' ? '（JSON 清单）' : '';
    flash(
      `分析完成${note}：共 ${parsed.length} 条依赖${unknown ? `，其中 ${unknown} 条缺少许可证、需补录` : ''}。`,
      unknown ? 'warn' : 'ok',
    );
    return true;
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    // 保留轻微延迟以反馈分析动作；解析本身是同步的纯计算。
    window.setTimeout(() => {
      runAnalysis(input);
      setAnalyzing(false);
    }, 180);
  };

  const handleFileContent = (content: string, fileName: string) => {
    setInput(content);
    if (runAnalysis(content)) flash(`已导入并分析「${fileName}」。`, 'ok');
  };

  const handleLoadSample = () => {
    setInput(SAMPLE);
    runAnalysis(SAMPLE);
  };

  const handleAdd = (name: string, version: string, license: string) => {
    const key = `${name}@${version}`;
    const existing = entries.find(e => `${e.name}@${e.version}` === key);
    if (existing) {
      setEntries(list => list.map(e => (e.id === existing.id ? { ...e, license } : e)));
      flash(`已更新 ${name}@${version} 的许可证为 ${license}。`, 'ok');
    } else {
      setEntries(list => [...list, { id: nextId(), name, version, license }]);
      flash(`已新增 ${name}@${version}（${license}）并并入分析结果。`, 'ok');
    }
    setSelectedId(null);
  };

  const handleSupplement = (id: string, license: string) => {
    setEntries(list => list.map(e => (e.id === id ? { ...e, license } : e)));
    const target = entries.find(e => e.id === id);
    if (target) flash(`已为 ${target.name} 补录许可证 ${license}，风险结论已重新判定。`, 'ok');
  };

  const handleReset = () => {
    setEntries([]);
    setInput('');
    setSelectedId(null);
    setFilter('all');
    setQuery('');
    flash('已清空当前结果，请重新加载依赖清单。', 'info');
  };

  const handleExport = () => {
    if (findings.length === 0) {
      flash('清单为空，没有可导出的结果：请先加载依赖并完成分析。', 'warn');
      return;
    }
    const markdown = buildMarkdownReport(findings, { distribution, generatedAt: new Date() });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `license-report-${distribution}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    flash(`已导出 Markdown 报告（${findings.length} 条依赖，${DISTRIBUTION_LABEL[distribution]}）。`, 'ok');
  };

  const counts: Record<RiskLevel, number> = { pass: 0, review: 0, risk: 0, unknown: 0 };
  for (const f of findings) counts[f.risk] += 1;

  const metrics: { label: string; value: number; tone: RiskLevel | 'total' }[] = [
    { label: '已分析依赖', value: findings.length, tone: 'total' },
    { label: '兼容放行', value: counts.pass, tone: 'pass' },
    { label: '提醒复核', value: counts.review, tone: 'review' },
    { label: '高风险', value: counts.risk, tone: 'risk' },
    { label: '待补录', value: counts.unknown, tone: 'unknown' },
  ];

  return (
    <main className="app">
      <header className="top">
        <div className="brand">
          <div className="logo"><Scale size={20} /></div>
          <div>
            <h1>License Lens</h1>
            <small>依赖许可证兼容性分析 · 按开源 / 闭源分发判定风险</small>
          </div>
        </div>
        <div className="top-actions">
          <div className="mode-switch" role="group" aria-label="分发方式">
            <button
              className={distribution === 'open' ? 'active' : ''}
              onClick={() => setDistribution('open')}
              title="项目以开源方式分发"
            >
              <Globe size={14} />
              开源分发
            </button>
            <button
              className={distribution === 'closed' ? 'active' : ''}
              onClick={() => setDistribution('closed')}
              title="产品以闭源 / 专有方式分发"
            >
              <Lock size={14} />
              闭源分发
            </button>
          </div>
          <button className="ghost" onClick={handleReset} title="清空当前结果">
            <RotateCcw size={15} />
            重置
          </button>
          <button className="primary" onClick={handleExport}>
            <Download size={15} />
            导出 Markdown
          </button>
        </div>
      </header>

      <section className="summary">
        {metrics.map(metric => (
          <div key={metric.label} className="metric">
            <small>{metric.label}</small>
            <b className={metric.tone === 'total' ? '' : metric.tone}>{metric.value}</b>
          </div>
        ))}
      </section>

      <section className="grid">
        <ImportPanel
          input={input}
          status={status}
          statusTone={statusTone}
          analyzing={analyzing}
          hasFindings={findings.length > 0}
          onInputChange={setInput}
          onAnalyze={handleAnalyze}
          onLoadSample={handleLoadSample}
          onFileContent={handleFileContent}
          onAdd={handleAdd}
        />
        <ResultsPanel
          findings={findings}
          distribution={distribution}
          filter={filter}
          query={query}
          selectedId={selectedId}
          onFilterChange={setFilter}
          onQueryChange={setQuery}
          onSelect={id => setSelectedId(current => (current === id ? null : id))}
          onSupplement={handleSupplement}
        />
      </section>
    </main>
  );
}
