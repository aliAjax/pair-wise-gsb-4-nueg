import { AlertTriangle, CheckCircle2, FileSearch, HelpCircle, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LicenseFinding, RiskLevel } from '../license/rules';
import { LICENSE_OPTIONS, RISK_LABELS } from '../license/rules';
import { DISTRIBUTION_LABEL } from '../license/report';
import type { Distribution } from '../license/rules';

type Filter = 'all' | RiskLevel;

interface ResultsPanelProps {
  findings: LicenseFinding[];
  distribution: Distribution;
  filter: Filter;
  query: string;
  selectedId: string | null;
  onFilterChange: (filter: Filter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  onSupplement: (id: string, license: string) => void;
}

const BADGE_CLASS: Record<RiskLevel, string> = {
  pass: 'ok',
  review: 'review',
  risk: 'risk',
  unknown: 'unknown',
};

const RISK_ICON: Record<RiskLevel, typeof CheckCircle2> = {
  pass: ShieldCheck,
  review: HelpCircle,
  risk: ShieldAlert,
  unknown: AlertTriangle,
};

export default function ResultsPanel(props: ResultsPanelProps) {
  const {
    findings, distribution, filter, query, selectedId,
    onFilterChange, onQueryChange, onSelect, onSupplement,
  } = props;

  const counts: Record<RiskLevel, number> = { pass: 0, review: 0, risk: 0, unknown: 0 };
  for (const f of findings) counts[f.risk] += 1;

  // 新增、筛选、导出共用同一份 findings；这里仅收窄展示范围，不改动分析结果。
  const visible = findings.filter(
    f => (filter === 'all' || f.risk === filter)
      && (f.name.toLowerCase().includes(query.toLowerCase())
        || f.license.toLowerCase().includes(query.toLowerCase())),
  );
  const selected = findings.find(f => f.id === selectedId) ?? null;

  const filterButtons: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: findings.length },
    { key: 'pass', label: RISK_LABELS.pass, count: counts.pass },
    { key: 'review', label: RISK_LABELS.review, count: counts.review },
    { key: 'risk', label: RISK_LABELS.risk, count: counts.risk },
    { key: 'unknown', label: RISK_LABELS.unknown, count: counts.unknown },
  ];

  return (
    <section className="panel results-panel">
      <div className="results-head">
        <h3>分析结果</h3>
        <span className="mode-pill">分发方式：{DISTRIBUTION_LABEL[distribution]}</span>
      </div>

      {findings.length === 0 ? (
        <div className="empty-state">
          <FileSearch size={30} />
          <strong>还没有分析结果</strong>
          <p>请先在左侧粘贴或上传依赖清单，点击“开始分析”；也可以直接载入示例数据。</p>
        </div>
      ) : (
        <>
          <div className="filters">
            {filterButtons.map(btn => (
              <button
                key={btn.key}
                className={filter === btn.key ? 'active' : ''}
                onClick={() => onFilterChange(btn.key)}
              >
                {btn.label}
                <span className="filter-count">{btn.count}</span>
              </button>
            ))}
            <div className="search">
              <Search size={14} />
              <input
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="搜索依赖或许可证…"
              />
            </div>
          </div>

          <div className="row head">
            <div>依赖</div>
            <div>版本</div>
            <div>许可证</div>
            <div>风险结论</div>
            <div>依据</div>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state compact">当前筛选条件下没有匹配的依赖。</div>
          ) : (
            visible.map(f => {
              const Icon = RISK_ICON[f.risk];
              return (
                <div key={f.id} className={selectedId === f.id ? 'row selected' : 'row'}>
                  <div className="pkg">
                    <div className={`pkgicon ${f.risk}`}><Icon size={14} /></div>
                    <b>{f.name}</b>
                  </div>
                  <div className="version">{f.version}</div>
                  <div className="license">{f.family}{f.license && f.family !== f.license && <small>{f.license}</small>}</div>
                  <div><span className={`badge ${BADGE_CLASS[f.risk]}`}>{RISK_LABELS[f.risk]}</span></div>
                  <button className="inspect" onClick={() => onSelect(f.id)}>
                    {selectedId === f.id ? '收起依据' : '查看依据'}
                  </button>
                </div>
              );
            })
          )}

          {selected && (
            <div className="details">
              <div className="details-head">
                <h4>{selected.name} · {selected.version}</h4>
                <span className={`badge ${BADGE_CLASS[selected.risk]}`}>{RISK_LABELS[selected.risk]}</span>
              </div>
              <dl>
                <dt>识别许可证</dt>
                <dd>{selected.license || '（未填写 / 未识别）'} → 归一化为 <code>{selected.family}</code></dd>
                <dt>依据说明</dt>
                <dd>{selected.basis}</dd>
                <dt>判定理由</dt>
                <dd>{selected.reason}（按{DISTRIBUTION_LABEL[distribution]}判定）</dd>
              </dl>
              {selected.needsSupplement && (
                <div className="supplement">
                  <AlertTriangle size={14} />
                  <span>许可证未知，需要补录后才能给出结论：</span>
                  <select
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) onSupplement(selected.id, e.target.value);
                    }}
                  >
                    <option value="" disabled>选择标准许可证…</option>
                    {LICENSE_OPTIONS.map(lic => <option key={lic} value={lic}>{lic}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
