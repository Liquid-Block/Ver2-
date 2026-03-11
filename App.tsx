
import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, PayrollResult, YearlySetting, PayrollHistoryRecord, DailyAttendance, CompanyConfig, TaxRule } from './types';
import { INITIAL_EMPLOYEES, INITIAL_SETTINGS, DEFAULT_COMPANY_CONFIG } from './constants';
import EmployeeManager from './components/EmployeeManager';
import AttendanceImporter from './components/AttendanceImporter';
import PayslipView from './components/PayslipView';
import SettingsManager from './components/SettingsManager';
import HistoryManager from './components/HistoryManager';
import ReportingView from './components/ReportingView';
import CompanySettingsManager from './components/CompanySettingsManager';
import { calculatePayroll } from './services/payrollCalculator';
import { companyService } from './services/companyService';
import { taxRuleService } from './services/taxRuleService';
import { LayoutDashboard, Users, FileText, Printer, ChevronRight, Calculator, Settings, History, CheckCircle2, Files, ArrowLeft, Edit3, Building2 } from 'lucide-react';

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('payroll_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [settings, setSettings] = useState<YearlySetting[]>(() => {
    const saved = localStorage.getItem('payroll_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(DEFAULT_COMPANY_CONFIG);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);

  const [history, setHistory] = useState<PayrollHistoryRecord[]>(() => {
    const saved = localStorage.getItem('payroll_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<PayrollResult[]>([]);
  const [viewingHistoryList, setViewingHistoryList] = useState<PayrollHistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'calculation' | 'payslips' | 'settings' | 'history' | 'reports' | 'company'>('dashboard');
  
  const [targetMonth, setTargetMonth] = useState('2026-01');
  const [payDate, setPayDate] = useState('2026-02-10');

  useEffect(() => {
    const loadData = async () => {
      const [config, rules] = await Promise.all([
        companyService.getConfig(),
        taxRuleService.getRules()
      ]);
      setCompanyConfig(config);
      setTaxRules(rules);
    };
    loadData();
  }, []);

  const handleSaveCompanyConfig = async (newConfig: CompanyConfig) => {
    await companyService.saveConfig(newConfig);
    setCompanyConfig(newConfig);
  };

  const handleMonthChange = (newMonth: string) => {
    setTargetMonth(newMonth);
    const [y, m] = newMonth.split('-').map(Number);
    let payYear = y;
    let payMonth = m + 1;
    if (payMonth > 12) {
      payMonth = 1;
      payYear++;
    }
    let date = new Date(payYear, payMonth - 1, 10);
    const day = date.getDay();
    if (day === 0) date.setDate(date.getDate() - 2);
    else if (day === 6) date.setDate(date.getDate() - 1);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setPayDate(formattedDate);
  };

  useEffect(() => {
    localStorage.setItem('payroll_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('payroll_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('payroll_history', JSON.stringify(history));
  }, [history]);

  const deleteHistoryRecord = (id: string) => {
    if (window.confirm('この個別の履歴データを完全に削除しますか？')) {
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  const deleteMonthHistory = (month: string) => {
    const [y, m] = month.split('-');
    const monthLabel = `${y}年${parseInt(m)}月`;
    const targetCount = history.filter(h => h.month === month).length;
    if (targetCount === 0) return;
    if (window.confirm(`${monthLabel}の全データ（${targetCount}件）を完全に消去しますか？\nこの操作は取り消せません。`)) {
      setHistory(prev => prev.filter(h => h.month !== month));
      alert(`${monthLabel}のデータを削除しました。`);
    }
  };

  const handleImportAttendance = (records: AttendanceRecord[]) => {
    setAttendance(records);
    
    // データのタイムスタンプから月を判別 (1月と2月の混同解消)
    let detectedMonth = targetMonth;
    if (records.length > 0 && records[0].dailyRecords && records[0].dailyRecords.length > 0) {
      const firstDate = records[0].dailyRecords[0].date;
      detectedMonth = firstDate.substring(0, 7); // YYYY-MM
    }

    // 即座に給与計算を実行
    const calculated = records.map(att => {
      const emp = employees.find(e => e.id === att.employeeId);
      if (!emp) return null;
      return calculatePayroll(emp, att, detectedMonth, payDate, settings, companyConfig, taxRules, history);
    }).filter(r => r !== null) as PayrollResult[];
    
    setResults(calculated);
    setTargetMonth(detectedMonth);

    // DB保存 (履歴への永続化)
    const targetYear = parseInt(detectedMonth.split('-')[0]);
    const currentYearSetting = settings.find(s => s.year === targetYear) || settings[0];
    const newRecords: PayrollHistoryRecord[] = calculated.map(res => ({
      ...res,
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      finalizedAt: new Date().toISOString(),
      settingsSnapshot: { ...currentYearSetting }
    }));
    
    // 重複保存を防ぐため、同じ月・同じ従業員の既存データを削除してから追加
    setHistory(prev => {
      const filtered = prev.filter(h => 
        !(h.month === detectedMonth && newRecords.some(nr => nr.employee.id === h.employee.id))
      );
      return [...filtered, ...newRecords];
    });

    alert(`${detectedMonth.replace('-', '年')}月分の勤怠・給与データ（${newRecords.length}件）を履歴に保存しました。`);

    setViewingHistoryList([]);
    setActiveTab('payslips');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCalculate = () => {
    const [year, month] = targetMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const calculated = employees.map(emp => {
      // 勤怠データがあるか確認
      let att = attendance.find(a => a.employeeId === emp.id);
      
      // 役員で勤怠がない場合はデフォルトの空データを作成
      if (!att && emp.employmentType === 'director') {
        const daily: DailyAttendance[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][new Date(dateStr).getDay()];
          daily.push({
            date: dateStr,
            dayOfWeek,
            startTime: '',
            endTime: '',
            breakTime: '00:00',
            workHours: '-:--',
            nightWorkHours: '-:--',
            overtimeHours: '-:--',
            status: '',
            paidLeaveType: 'none',
            memo: ''
          });
        }
        att = {
          employeeId: emp.id,
          workDays: 0,
          holidayWorkDays: 0,
          paidLeaveDays: 0,
          absentDays: 0,
          specialLeaveDays: 0,
          totalWorkHours: '0:00',
          overtimeHours: '0:00',
          legalHolidayHours: '0:00',
          nonLegalHolidayHours: '0:00',
          nightWorkHours: '0:00',
          lateEarlyCount: 0,
          lateEarlyHours: '0:00',
          dailyRecords: daily
        };
      }

      if (!att) return null;
      return calculatePayroll(emp, att, targetMonth, payDate, settings, companyConfig, taxRules, history);
    }).filter(r => r !== null) as PayrollResult[];
    
    setResults(calculated);
    setViewingHistoryList([]);
    setActiveTab('payslips');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateAdjustment = (idx: number, field: 'taxableAdjustment' | 'nonTaxableAdjustment' | 'adjustmentMemo', value: any) => {
    setResults(prev => {
      const next = [...prev];
      const res = { ...next[idx] };
      if (field === 'adjustmentMemo') {
        res.adjustmentMemo = value;
      } else {
        res[field] = Number(value) || 0;
      }
      const num = (v: any) => (typeof v === 'number' && !isNaN(v)) ? v : 0;
      const baseGross = num(res.taxableTotal) + num(res.nonTaxableTotal);
      res.grossPay = baseGross + num(res.taxableAdjustment) + num(res.nonTaxableAdjustment);
      res.netPay = res.grossPay - num(res.deductionGrandTotal);
      next[idx] = res;
      return next;
    });
  };

  const handleFinalize = (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (results.length === 0) return;
    const targetYear = parseInt(targetMonth.split('-')[0]);
    const currentYearSetting = settings.find(s => s.year === targetYear) || settings[0];
    const newRecords: PayrollHistoryRecord[] = results.map(res => ({
      ...res,
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      finalizedAt: new Date().toISOString(),
      settingsSnapshot: { ...currentYearSetting }
    }));
    // 重複保存を防ぐため、同じ月・同じ従業員の既存データを削除してから追加
    setHistory(prev => {
      const filtered = prev.filter(h => 
        !(h.month === targetMonth && newRecords.some(nr => nr.employee.id === h.employee.id))
      );
      return [...filtered, ...newRecords];
    });
    alert(`${newRecords.length}件のデータを保存しました！`);
    setActiveTab('history');
  };

  const handleViewFromHistory = (record: PayrollHistoryRecord) => {
    setViewingHistoryList([record]);
    setResults([]);
    setActiveTab('payslips');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewBulkFromHistory = (records: PayrollHistoryRecord[]) => {
    setViewingHistoryList(records);
    setResults([]);
    setActiveTab('payslips');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 印刷時の用紙の向きを決定するクラス
  const printOrientationClass = activeTab === 'reports' ? 'print-landscape' : 'print-portrait';

  return (
    <div className={`min-h-screen flex bg-gray-50 text-gray-900 overflow-x-hidden ${printOrientationClass}`}>
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col no-print fixed h-full z-40 shadow-sm">
        <div className="p-6">
          <h1 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
            <Calculator size={24} />
            {companyConfig.companyName}
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Professional v2.5 Ledger</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> ダッシュボード</button>
          <button onClick={() => setActiveTab('employees')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'employees' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={20} /> 従業員マスター</button>
          <button onClick={() => setActiveTab('calculation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'calculation' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><FileText size={20} /> 勤怠インポート・確定</button>
          <button onClick={() => setActiveTab('payslips')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'payslips' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><Printer size={20} /> 給与明細出力</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><History size={20} /> 給与履歴</button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><Files size={20} /> 帳票履歴</button>
          <button onClick={() => setActiveTab('company')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'company' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><Building2 size={20} /> 会社情報設定</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><Settings size={20} /> システム設定</button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-emerald-900 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-70">確定データ数</p>
            <p className="text-2xl font-bold">{history.length} 件</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-y-auto print:ml-0 print:overflow-visible print:bg-white min-h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 sticky top-0 z-30 flex justify-between items-center no-print">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>管理画面</span>
            <ChevronRight size={14} />
            <span className="text-gray-900 font-medium capitalize">{activeTab}</span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-3 bg-gray-50 border px-3 py-1.5 rounded-lg">
                <label className="text-xs font-bold text-gray-500">対象月:</label>
                <input type="month" value={targetMonth} onChange={e => handleMonthChange(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 outline-none font-bold" />
            </div>
            <div className="flex items-center gap-3 bg-gray-50 border px-3 py-1.5 rounded-lg">
                <label className="text-xs font-bold text-gray-500">支給日:</label>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 outline-none font-bold" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-400 text-sm font-bold mb-4">今月の総支給予定</h3>
                  <p className="text-3xl font-bold">¥{(results.reduce((acc, curr) => acc + (curr.grossPay || 0), 0)).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-400 text-sm font-bold mb-4">全振込総額</h3>
                  <p className="text-3xl font-bold text-emerald-600">¥{(history.reduce((acc, curr) => acc + (curr.netPay || 0), 0)).toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-400 text-sm font-bold mb-4">登録者数</h3>
                  <p className="text-3xl font-bold text-blue-600">{employees.length} 名</p>
                </div>
              </div>
          )}
          {activeTab === 'employees' && <EmployeeManager employees={employees} setEmployees={setEmployees} />}
          {activeTab === 'calculation' && (
            <div className="space-y-6">
              <AttendanceImporter employees={employees} onImport={handleImportAttendance} targetMonth={targetMonth} settings={settings} />
              {attendance.length > 0 && (
                <div className="flex justify-center py-6">
                  <button onClick={handleCalculate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 flex items-center gap-3 transition-all">
                    <Calculator size={24} /> 給与計算を実行して明細を確認
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTab === 'payslips' && (
            <div className="space-y-8">
              {(results.length > 0 || viewingHistoryList.length > 0) ? (
                <>
                  <div className="flex justify-between items-center no-print bg-white p-6 rounded-2xl border shadow-sm mb-8 border-l-8 border-l-emerald-500">
                    <div>
                      {viewingHistoryList.length > 0 ? (
                        <div className="flex items-center gap-4">
                          <button onClick={() => setActiveTab('history')} className="p-2 hover:bg-gray-100 rounded-full transition-all text-emerald-600"><ArrowLeft size={24}/></button>
                          <div>
                            <h3 className="text-xl font-bold text-emerald-700">【履歴閲覧中】{viewingHistoryList[0].month}分 給与明細{viewingHistoryList.length > 1 ? `（一括 ${viewingHistoryList.length}件）` : ''}</h3>
                            <p className="text-sm text-gray-500">保存当時の調整内容を再現しています。</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-xl font-bold">給与計算の最終確認・手動調整</h3>
                          <p className="text-sm text-gray-500">各従業員の数値を手動調整できます。</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4">
                      {viewingHistoryList.length === 0 && (
                        <button onClick={handleFinalize} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-50 transition-all">
                          <CheckCircle2 size={24} /> この内容で確定保存
                        </button>
                      )}
                      <button onClick={() => window.print()} className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-black shadow-xl shadow-gray-200 transition-all">
                        <Printer size={24} /> 印刷 / PDF保存
                      </button>
                    </div>
                  </div>
                  {viewingHistoryList.length === 0 && results.length > 0 && (
                    <div className="no-print bg-white rounded-2xl border shadow-sm overflow-hidden mb-12">
                      <div className="p-4 bg-gray-50 border-b flex items-center gap-2 font-bold text-gray-600">
                        <Edit3 size={18}/> 手動調整エディタ
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/50">
                            <th className="p-4 border-b">従業員</th>
                            <th className="p-4 border-b">課税調整</th>
                            <th className="p-4 border-b">非課税調整</th>
                            <th className="p-4 border-b">調整理由メモ</th>
                            <th className="p-4 border-b text-right">現在の差引支給額</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results.map((res, idx) => (
                            <tr key={res.employee.id} className="hover:bg-gray-50">
                              <td className="p-4 font-bold">{res.employee.name}</td>
                              <td className="p-4">
                                <input type="number" value={res.taxableAdjustment} onChange={e => updateAdjustment(idx, 'taxableAdjustment', e.target.value)} className="w-32 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </td>
                              <td className="p-4">
                                <input type="number" value={res.nonTaxableAdjustment} onChange={e => updateAdjustment(idx, 'nonTaxableAdjustment', e.target.value)} className="w-32 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </td>
                              <td className="p-4">
                                <input type="text" placeholder="理由を入力..." value={res.adjustmentMemo} onChange={e => updateAdjustment(idx, 'adjustmentMemo', e.target.value)} className="w-full border rounded-lg px-3 py-1 focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </td>
                              <td className="p-4 text-right font-bold text-emerald-700 font-mono">¥{(res.netPay || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="print:space-y-0">
                    {viewingHistoryList.length > 0 ? (
                      viewingHistoryList.map((h, i) => (
                        <div key={h.id} className={i < viewingHistoryList.length - 1 ? "page-break" : ""}>
                          <PayslipView data={h} />
                        </div>
                      ))
                    ) : (
                      results.map((res, idx) => (
                        <div key={idx} className={idx < results.length - 1 ? "page-break" : ""}><PayslipView data={res} /></div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 no-print">
                  <FileText size={64} className="mx-auto text-gray-200 mb-4" />
                  <h3 className="text-lg font-bold text-gray-400">表示可能な明細はありません</h3>
                </div>
              )}
            </div>
          )}
          {activeTab === 'history' && <HistoryManager history={history} setHistory={setHistory} employees={employees} onViewPayslip={handleViewFromHistory} onViewBulkPayslip={handleViewBulkFromHistory} onDeleteRecord={deleteHistoryRecord} onDeleteMonth={deleteMonthHistory} />}
          {activeTab === 'reports' && <ReportingView history={history} employees={employees} onDeleteMonth={deleteMonthHistory} />}
          {activeTab === 'company' && <CompanySettingsManager config={companyConfig} onSave={handleSaveCompanyConfig} />}
          {activeTab === 'settings' && <SettingsManager settings={settings} setSettings={setSettings} taxRules={taxRules} setTaxRules={setTaxRules} />}
        </div>
      </main>
    </div>
  );
};

export default App;
