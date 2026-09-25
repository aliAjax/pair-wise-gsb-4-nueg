import { useRef, useState } from 'react';
import { FileUp, FolderOpen, Loader2, Play, Plus, Upload } from 'lucide-react';
import { LICENSE_OPTIONS } from '../license/rules';

interface ImportPanelProps {
  input: string;
  status: string;
  statusTone: 'info' | 'warn' | 'ok';
  analyzing: boolean;
  hasFindings: boolean;
  onInputChange: (value: string) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
  onFileContent: (content: string, fileName: string) => void;
  onAdd: (name: string, version: string, license: string) => void;
}

const TONES: Record<ImportPanelProps['statusTone'], string> = {
  info: 'status',
  warn: 'status warn',
  ok: 'status ok',
};

export default function ImportPanel(props: ImportPanelProps) {
  const {
    input, status, statusTone, analyzing, hasFindings,
    onInputChange, onAnalyze, onLoadSample, onFileContent, onAdd,
  } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualVersion, setManualVersion] = useState('');
  const [manualLicense, setManualLicense] = useState('MIT');

  const readFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFileContent(String(reader.result ?? ''), file.name);
    reader.readAsText(file);
  };

  const submitManual = () => {
    const name = manualName.trim();
    if (!name) return;
    onAdd(name, manualVersion.trim() || '1.0.0', manualLicense);
    setManualName('');
    setManualVersion('');
  };

  return (
    <aside className="panel import-panel">
      <h3>导入依赖清单</h3>
      <textarea
        className="textarea"
        spellCheck={false}
        value={input}
        onChange={e => onInputChange(e.target.value)}
        placeholder={'每行一个依赖，格式：名称@版本 许可证\n例如：react@18.3.1 MIT\n也可粘贴 package.json 或许可证检查导出的 JSON/CSV'}
      />
      <div className="import-actions">
        <button className="primary" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
          开始分析
        </button>
        <button className="ghost" onClick={onLoadSample}>
          <FolderOpen size={15} />
          载入示例
        </button>
      </div>

      <div
        className={dragOver ? 'drop active' : 'drop'}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          readFile(e.dataTransfer.files?.[0]);
        }}
      >
        <FileUp size={18} />
        <span>拖放 package.json / 许可证清单到此处</span>
        <label>
          选择文件
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.json,.csv,.tsv,.lock"
            hidden
            onChange={e => readFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <p className="hint">
        支持每行一条 <code>名称@版本 许可证</code>，也支持 package.json、package-lock.json、
        license-checker 导出的 JSON 及 CSV。未识别许可证会标记为<em>待补录</em>。
      </p>

      <div className="manual">
        <input
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitManual()}
          placeholder="依赖名"
        />
        <input
          value={manualVersion}
          onChange={e => setManualVersion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitManual()}
          placeholder="版本"
          className="manual-version"
        />
        <select value={manualLicense} onChange={e => setManualLicense(e.target.value)}>
          {LICENSE_OPTIONS.map(lic => <option key={lic}>{lic}</option>)}
        </select>
        <button className="secondary" onClick={submitManual} title="添加到分析结果">
          <Plus size={15} />
          添加
        </button>
      </div>

      {status && <p className={TONES[statusTone]}>{status}</p>}
      {!hasFindings && <p className="empty-hint"><Upload size={13} /> 尚未加载依赖，请粘贴清单或载入示例后开始分析。</p>}
    </aside>
  );
}
