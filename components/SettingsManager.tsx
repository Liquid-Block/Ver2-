
import React, { useState } from 'react';
import { YearlySetting, TaxRule } from '../types';
import { Settings, Plus, Trash2, Save, Info, Calendar, FileSpreadsheet, Upload, ChevronDown, ChevronUp, History } from 'lucide-react';
import { taxRuleService } from '../services/taxRuleService';

interface Props {
  settings: YearlySetting[];
  setSettings: (settings: YearlySetting[]) => void;
  taxRules: TaxRule[];
  setTaxRules: (rules: TaxRule[]) => void;
}

const SettingsManager: React.FC<Props> = ({ settings, setSettings, taxRules, setTaxRules }) => {
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 2);
  const [newDays, setNewDays] = useState<number>(20);
  const [newHours, setNewHours] = useState<number>(160);

  // 所得税額表管理用
  const [taxEffectiveMonth, setTaxEffectiveMonth] = useState('2026-01');
  const [previewCsv, setPreviewCsv] = useState<string[][]>([]);
  const [openTaxHistory, setOpenTaxHistory] = useState<string[]>([]);

  const toggleTaxHistory = (month: string) => {
    setOpenTaxHistory(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/).map(line => line.split(',').map(cell => cell.trim()));
      setPreviewCsv(rows.filter(row => row.length > 1));
    };
    reader.readAsText(file);
  };

  const handleSaveTaxRule = async () => {
    if (previewCsv.length === 0) {
      alert('CSVデータをアップロードしてください。');
      return;
    }
    if (!taxEffectiveMonth) {
      alert('適用開始年月を入力してください。');
      return;
    }

    const newRule: TaxRule = {
      effectiveMonth: taxEffectiveMonth,
      csvData: previewCsv,
      createdAt: new Date().toISOString()
    };

    try {
      await taxRuleService.saveRule(newRule);
      const updated = await taxRuleService.getRules();
      setTaxRules(updated);
      setPreviewCsv([]);
      alert('所得税額表を保存しました。');
    } catch (e) {
      alert('保存に失敗しました。');
    }
  };

  const handleDeleteTaxRule = async (month: string) => {
    if (window.confirm(`${month}適用の税額表を削除しますか？`)) {
      await taxRuleService.deleteRule(month);
      const updated = await taxRuleService.getRules();
      setTaxRules(updated);
    }
  };

  const handleAdd = () => {
    if (settings.some(s => s.year === newYear)) {
      alert(`${newYear}年度の設定は既に存在します。`);
      return;
    }
    const updated = [...settings, { year: newYear, avgMonthlyDays: newDays, avgMonthlyHours: newHours }]
      .sort((a, b) => a.year - b.year);
    setSettings(updated);
  };

  const handleRemove = (year: number) => {
    if (window.confirm(`${year}年度の設定を削除しますか？`)) {
      setSettings(settings.filter(s => s.year !== year));
    }
  };

  const handleUpdate = (year: number, field: keyof YearlySetting, value: any) => {
    const updated = settings.map(s => s.year === year ? { ...s, [field]: value } : s);
    setSettings(updated);
  };

  const [holidayInput, setHolidayInput] = useState('');
  const [selectedYearForHoliday, setSelectedYearForHoliday] = useState<number>(settings[0]?.year || 2026);

  const handleAddHoliday = () => {
    if (!holidayInput) return;
    const updated = settings.map(s => {
      if (s.year === selectedYearForHoliday) {
        const holidays = s.companyHolidays || [];
        if (holidays.includes(holidayInput)) return s;
        return { ...s, companyHolidays: [...holidays, holidayInput].sort() };
      }
      return s;
    });
    setSettings(updated);
    setHolidayInput('');
  };

  const handleRemoveHoliday = (year: number, date: string) => {
    const updated = settings.map(s => {
      if (s.year === year) {
        return { ...s, companyHolidays: (s.companyHolidays || []).filter(d => d !== date) };
      }
      return s;
    });
    setSettings(updated);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-emerald-600" />
            システム計算設定
          </h2>
          <p className="text-sm text-gray-500 mt-1">年度ごとの平均所定労働日数・時間を管理します。これらは残業単価の算出に使用されます。</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex gap-4 text-blue-800 text-sm">
        <Info className="shrink-0 text-blue-600" size={24} />
        <div className="space-y-2">
          <p className="font-bold">計算ロジックについて:</p>
          <p className="leading-relaxed">
            正社員の「基礎時給」は以下の式で算出されます：<br/>
            <code className="bg-white/50 px-2 py-0.5 rounded font-bold">（基本給 ＋ 役職手当 ＋ 職能給）÷ 月平均所定労働時間</code>
          </p>
          <p className="leading-relaxed">
            計算年度は給与明細の「対象月」に基づいて自動選択されます。
          </p>
        </div>
      </div>

      {/* 所得税額表（CSV）管理 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" />
            所得税額表（CSV）管理
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            源泉徴収税額表のCSVデータをアップロードし、適用開始時期を設定します。
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">適用開始年月</label>
              <input
                type="month"
                value={taxEffectiveMonth}
                onChange={e => setTaxEffectiveMonth(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CSVファイル選択</label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors text-sm font-bold text-slate-600">
                  <Upload size={18} />
                  CSVを選択
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                </label>
                <button
                  onClick={handleSaveTaxRule}
                  disabled={previewCsv.length === 0}
                  className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${previewCsv.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  <Save size={18} />
                  保存
                </button>
              </div>
            </div>
          </div>

          {previewCsv.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">プレビュー (先頭10行)</label>
                <button onClick={() => setPreviewCsv([])} className="text-xs text-red-500 hover:underline">キャンセル</button>
              </div>
              <div className="border rounded-xl overflow-x-auto max-h-60 custom-scrollbar">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {previewCsv[0].map((h, i) => (
                        <th key={i} className="p-2 border-b border-r whitespace-nowrap">{h || `Col ${i}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewCsv.slice(1, 11).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => (
                          <td key={j} className="p-2 border-r whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 履歴表示 */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <History size={16} />
              設定履歴
            </h4>
            <div className="space-y-2">
              {taxRules.length === 0 ? (
                <p className="text-xs text-slate-400 italic">登録された履歴はありません。</p>
              ) : (
                taxRules.map(rule => (
                  <div key={rule.effectiveMonth} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-slate-50">
                      <button 
                        onClick={() => toggleTaxHistory(rule.effectiveMonth)}
                        className="flex items-center gap-3 font-bold text-slate-700"
                      >
                        {openTaxHistory.includes(rule.effectiveMonth) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {rule.effectiveMonth} 適用開始
                        <span className="text-[10px] font-normal text-slate-400 ml-2">登録日: {new Date(rule.createdAt).toLocaleDateString()}</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteTaxRule(rule.effectiveMonth)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {openTaxHistory.includes(rule.effectiveMonth) && (
                      <div className="p-4 border-t overflow-x-auto custom-scrollbar">
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead className="bg-slate-100">
                            <tr>
                              {rule.csvData[0].map((h, i) => (
                                <th key={i} className="p-2 border-b border-r whitespace-nowrap">{h || `Col ${i}`}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {rule.csvData.slice(1, 6).map((row, i) => (
                              <tr key={i}>
                                {row.map((cell, j) => (
                                  <td key={j} className="p-2 border-r whitespace-nowrap">{cell}</td>
                                ))}
                              </tr>
                            ))}
                            {rule.csvData.length > 6 && (
                              <tr>
                                <td colSpan={rule.csvData[0].length} className="p-2 text-center text-slate-400 italic">...以下省略...</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b">
                  <th className="p-4">年度</th>
                  <th className="p-4">月平均所定労働日数</th>
                  <th className="p-4">月平均所定労働時間</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {settings.map((s) => (
                  <tr key={s.year} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-emerald-700">{s.year}年度</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="0.1"
                          value={s.avgMonthlyDays}
                          onChange={(e) => handleUpdate(s.year, 'avgMonthlyDays', parseFloat(e.target.value))}
                          className="w-24 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-gray-400 text-xs">日</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="0.1"
                          value={s.avgMonthlyHours}
                          onChange={(e) => handleUpdate(s.year, 'avgMonthlyHours', parseFloat(e.target.value))}
                          className="w-24 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-gray-400 text-xs">時間</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleRemove(s.year)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="text-emerald-600" />
              会社休日設定（年末年始・お盆など）
            </h3>
            <div className="flex gap-4 mb-6">
              <select 
                value={selectedYearForHoliday} 
                onChange={e => setSelectedYearForHoliday(parseInt(e.target.value))}
                className="border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {settings.map(s => <option key={s.year} value={s.year}>{s.year}年度</option>)}
              </select>
              <input 
                type="date" 
                value={holidayInput}
                onChange={e => setHolidayInput(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button 
                onClick={handleAddHoliday}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <Plus size={18} /> 追加
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.find(s => s.year === selectedYearForHoliday)?.companyHolidays?.map(date => (
                <div key={date} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-gray-200">
                  {date}
                  <button onClick={() => handleRemoveHoliday(selectedYearForHoliday, date)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              )) || <p className="text-gray-400 text-xs italic">登録された休日はありません</p>}
            </div>
          </div>
        </div>

        {/* Add Card */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl h-fit">
          <h3 className="text-emerald-900 font-bold mb-6 flex items-center gap-2">
            <Plus size={20} />
            年度設定の追加
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">年度 (西暦)</label>
              <input 
                type="number" 
                value={newYear}
                onChange={e => setNewYear(parseInt(e.target.value))}
                className="w-full border-emerald-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">平均所定労働日数</label>
              <input 
                type="number" 
                step="0.1"
                value={newDays}
                onChange={e => setNewDays(parseFloat(e.target.value))}
                className="w-full border-emerald-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">平均所定労働時間</label>
              <input 
                type="number" 
                step="0.1"
                value={newHours}
                onChange={e => setNewHours(parseFloat(e.target.value))}
                className="w-full border-emerald-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
            <button 
              onClick={handleAdd}
              className="w-full mt-4 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              設定を追加・保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
