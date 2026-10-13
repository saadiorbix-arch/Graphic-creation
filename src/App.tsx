import React from 'react';
import {
  Download,
  FileImage,
  Grid,
  Palette,
  Maximize2,
  Sliders,
  Database,
  Layers,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Upload,
  FileText,
} from 'lucide-react';
import {
  PUBLICATION_THEMES,
  DEFAULT_THEME,
  DIMENSION_PRESETS,
} from './core/theme';
import {
  type FigureDimensions,
  type FigureMetadata,
  type PublicationTheme,
  type VisualFramework,
  computePlotBounds,
} from './core/types';
import { exportSvgFile, exportHighDpiPng } from './core/export';
import {
  type RawFormat,
  parseAndValidateFrameworkData,
  serializeFrameworkData,
} from './core/dataParser';
import { frameworkRegistry } from './core/registry';
import './frameworks'; // Ensure bespoke frameworks are registered
import { PublicationFigure } from './components/canvas/PublicationFigure';
import './App.css';

type InspectorTab = 'parameters' | 'data' | 'typography';

export function App() {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const availableFrameworks = React.useMemo(() => frameworkRegistry.list(), []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeFramework, setActiveFramework] = React.useState<VisualFramework<any, any>>(
    () => availableFrameworks[0]
  );

  const [theme, setTheme] = React.useState<PublicationTheme>(DEFAULT_THEME);
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>('custom');
  const [dimensions, setDimensions] = React.useState<FigureDimensions>(
    () => activeFramework.defaultDimensions
  );
  const [metadata, setMetadata] = React.useState<FigureMetadata>(
    () => activeFramework.defaultMetadata
  );
  const [config, setConfig] = React.useState<Record<string, unknown>>(
    () => activeFramework.defaultConfig
  );
  const [injectedData, setInjectedData] = React.useState<unknown>(
    () => activeFramework.sampleData
  );

  // Data Injection Editor State
  const [activeTab, setActiveTab] = React.useState<InspectorTab>('parameters');
  const [dataFormat, setDataFormat] = React.useState<RawFormat>('json');
  const [rawEditorText, setRawEditorText] = React.useState<string>(() =>
    serializeFrameworkData(activeFramework.sampleData, 'json')
  );
  const [validationErrors, setValidationErrors] = React.useState<string[] | null>(null);
  const [recordCount, setRecordCount] = React.useState<number>(() =>
    Array.isArray(activeFramework.sampleData) ? activeFramework.sampleData.length : 1
  );

  const [showCalibrationGrid, setShowCalibrationGrid] = React.useState<boolean>(false);
  const [exportStatus, setExportStatus] = React.useState<string | null>(null);

  const bounds = computePlotBounds(dimensions);
  const ActiveGraphicComponent = activeFramework.Component;

  // Switch active visual framework cleanly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectFramework = (fw: VisualFramework<any, any>) => {
    setActiveFramework(fw);
    setDimensions(fw.defaultDimensions);
    setMetadata(fw.defaultMetadata);
    setConfig(fw.defaultConfig);
    setInjectedData(fw.sampleData);
    setSelectedPresetId('custom');
    const serialized = serializeFrameworkData(fw.sampleData, dataFormat);
    setRawEditorText(serialized);
    setValidationErrors(null);
    setRecordCount(Array.isArray(fw.sampleData) ? fw.sampleData.length : 1);
  };

  // Switch JSON / CSV view format
  const handleFormatSwitch = (nextFormat: RawFormat) => {
    setDataFormat(nextFormat);
    setRawEditorText(serializeFrameworkData(injectedData, nextFormat));
    setValidationErrors(null);
  };

  // Validate and inject edited JSON/CSV text
  const handleApplyDataInjection = (textToValidate: string, format = dataFormat) => {
    setRawEditorText(textToValidate);
    const result = parseAndValidateFrameworkData(
      textToValidate,
      format,
      activeFramework
    );
    if (result.valid && result.data !== undefined) {
      setInjectedData(result.data);
      setValidationErrors(null);
      if (result.recordCount !== undefined) {
        setRecordCount(result.recordCount);
      }
    } else {
      setValidationErrors(result.errors ?? ['Invalid data format.']);
    }
  };

  // Reset to framework's default curated dataset
  const handleResetSampleData = () => {
    setInjectedData(activeFramework.sampleData);
    const serialized = serializeFrameworkData(activeFramework.sampleData, dataFormat);
    setRawEditorText(serialized);
    setValidationErrors(null);
    setRecordCount(
      Array.isArray(activeFramework.sampleData) ? activeFramework.sampleData.length : 1
    );
  };

  // Handle local .json or .csv file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const detectedFormat: RawFormat = isCsv ? 'csv' : 'json';
    setDataFormat(detectedFormat);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? '');
      handleApplyDataInjection(content, detectedFormat);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') {
      setDimensions(activeFramework.defaultDimensions);
      return;
    }
    const preset = DIMENSION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDimensions((prev) => ({
      ...prev,
      width: preset.width,
      height: preset.height,
    }));
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    exportSvgFile(svgRef.current, {
      filename: `${activeFramework.id}_${metadata.title.slice(0, 28)}`,
    });
    setExportStatus('Exported standalone SVG');
    setTimeout(() => setExportStatus(null), 2500);
  };

  const handleExportPng = async () => {
    if (!svgRef.current) return;
    await exportHighDpiPng(svgRef.current, {
      filename: `${activeFramework.id}_${metadata.title.slice(0, 28)}`,
      scaleFactor: 3,
      backgroundColor: theme.background,
    });
    setExportStatus('Exported 3x High-DPI PNG');
    setTimeout(() => setExportStatus(null), 2500);
  };

  return (
    <div className="engine-shell">
      {/* Top Bar */}
      <header className="engine-topbar">
        <div className="brand-group">
          <span className="brand-badge">GBG STUDIO</span>
          <h1 className="brand-title">Bespoke Research Graphics System</h1>
          <span className="active-framework-pill">{activeFramework.name}</span>
        </div>

        <div className="toolbar-actions">
          {exportStatus && (
            <span className="export-toast">
              <CheckCircle2 size={14} />
              {exportStatus}
            </span>
          )}

          <button
            type="button"
            className={`tool-btn ${showCalibrationGrid ? 'active' : ''}`}
            onClick={() => setShowCalibrationGrid((v) => !v)}
            title="Toggle non-printing D3 coordinate & margin calibration overlay"
          >
            <Grid size={15} />
            <span>Calibration Grid</span>
          </button>

          <button
            type="button"
            className="tool-btn"
            onClick={handleExportSvg}
            title="Export self-contained vector SVG for Illustrator / LaTeX"
          >
            <Download size={15} />
            <span>Export SVG</span>
          </button>

          <button
            type="button"
            className="tool-btn primary"
            onClick={handleExportPng}
            title="Export 300+ DPI (3x scale) raster PNG"
          >
            <FileImage size={15} />
            <span>Export 3x PNG</span>
          </button>
        </div>
      </header>

      {/* 3-Column Studio Workbench: Left Framework Library | Center Artboard | Right Inspector */}
      <div className="engine-workspace">
        {/* Left Sidebar: Bespoke Visual Framework Selector */}
        <aside className="framework-sidebar">
          <div className="sidebar-header">
            <Layers size={14} />
            <span>Visual Frameworks</span>
          </div>
          <p className="sidebar-helper">
            Select a bespoke visual composition. Each framework defines a fixed structural encoding into which research data is injected.
          </p>

          <div className="framework-list">
            {availableFrameworks.map((fw) => {
              const isSelected = fw.id === activeFramework.id;
              return (
                <button
                  key={fw.id}
                  type="button"
                  className={`framework-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectFramework(fw)}
                >
                  <span className="framework-category">{fw.category}</span>
                  <strong className="framework-name">{fw.name}</strong>
                  <span className="framework-desc">{fw.description}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Stage: Live Calibrated SVG Artboard */}
        <main className="artboard-stage">
          <div className="artboard-frame">
            <PublicationFigure
              svgRef={svgRef}
              dimensions={dimensions}
              metadata={metadata}
              theme={theme}
              showCalibrationGrid={showCalibrationGrid}
            >
              <ActiveGraphicComponent
                data={injectedData}
                config={config}
                bounds={bounds}
                theme={theme}
              />
            </PublicationFigure>
          </div>
        </main>

        {/* Right Inspector: Compositional Parameters, Data Injection & Editorial Metadata */}
        <aside className="engine-inspector">
          {/* Inspector Navigation Tabs */}
          <div className="inspector-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'parameters' ? 'active' : ''}`}
              onClick={() => setActiveTab('parameters')}
            >
              <Sliders size={13} />
              <span>Composition</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <Database size={13} />
              <span>Data ({recordCount})</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'typography' ? 'active' : ''}`}
              onClick={() => setActiveTab('typography')}
            >
              <FileText size={13} />
              <span>Editorial</span>
            </button>
          </div>

          {/* TAB 1: Compositional Parameters & Plate Aesthetics */}
          {activeTab === 'parameters' && (
            <>
              <div className="inspector-section">
                <div className="section-header">
                  <Sliders size={14} />
                  <span>Framework Parameters</span>
                </div>

                {activeFramework.parameters.map((param) => {
                  const keyStr = String(param.key);
                  const currentVal = config[keyStr];

                  if (param.type === 'boolean') {
                    return (
                      <label key={keyStr} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={Boolean(currentVal)}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              [keyStr]: e.target.checked,
                            }))
                          }
                        />
                        <span>{param.label}</span>
                      </label>
                    );
                  }

                  if (param.type === 'select' && param.options) {
                    return (
                      <label key={keyStr} className="field-label">
                        <span>{param.label}</span>
                        <select
                          className="inspector-select"
                          value={String(currentVal)}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              [keyStr]: e.target.value,
                            }))
                          }
                        >
                          {param.options.map((opt) => (
                            <option key={String(opt.value)} value={String(opt.value)}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  if (param.type === 'number') {
                    return (
                      <label key={keyStr} className="field-label">
                        <div className="range-header">
                          <span>{param.label}</span>
                          <code className="range-val">{String(currentVal)}</code>
                        </div>
                        <input
                          type="range"
                          className="inspector-range"
                          min={param.min ?? 0}
                          max={param.max ?? 100}
                          step={param.step ?? 1}
                          value={Number(currentVal)}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              [keyStr]: Number(e.target.value),
                            }))
                          }
                        />
                      </label>
                    );
                  }

                  return (
                    <label key={keyStr} className="field-label">
                      <span>{param.label}</span>
                      <input
                        type="text"
                        className="inspector-input"
                        value={String(currentVal ?? '')}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            [keyStr]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  );
                })}
              </div>

              <div className="inspector-section">
                <div className="section-header">
                  <Palette size={14} />
                  <span>Publication Theme</span>
                </div>
                <select
                  className="inspector-select"
                  value={theme.id}
                  onChange={(e) => {
                    const next = PUBLICATION_THEMES[e.target.value];
                    if (next) setTheme(next);
                  }}
                >
                  {Object.values(PUBLICATION_THEMES).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <div className="palette-preview">
                  {theme.palette.categorical.map((hex) => (
                    <span
                      key={hex}
                      className="palette-swatch"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              <div className="inspector-section">
                <div className="section-header">
                  <Maximize2 size={14} />
                  <span>Print Plate Dimensions</span>
                </div>
                <select
                  className="inspector-select"
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  <option value="custom">
                    Framework Default ({activeFramework.defaultDimensions.width}×
                    {activeFramework.defaultDimensions.height})
                  </option>
                  {DIMENSION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} ({preset.width}×{preset.height})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* TAB 2: Live Data Injection Workbench (JSON / CSV + Schema Validation) */}
          {activeTab === 'data' && (
            <div className="inspector-section data-workbench">
              <div className="section-header">
                <Database size={14} />
                <span>Data Injection Contract</span>
              </div>

              <p className="schema-box">{activeFramework.dataSchemaDescription}</p>

              <div className="data-toolbar">
                <div className="format-toggle">
                  <button
                    type="button"
                    className={`fmt-btn ${dataFormat === 'json' ? 'active' : ''}`}
                    onClick={() => handleFormatSwitch('json')}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    className={`fmt-btn ${dataFormat === 'csv' ? 'active' : ''}`}
                    onClick={() => handleFormatSwitch('csv')}
                  >
                    CSV
                  </button>
                </div>

                <div className="data-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload .json or .csv dataset"
                  >
                    <Upload size={12} />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={handleResetSampleData}
                    title="Restore default curated sample dataset"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {validationErrors ? (
                <div className="validation-banner error">
                  <AlertCircle size={14} />
                  <div className="err-list">
                    {validationErrors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="validation-banner valid">
                  <CheckCircle2 size={14} />
                  <span>Schema valid · {recordCount} records injected</span>
                </div>
              )}

              <textarea
                className="data-editor-textarea"
                rows={18}
                spellCheck={false}
                value={rawEditorText}
                onChange={(e) => handleApplyDataInjection(e.target.value)}
              />
            </div>
          )}

          {/* TAB 3: Editorial Typography & Attribution */}
          {activeTab === 'typography' && (
            <div className="inspector-section">
              <div className="section-header">
                <FileText size={14} />
                <span>Editorial Typography & Attribution</span>
              </div>

              <label className="field-label">
                <span>Figure Identifier</span>
                <input
                  type="text"
                  className="inspector-input"
                  value={metadata.figureLabel ?? ''}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, figureLabel: e.target.value }))
                  }
                />
              </label>

              <label className="field-label">
                <span>Headline Title</span>
                <input
                  type="text"
                  className="inspector-input"
                  value={metadata.title}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, title: e.target.value }))
                  }
                />
              </label>

              <label className="field-label">
                <span>Deck / Subtitle</span>
                <textarea
                  rows={3}
                  className="inspector-textarea"
                  value={metadata.subtitle ?? ''}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, subtitle: e.target.value }))
                  }
                />
              </label>

              <label className="field-label">
                <span>Methodological Footnote</span>
                <textarea
                  rows={2}
                  className="inspector-textarea"
                  value={metadata.footnote ?? ''}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, footnote: e.target.value }))
                  }
                />
              </label>

              <label className="field-label">
                <span>Source Attribution</span>
                <input
                  type="text"
                  className="inspector-input"
                  value={metadata.source ?? ''}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, source: e.target.value }))
                  }
                />
              </label>

              <label className="field-label">
                <span>Right Footer Credit</span>
                <input
                  type="text"
                  className="inspector-input"
                  value={metadata.credit ?? ''}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, credit: e.target.value }))
                  }
                />
              </label>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
