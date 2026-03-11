
import React, { useState, useMemo } from 'react';
import { PayrollHistoryRecord, Employee } from '../types';
import { Printer, Table, BarChart3, TrendingUp, History, Files, ChevronRight, User, Search, Calculator, Download, ClipboardList, Trash2 } from 'lucide-react';
import AttendanceSheetView from './AttendanceSheetView';

interface Props {
  history: PayrollHistoryRecord[];
  employees: Employee[];
  onDeleteMonth: (month: string) => void;
}

type ReportType = 'list' | 'summary' | 'trend' | 'company_trend' | 'ledger' | 'attendance';

const ReportingView: React.FC<Props> = ({ history, employees, onDeleteMonth }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('list');
  const [targetMonth, setTargetMonth] = useState('2026-01');
  const [targetYear, setTargetYear] = useState('2026');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');

  // 12ヶ月の配列
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => `${targetYear}-${String(i + 1).padStart(2, '0')}`),
    [targetYear]
  );

  // 共通の項目定義 (支給控除一覧などで使用)
  const allPayrollItems = [
    { label: '役員報酬', key: 'directorPay' },
    { label: '基本給', key: 'baseSalary' },
    { label: '役職手当', key: 'positionAllowance' },
    { label: '職能手当', key: 'skillAllowance' },
    { label: '住宅手当', key: 'housingAllowance' },
    { label: '家族手当', key: 'familyAllowance' },
    { label: '課税通勤', key: 'commutingTaxable' },
    { label: '残業手当', key: 'overtimePay' },
    { label: '休日手当', key: 'holidayPay' },
    { label: '深夜手当', key: 'nightPay' },
    { label: '課税調整', key: 'taxableAdjustment' },
    { label: '課税計', key: 'taxableTotal', isBold: true },
    { label: '非課税通勤', key: 'nonTaxableTotal' },
    { label: '非課調整', key: 'nonTaxableAdjustment' },
    { label: '総支給額', key: 'grossPay', isBold: true, isDouble: true },
    { label: '健康保険', key: 'healthInsurance' },
    { label: '介護保険', key: 'nursingInsurance' },
    { label: '厚生年金', key: 'welfarePension' },
    { label: '雇用保険', key: 'employmentInsurance' },
    { label: '社保計', key: 'socialInsuranceTotal', isBold: true },
    { label: '源泉所得税', key: 'incomeTax' },
    { label: '住民税', key: 'residentTax' },
    { label: '年調精算', key: 'yearEndAdjustment' },
    { label: '控除合計', key: 'deductionGrandTotal', isBold: true },
    { label: '差引支給額', key: 'netPay', isBold: true, isHighlight: true },
    { label: '有給残', key: 'remainingPaidLeave' },
  ];

  const safeFormat = (n: any) => {
    if (n === undefined || n === null || isNaN(n)) return '0';
    return Number(n).toLocaleString();
  };

  const getRecordVal = (rec: PayrollHistoryRecord, key: string): number => {
    const emp = rec.employee;
    const val = (() => {
      switch(key) {
        case 'directorPay': return emp.employmentType === 'director' ? emp.baseSalary : 0;
        case 'baseSalary': return emp.employmentType !== 'director' ? emp.baseSalary : 0;
        case 'positionAllowance': return emp.positionAllowance;
        case 'skillAllowance': return emp.skillAllowance;
        case 'housingAllowance': return emp.housingAllowance;
        case 'familyAllowance': return emp.familyAllowance;
        case 'commutingTaxable': return emp.commutingAllowanceTaxable;
        case 'overtimePay': return rec.overtimePay;
        case 'holidayPay': return rec.holidayPay;
        case 'nightPay': return rec.nightPay;
        case 'taxableAdjustment': return rec.taxableAdjustment;
        case 'taxableTotal': return rec.taxableTotal;
        case 'nonTaxableTotal': return rec.nonTaxableTotal;
        case 'nonTaxableAdjustment': return rec.nonTaxableAdjustment;
        case 'grossPay': return rec.grossPay;
        case 'healthInsurance': return emp.healthInsurance;
        case 'nursingInsurance': return emp.nursingInsurance;
        case 'welfarePension': return emp.welfarePension;
        case 'employmentInsurance': return rec.employmentInsurance;
        case 'socialInsuranceTotal': return rec.socialInsuranceTotal;
        case 'incomeTax': return rec.incomeTax;
        case 'residentTax': return emp.residentTax;
        case 'yearEndAdjustment': return rec.yearEndAdjustment;
        case 'deductionGrandTotal': return rec.deductionGrandTotal;
        case 'netPay': return rec.netPay;
        case 'remainingPaidLeave': return emp.remainingPaidLeave || 0;
        default: return 0;
      }
    })();
    return val || 0;
  };

  // 1. 給与支給控除一覧 (特定月のマトリックス表示)
  const listReport = useMemo(() => {
    const records = history.filter(h => h.month === targetMonth);
    return { records };
  }, [history, targetMonth]);

  /**
   * 集計ロジックの最終定義に基づいた計算
   * ① 課税総支給額 (基本給グループ): 基本給（役員報酬） ＋ 残業手当 ＋ 深夜残業手当 (+ 休日 + 調整 + 課税通勤)
   * ② 各種課税手当 (固定手当グループ): 役職手当 ＋ 職能手当 ＋ 住宅手当 ＋ 家族手当
   * ③ 支給（課税）合計: ① ＋ ②
   */
  const calculateAggregateRow = (h: PayrollHistoryRecord) => {
    const emp = h.employee;

    // ② 各種課税手当 (固定手当グループ)
    const t2 = (emp.positionAllowance || 0) + (emp.skillAllowance || 0) + (emp.housingAllowance || 0) + (emp.familyAllowance || 0);

    // ① 課税総支給額 (基本給グループ)
    // 算式を合わせるため、総課税額(h.taxableTotal)から固定手当(t2)を引いたものを①とする
    const t1 = (h.taxableTotal || 0) - t2;

    // ③ 支給計 (課税計)
    const taxableSum = h.taxableTotal || 0;

    // ④ 諸手当 (非課税)
    const nonTaxable = (h.nonTaxableTotal || 0) + (h.nonTaxableAdjustment || 0);
    // ⑤ 支給合計
    const gross = h.grossPay || 0;
    
    return {
      name: emp.name,
      type: emp.employmentType,
      t1, t2, taxableSum, nonTaxable, gross,
      health: emp.healthInsurance || 0,
      welfare: emp.welfarePension || 0,
      employ: h.employmentInsurance || 0,
      socialSub: h.socialInsuranceTotal || 0,
      afterSocial: h.taxableIncome || 0,
      dependents: emp.dependents?.length || 0,
      incomeTax: h.incomeTax || 0,
      yearEnd: h.yearEndAdjustment || 0,
      resident: emp.residentTax || 0,
      other: 0, // ⑪その他
      deductionTotal: h.deductionGrandTotal || 0,
      net: h.netPay || 0
    };
  };

  const createEmptyRow = () => ({
    t1: 0, t2: 0, taxableSum: 0, nonTaxable: 0, gross: 0,
    health: 0, welfare: 0, employ: 0, socialSub: 0, afterSocial: 0,
    dependents: 0, incomeTax: 0, yearEnd: 0, resident: 0, other: 0, deductionTotal: 0, net: 0
  });

  // 2. 月次集計表
  const summaryReport = useMemo(() => {
    const records = history.filter(h => h.month === targetMonth);
    const details = records.map(calculateAggregateRow);
    const totals = createEmptyRow();
    const categories = {
      director: { ...createEmptyRow(), label: '1 役員報酬' },
      labor: { ...createEmptyRow(), label: '2 労務費（原価）' },
      salary: { ...createEmptyRow(), label: '3 給与' }
    };
    details.forEach(d => {
      Object.keys(totals).forEach(k => { if(k!=='label') (totals as any)[k] += (d as any)[k]; });
      const catKey = d.type === 'director' ? 'director' : (d.type === 'regular' ? 'labor' : 'salary');
      Object.keys(categories[catKey]).forEach(k => { if(k!=='label') (categories[catKey] as any)[k] += (d as any)[k]; });
    });
    return { details, totals, categories: Object.values(categories) };
  }, [history, targetMonth]);

  // 3. 個人別月別推移表
  const fullTrendReport = useMemo(() => {
    const empData = employees.map(emp => {
      const monthly = months.map(m => {
        const h = history.find(record => record.month === m && record.employee.id === emp.id);
        return {
          taxable: h ? h.taxableTotal : 0,
          nonTaxable: h ? h.nonTaxableTotal + h.nonTaxableAdjustment : 0,
          total: h ? h.grossPay : 0
        };
      });
      const annual = monthly.reduce((acc, curr) => ({
        taxable: acc.taxable + curr.taxable,
        nonTaxable: acc.nonTaxable + curr.nonTaxable,
        total: acc.total + curr.total
      }), { taxable: 0, nonTaxable: 0, total: 0 });
      return { emp, monthly, annual };
    });
    return { empData };
  }, [history, employees, months]);

  // 4. 推移表(会社合計)
  const companyTrend = useMemo(() => {
    const monthlySummary = months.map(m => {
      const mRecs = history.filter(h => h.month === m);
      const row = { ...createEmptyRow(), month: m };
      mRecs.forEach(h => {
        const d = calculateAggregateRow(h);
        Object.keys(row).forEach(k => { if(k!=='month') (row as any)[k] += (d as any)[k]; });
      });
      return row;
    });
    const annualTotal = monthlySummary.reduce((acc, curr) => {
      Object.keys(acc).forEach(k => { if(k!=='month') (acc as any)[k] += (curr as any)[k]; });
      return acc;
    }, { ...monthlySummary[0], month: '合計' });
    return { monthlySummary, annualTotal };
  }, [history, months]);

  // 5. 源泉徴収簿 (年度・個人詳細)
  const ledgerReport = useMemo(() => {
    const empMaster = employees.find(e => e.id === selectedEmpId);
    if (!empMaster) return null;
    const monthly = months.map(m => {
      const h = history.find(record => record.month === m && record.employee.id === empMaster.id);
      if (!h) return { ...createEmptyRow(), month: m };
      return { ...calculateAggregateRow(h), month: m };
    });
    const annualTotal = monthly.reduce((acc, curr) => {
      Object.keys(acc).forEach(k => { if(k!=='month') (acc as any)[k] += (curr as any)[k]; });
      return acc;
    }, { ...monthly[0], month: '合計' });
    return { emp: empMaster, monthly, annualTotal };
  }, [history, selectedEmpId, months, employees]);

  const formatNeg = (n: any) => {
    const val = n || 0;
    return val < 0 ? `▲ ${Math.abs(val).toLocaleString()}` : val.toLocaleString();
  };

  // CSVダウンロードロジック
  const downloadCSV = () => {
    let csvContent = "";
    let fileName = "report.csv";

    if (activeReport === 'list') {
      fileName = `給与支給控除一覧_${targetMonth}.csv`;
      const header = ["項目", ...listReport.records.map(r => r.employee.name), "合計"];
      csvContent += header.join(",") + "\n";
      allPayrollItems.forEach(row => {
        const line = [
          row.label,
          ...listReport.records.map(r => getRecordVal(r, row.key)),
          listReport.records.reduce((acc, r) => acc + getRecordVal(r, row.key), 0)
        ];
        csvContent += line.join(",") + "\n";
      });
    } else if (activeReport === 'summary') {
      fileName = `月次集計表_${targetMonth}.csv`;
      const header = ["氏名", "区分", "①課税総支給", "②各種手当", "③支給計", "④非課税", "⑤支給合計", "健康", "厚生", "雇用", "社保計", "所得税", "年調", "住民税", "控除計", "実際支給額"];
      csvContent += header.join(",") + "\n";
      summaryReport.details.forEach(d => {
        const line = [d.name, d.type, d.t1, d.t2, d.taxableSum, d.nonTaxable, d.gross, d.health, d.welfare, d.employ, d.socialSub, d.incomeTax, d.yearEnd, d.resident, d.deductionTotal, d.net];
        csvContent += line.join(",") + "\n";
      });
      const t = summaryReport.totals;
      csvContent += ["合計", "", t.t1, t.t2, t.taxableSum, t.nonTaxable, t.gross, t.health, t.welfare, t.employ, t.socialSub, t.incomeTax, t.yearEnd, t.resident, t.deductionTotal, t.net].join(",") + "\n";
    } else if (activeReport === 'trend') {
      fileName = `個人別推移表_${targetYear}.csv`;
      const header = ["氏名", ...months.map(m => m + " (課税)"), ...months.map(m => m + " (非課税)"), ...months.map(m => m + " (合計)"), "年間合計"];
      csvContent += header.join(",") + "\n";
      fullTrendReport.empData.forEach(d => {
        const line = [
          d.emp.name,
          ...d.monthly.map(m => m.taxable),
          ...d.monthly.map(m => m.nonTaxable),
          ...d.monthly.map(m => m.total),
          d.annual.total
        ];
        csvContent += line.join(",") + "\n";
      });
    } else if (activeReport === 'company_trend') {
      fileName = `会社合計推移_${targetYear}.csv`;
      const header = ["月", "①総支給", "②各種手当", "③支給計", "④非課税", "⑤支給合計", "健康", "厚生", "雇用", "社保計", "所得税", "年調", "住民税", "控除計", "実際支給額"];
      csvContent += header.join(",") + "\n";
      companyTrend.monthlySummary.forEach(row => {
        const line = [row.month, row.t1, row.t2, row.taxableSum, row.nonTaxable, row.gross, row.health, row.welfare, row.employ, row.socialSub, row.incomeTax, row.yearEnd, row.resident, row.deductionTotal, row.net];
        csvContent += line.join(",") + "\n";
      });
      const at = companyTrend.annualTotal;
      csvContent += ["年間合計", at.t1, at.t2, at.taxableSum, at.nonTaxable, at.gross, at.health, at.welfare, at.employ, at.socialSub, at.incomeTax, at.yearEnd, at.resident, at.deductionTotal, at.net].join(",") + "\n";
    } else if (activeReport === 'ledger') {
      const emp = employees.find(e => e.id === selectedEmpId);
      fileName = `源泉徴収簿_${emp?.name}_${targetYear}.csv`;
      const header = ["月", "①総支給", "②各種手当", "③支給計", "④非課税", "⑤支給合計", "健康", "厚生", "雇用", "社保計", "所得税", "年調", "住民税", "控除計", "実際支給額"];
      csvContent += header.join(",") + "\n";
      ledgerReport?.monthly.forEach(row => {
        const line = [row.month, row.t1, row.t2, row.taxableSum, row.nonTaxable, row.gross, row.health, row.welfare, row.employ, row.socialSub, row.incomeTax, row.yearEnd, row.resident, row.deductionTotal, row.net];
        csvContent += line.join(",") + "\n";
      });
      const lat = ledgerReport?.annualTotal;
      if (lat) csvContent += ["合計", lat.t1, lat.t2, lat.taxableSum, lat.nonTaxable, lat.gross, lat.health, lat.welfare, lat.employ, lat.socialSub, lat.incomeTax, lat.yearEnd, lat.resident, lat.deductionTotal, lat.net].join(",") + "\n";
    }

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-6 ${activeReport === 'attendance' ? 'print-portrait' : 'print-landscape'} print:p-0`}>
      <div className="no-print grid grid-cols-5 gap-3 bg-white p-4 rounded-3xl border shadow-sm">
        {[
          { id: 'list', label: '① 支給控除一覧', icon: Table, desc: '全項目表示・特定月' },
          { id: 'summary', label: '② 月次集計表', icon: BarChart3, desc: 'カテゴリ別・特定月' },
          { id: 'trend', label: '③ 個人推移表', icon: TrendingUp, desc: '従業員別の年推移' },
          { id: 'company_trend', label: '④ 会社合計推移', icon: Files, desc: '会社全体の月別推移' },
          { id: 'ledger', label: '⑤ 源泉徴収簿', icon: History, desc: '個人別の年間記録' },
          { id: 'attendance', label: '⑥ 勤怠表出力', icon: ClipboardList, desc: '月別の勤怠詳細' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveReport(t.id as ReportType)} className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all ${activeReport === t.id ? 'bg-emerald-600 text-white border-transparent shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-100'}`}>
            <div className="flex items-center gap-2 font-bold mb-1 text-xs"><t.icon size={16} />{t.label}</div>
            <span className="text-[9px] opacity-70 leading-tight">{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="no-print flex justify-between items-end bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex gap-6">
          {(activeReport === 'list' || activeReport === 'summary' || activeReport === 'attendance') ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">表示対象月</label>
              <input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="border-2 border-gray-100 rounded-xl px-4 py-2 font-bold outline-none" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">表示対象年度</label>
              <select value={targetYear} onChange={e => setTargetYear(e.target.value)} className="border-2 border-gray-100 rounded-xl px-4 py-2 font-bold outline-none">
                {['2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}年度</option>)}
              </select>
            </div>
          )}
          {(activeReport === 'ledger' || activeReport === 'attendance') && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">従業員選択</label>
              <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-2 bg-white">
                <Search size={16} className="text-gray-400" />
                <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} className="bg-transparent font-bold outline-none min-w-[200px]">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.employeeCode}: {emp.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveReport('attendance')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-sm transition-all border-2 ${activeReport === 'attendance' ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-100'}`}
          >
            <ClipboardList size={20}/> 勤怠表を表示
          </button>
          <button onClick={downloadCSV} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all">
            <Download size={20}/> CSV出力
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:bg-black transition-all">
            <Printer size={20}/> 印刷/PDF保存
          </button>
          {(activeReport === 'list' || activeReport === 'summary' || activeReport === 'attendance') && (
            <button 
              onClick={() => onDeleteMonth(targetMonth)}
              className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 border-2 border-red-100 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all"
              title="この月の全データを削除"
            >
              <Trash2 size={20}/>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm p-4 min-h-[1000px] overflow-x-auto custom-scrollbar print:p-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* ① 給与支給控除一覧 */}
        {activeReport === 'list' && (
          <div className="w-full">
            <h2 className="text-base font-black mb-2 border-b-2 border-gray-900 pb-1 flex justify-between items-end">
              <span>給与支給控除一覧表 ({targetMonth})</span>
              <span className="text-[8px] font-bold text-gray-400">株式会社リキッドブロック</span>
            </h2>
            <table className="w-full text-[6.5pt] border-collapse leading-tight print-dense-table">
                <thead>
                  <tr className="bg-gray-50 text-center">
                    <th className="border border-gray-400 p-0.5 text-left w-20">項目</th>
                    {listReport.records.map(r => <th key={r.id} className="border border-gray-400 p-0.5 min-w-[55px]">{r.employee.name}</th>)}
                    <th className="border border-gray-400 p-0.5 w-24 bg-emerald-50 font-bold">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayrollItems.map((row, idx) => (
                    <tr key={idx} className={row.isHighlight ? 'bg-emerald-50/20 font-bold' : ''}>
                      <td className={`border border-gray-400 p-0.5 bg-gray-50/50 ${row.isBold ? 'font-bold' : ''}`}>{row.label}</td>
                      {listReport.records.map(r => (
                        <td key={r.id} className={`border border-gray-400 p-0.5 text-right font-mono ${row.isBold ? 'font-bold' : ''}`}>
                        {safeFormat(getRecordVal(r, row.key))}
                      </td>
                    ))}
                    <td className="border border-gray-400 p-0.5 text-right font-mono font-bold bg-emerald-50">
                      {safeFormat(listReport.records.reduce((acc, r) => acc + getRecordVal(r, row.key), 0))}
                    </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        )}

        {/* ② 月次集計表 (特定月、カテゴリ別集計付) - これが基準 */}
        {activeReport === 'summary' && (
          <div className="w-full">
            <h2 className="text-sm font-black mb-4 border-b-2 border-gray-900 pb-1">月次給与集計表 ({targetMonth.replace('-','/')}分)</h2>
            <table className="w-full text-[6pt] border-collapse text-right leading-normal">
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-gray-400 p-1 w-20" rowSpan={2}>受給者氏名</th>
                  <th className="border border-gray-400 p-1" colSpan={3}>支給額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>④諸手当<br/>(非課税)</th>
                  <th className="border border-gray-400 p-1 bg-emerald-50" rowSpan={2}>⑤支給合計<br/>(③+④)</th>
                  <th className="border border-gray-400 p-1" colSpan={4}>⑥社会保険料等控除額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑦控除後<br/>給与額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>扶養<br/>人数</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑧所得税</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑨年調</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑩住民税</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑪その他</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑫控除合計</th>
                  <th className="border border-gray-400 p-1 bg-blue-50 font-bold" rowSpan={2}>⑬実際支給額<br/>(⑤-⑫)</th>
                </tr>
                <tr className="bg-gray-50 text-center text-[5.5pt]">
                  <th className="border border-gray-400 p-1">①課税総支給</th>
                  <th className="border border-gray-400 p-1">②各種手当</th>
                  <th className="border border-gray-400 p-1">③支給計</th>
                  <th className="border border-gray-400 p-1">健康</th>
                  <th className="border border-gray-400 p-1">厚生</th>
                  <th className="border border-gray-400 p-1">雇用</th>
                  <th className="border border-gray-400 p-1">小計</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {summaryReport.details.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50 h-7">
                    <td className="border border-gray-400 p-1 font-bold font-sans text-left">{i+1} {d.name}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(d.t1)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(d.t2)}</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(d.taxableSum)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(d.nonTaxable)}</td>
                    <td className="border border-gray-400 p-1 bg-emerald-50/20 font-bold">{safeFormat(d.gross)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(d.health)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(d.welfare)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(d.employ)}</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(d.socialSub)}</td>
                    <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(d.afterSocial)}</td>
                    <td className="border border-gray-400 p-1 font-sans">{d.dependents}</td>
                    <td className="border border-gray-400 p-1 text-red-600">{safeFormat(d.incomeTax)}</td>
                    <td className="border border-gray-400 p-1">{formatNeg(d.yearEnd)}</td>
                    <td className="border border-gray-400 p-1 text-red-600">{safeFormat(d.resident)}</td>
                    <td className="border border-gray-400 p-1">0</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(d.deductionTotal)}</td>
                    <td className="border border-gray-400 p-1 font-black bg-blue-50/20 text-emerald-800">¥{safeFormat(d.net)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold h-8">
                  <td className="border border-gray-400 p-1 text-center font-sans">合計</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.t1)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.t2)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.taxableSum)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.nonTaxable)}</td>
                  <td className="border border-gray-400 p-1 bg-emerald-100">{safeFormat(summaryReport.totals.gross)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.health)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.welfare)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.employ)}</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(summaryReport.totals.socialSub)}</td>
                  <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(summaryReport.totals.afterSocial)}</td>
                  <td className="border border-gray-400 p-1 font-sans">-</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.incomeTax)}</td>
                  <td className="border border-gray-400 p-1">{formatNeg(summaryReport.totals.yearEnd)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(summaryReport.totals.resident)}</td>
                  <td className="border border-gray-400 p-1">0</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(summaryReport.totals.deductionTotal)}</td>
                  <td className="border border-gray-400 p-1 bg-blue-100 font-bold">¥{safeFormat(summaryReport.totals.net)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-8 space-y-2">
              <h3 className="text-[8pt] font-black border-l-4 border-emerald-600 pl-2">区分別集計</h3>
              <table className="w-full text-[6pt] border-collapse text-right">
                <thead>
                  <tr className="bg-gray-100 font-bold text-center">
                    <th className="border border-gray-400 p-1 w-20">区分</th>
                    <th className="border border-gray-400 p-1">①課税総支給</th>
                    <th className="border border-gray-400 p-1">②各種手当</th>
                    <th className="border border-gray-400 p-1">③支給計</th>
                    <th className="border border-gray-400 p-1">④非課税</th>
                    <th className="border border-gray-400 p-1 bg-emerald-50">⑤支給合計</th>
                    <th className="border border-gray-400 p-1">⑥社保計</th>
                    <th className="border border-gray-400 p-1">⑧所得税</th>
                    <th className="border border-gray-400 p-1">⑩住民税</th>
                    <th className="border border-gray-400 p-1 bg-blue-50 font-bold">実際支給額</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {summaryReport.categories.map((c, i) => (
                    <tr key={i} className="h-7 hover:bg-gray-50">
                      <td className="border border-gray-400 p-1 text-left font-bold font-sans">{c.label}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.t1)}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.t2)}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.taxableSum)}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.nonTaxable)}</td>
                      <td className="border border-gray-400 p-1 bg-emerald-50/10">{safeFormat(c.gross)}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.socialSub)}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.incomeTax)}</td>
                      <td className="border border-gray-400 p-1">{safeFormat(c.resident)}</td>
                      <td className="border border-gray-400 p-1 bg-blue-50/10 font-bold">¥{safeFormat(c.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ③ 個人別月別推移表 */}
        {activeReport === 'trend' && (
          <div className="w-full">
            <h2 className="text-base font-black mb-1 border-b-2 border-gray-900 pb-1 flex justify-between items-end">
              <span>給与支給状況（個人別月別推移表） - {targetYear}年度</span>
              <span className="text-[8px] font-bold text-gray-400">株式会社リキッドブロック</span>
            </h2>
            <div className="flex gap-4 text-[6pt] mb-2 font-bold no-print">
               <span className="text-emerald-700">① 課税支給合計</span>
               <span className="text-blue-700">② 通勤/非課税合計</span>
               <span className="text-black">③ 支給総額</span>
            </div>
            <table className="w-full text-[5.5pt] border-collapse leading-tight text-right print-dense-table">
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-gray-400 p-1 w-16" rowSpan={2}>受給者氏名</th>
                  {months.map((m, i) => <th key={m} className="border border-gray-400 p-1 min-w-[32px]">{i + 1}月</th>)}
                  <th className="border border-gray-400 p-1 w-24 bg-emerald-50" rowSpan={2}>年間合計</th>
                </tr>
                <tr className="bg-gray-50 text-[4pt] text-gray-400">
                  {months.map(m => <th key={m} className="border border-gray-400 p-0.5 font-normal">①②③</th>)}
                </tr>
              </thead>
              <tbody className="font-mono">
                {fullTrendReport.empData.map((data, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-400 p-1 text-left font-sans font-bold whitespace-nowrap">{data.emp.name}</td>
                    {data.monthly.map((val, mIdx) => (
                      <td key={mIdx} className="border border-gray-400 p-1 align-top">
                        <div className="text-emerald-700">{safeFormat(val.taxable)}</div>
                        <div className="text-blue-700">{safeFormat(val.nonTaxable)}</div>
                        <div className="font-bold border-t border-gray-100 mt-0.5 pt-0.5">{safeFormat(val.total)}</div>
                      </td>
                    ))}
                    <td className="border border-gray-400 p-1 bg-emerald-50 align-top">
                      <div className="text-emerald-700 font-bold">{safeFormat(data.annual.taxable)}</div>
                      <div className="text-blue-700">{safeFormat(data.annual.nonTaxable)}</div>
                      <div className="font-black text-black border-t-2 border-emerald-200 mt-0.5 pt-0.5">{safeFormat(data.annual.total)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ④ 推移表(会社合計) - 月次集計のデザインと一致させる */}
        {activeReport === 'company_trend' && (
          <div className="w-full">
            <h2 className="text-sm font-black mb-4 border-b-2 border-gray-900 pb-1 flex justify-between items-end">
              <span>給与支給状況（会社合計月別推移表） - {targetYear}年度</span>
              <span className="text-[8px] font-bold text-gray-400">株式会社リキッドブロック</span>
            </h2>
            <table className="w-full text-[6pt] border-collapse text-right leading-normal">
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-gray-400 p-1 w-12" rowSpan={2}>月区分</th>
                  <th className="border border-gray-400 p-1" colSpan={3}>支給額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>④諸手当<br/>(非課税)</th>
                  <th className="border border-gray-400 p-1 bg-emerald-50" rowSpan={2}>⑤支給合計<br/>(③+④)</th>
                  <th className="border border-gray-400 p-1" colSpan={4}>⑥社会保険料等控除額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑦控除後<br/>給与額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>扶養<br/>人数</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑧所得税</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑨年調</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑩住民税</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑪その他</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑫控除合計</th>
                  <th className="border border-gray-400 p-1 bg-blue-50 font-bold" rowSpan={2}>⑬実際支給額<br/>(⑤-⑫)</th>
                </tr>
                <tr className="bg-gray-50 text-center text-[5.5pt]">
                  <th className="border border-gray-400 p-1">①課税総支給</th>
                  <th className="border border-gray-400 p-1">②各種手当</th>
                  <th className="border border-gray-400 p-1">③支給計</th>
                  <th className="border border-gray-400 p-1">健康</th>
                  <th className="border border-gray-400 p-1">厚生</th>
                  <th className="border border-gray-400 p-1">雇用</th>
                  <th className="border border-gray-400 p-1">小計</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {companyTrend.monthlySummary.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 h-8">
                    <td className="border border-gray-400 p-1 text-center font-sans bg-gray-50 font-bold">{i+1}月合計</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.t1)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.t2)}</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(row.taxableSum)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.nonTaxable)}</td>
                    <td className="border border-gray-400 p-1 bg-emerald-50/20 font-bold">{safeFormat(row.gross)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.health)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.welfare)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.employ)}</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(row.socialSub)}</td>
                    <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(row.afterSocial)}</td>
                    <td className="border border-gray-400 p-1 font-sans">{row.dependents || '-'}</td>
                    <td className="border border-gray-400 p-1 text-red-600">{safeFormat(row.incomeTax)}</td>
                    <td className="border border-gray-400 p-1">{formatNeg(row.yearEnd)}</td>
                    <td className="border border-gray-400 p-1 text-red-600">{safeFormat(row.resident)}</td>
                    <td className="border border-gray-400 p-1">0</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(row.deductionTotal)}</td>
                    <td className="border border-gray-400 p-1 font-black bg-blue-50/20 text-emerald-800">¥{safeFormat(row.net)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold h-10">
                  <td className="border border-gray-400 p-1 text-center font-sans">年間合計</td>
                  <td className="border border-gray-400 p-1">{safeFormat(companyTrend.annualTotal.t1)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(companyTrend.annualTotal.t2)}</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(companyTrend.annualTotal.taxableSum)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(companyTrend.annualTotal.nonTaxable)}</td>
                  <td className="border border-gray-400 p-1 bg-emerald-100">{safeFormat(companyTrend.annualTotal.gross)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(companyTrend.annualTotal.health)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(companyTrend.annualTotal.welfare)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(companyTrend.annualTotal.employ)}</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(companyTrend.annualTotal.socialSub)}</td>
                  <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(companyTrend.annualTotal.afterSocial)}</td>
                  <td className="border border-gray-400 p-1 font-sans">-</td>
                  <td className="border border-gray-400 p-1 text-red-600">{safeFormat(companyTrend.annualTotal.incomeTax)}</td>
                  <td className="border border-gray-400 p-1">{formatNeg(companyTrend.annualTotal.yearEnd)}</td>
                  <td className="border border-gray-400 p-1 text-red-600">{safeFormat(companyTrend.annualTotal.resident)}</td>
                  <td className="border border-gray-400 p-1">0</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(companyTrend.annualTotal.deductionTotal)}</td>
                  <td className="border border-gray-400 p-1 bg-blue-100 font-bold">¥{safeFormat(companyTrend.annualTotal.net)}</td>
                </tr>
              </tbody>
            </table>
            
            <div className="mt-8 grid grid-cols-2 gap-10 text-[7pt]">
              <div>
                <h3 className="font-bold border-b mb-2">（年末調整基礎数値・会社全体）</h3>
                <div className="space-y-1">
                  <div className="flex justify-between border-b pb-1"><span>給料・手当等合計（①＋②）</span><span className="font-mono">¥{safeFormat(companyTrend.annualTotal.taxableSum)}</span></div>
                  <div className="flex justify-between border-b pb-1"><span>賞与等合計</span><span className="font-mono">¥0</span></div>
                  <div className="flex justify-between border-b pb-1 font-black"><span>給与等の年間合計</span><span className="font-mono">¥{safeFormat(companyTrend.annualTotal.taxableSum)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ⑤ 源泉徴収簿 - 月次集計のデザインと完全に一致させる */}
        {activeReport === 'ledger' && ledgerReport && (
          <div className="w-full px-[5mm] py-[5mm]">
            <h2 className="text-sm font-black mb-4 border-b-2 border-gray-900 pb-1 flex justify-between items-end">
              <span>令和{Number(targetYear)-2018}年分 給与支給状況（月別推移表・個人別）</span>
              <span className="text-[10pt] font-black underline">受給者氏名： {ledgerReport.emp.name} 様</span>
              <span className="text-[8px] font-bold text-gray-400">会社名：株式会社リキッドブロック</span>
            </h2>
            <table className="w-full text-[6pt] border-collapse text-right leading-normal">
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-gray-400 p-1 w-10" rowSpan={2}>月区分</th>
                  <th className="border border-gray-400 p-1" colSpan={3}>支給額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>④諸手当<br/>(非課税)</th>
                  <th className="border border-gray-400 p-1 bg-emerald-50" rowSpan={2}>⑤支給合計<br/>(③+④)</th>
                  <th className="border border-gray-400 p-1" colSpan={4}>⑥社会保険料等控除額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑦控除後<br/>給与額</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>扶養<br/>人数</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑧所得税</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑨年調</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑩住民税</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑪その他</th>
                  <th className="border border-gray-400 p-1" rowSpan={2}>⑫控除合計</th>
                  <th className="border border-gray-400 p-1 bg-blue-50 font-bold" rowSpan={2}>⑬実際支給額<br/>(⑤-⑫)</th>
                </tr>
                <tr className="bg-gray-50 text-center text-[5.5pt]">
                  <th className="border border-gray-400 p-1">①課税総支給</th>
                  <th className="border border-gray-400 p-1">②各種手当</th>
                  <th className="border border-gray-400 p-1">③支給計</th>
                  <th className="border border-gray-400 p-1">健康</th>
                  <th className="border border-gray-400 p-1">厚生</th>
                  <th className="border border-gray-400 p-1">雇用</th>
                  <th className="border border-gray-400 p-1">小計</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {ledgerReport.monthly.map((row, i) => (
                  <tr key={i} className="h-8 hover:bg-gray-50 transition-colors">
                    <td className="border border-gray-400 p-1 text-center font-sans bg-gray-50 font-bold">{i+1}</td>
                    <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(row.t1)}</td>
                    <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(row.t2)}</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(row.taxableSum)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.nonTaxable)}</td>
                    <td className="border border-gray-400 p-1 bg-emerald-50/20 font-bold">{safeFormat(row.gross)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.health)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.welfare)}</td>
                    <td className="border border-gray-400 p-1">{safeFormat(row.employ)}</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(row.socialSub)}</td>
                    <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(row.afterSocial)}</td>
                    <td className="border border-gray-400 p-1 font-sans">{row.dependents || '-'}</td>
                    <td className="border border-gray-400 p-1 text-red-600">{safeFormat(row.incomeTax)}</td>
                    <td className="border border-gray-400 p-1">{formatNeg(row.yearEnd)}</td>
                    <td className="border border-gray-400 p-1 text-red-600">{safeFormat(row.resident)}</td>
                    <td className="border border-gray-400 p-1">0</td>
                    <td className="border border-gray-400 p-1 font-bold">{safeFormat(row.deductionTotal)}</td>
                    <td className="border border-gray-400 p-1 font-black bg-blue-50/20 text-emerald-800">¥{safeFormat(row.net)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 font-bold h-10">
                  <td className="border border-gray-400 p-1 text-center font-sans">年間合計</td>
                  <td className="border border-gray-400 p-1">{safeFormat(ledgerReport.annualTotal.t1)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(ledgerReport.annualTotal.t2)}</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(ledgerReport.annualTotal.taxableSum)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(ledgerReport.annualTotal.nonTaxable)}</td>
                  <td className="border border-gray-400 p-1 bg-emerald-100 font-bold">{safeFormat(ledgerReport.annualTotal.gross)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(ledgerReport.annualTotal.health)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(ledgerReport.annualTotal.welfare)}</td>
                  <td className="border border-gray-400 p-1">{safeFormat(ledgerReport.annualTotal.employ)}</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(ledgerReport.annualTotal.socialSub)}</td>
                  <td className="border border-gray-400 p-1 text-gray-400">{safeFormat(ledgerReport.annualTotal.afterSocial)}</td>
                  <td className="border border-gray-400 p-1 font-sans">-</td>
                  <td className="border border-gray-400 p-1 text-red-600">{safeFormat(ledgerReport.annualTotal.incomeTax)}</td>
                  <td className="border border-gray-400 p-1">{formatNeg(ledgerReport.annualTotal.yearEnd)}</td>
                  <td className="border border-gray-400 p-1 text-red-600">{safeFormat(ledgerReport.annualTotal.resident)}</td>
                  <td className="border border-gray-400 p-1">0</td>
                  <td className="border border-gray-400 p-1 font-bold">{safeFormat(ledgerReport.annualTotal.deductionTotal)}</td>
                  <td className="border border-gray-400 p-1 bg-blue-100 font-bold text-emerald-800">¥{safeFormat(ledgerReport.annualTotal.net)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-8 grid grid-cols-2 gap-10">
              <div>
                <h3 className="text-[7pt] font-black border-l-4 border-gray-900 pl-2">（年末調整基礎数値）</h3>
                <div className="border border-gray-400 rounded-lg overflow-hidden mt-2">
                  <table className="w-full text-[6.5pt] border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="bg-gray-50 p-2 font-bold w-48 border-r">給料・手当等合計（①＋②）</td>
                        <td className="p-2 text-right font-mono font-bold">¥{safeFormat(ledgerReport.annualTotal.taxableSum)}</td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="bg-gray-50 p-2 font-bold border-r">賞与等合計</td>
                        <td className="p-2 text-right font-mono">¥0</td>
                      </tr>
                      <tr className="bg-emerald-50">
                        <td className="p-2 font-black border-r border-gray-300">給与等の年間合計</td>
                        <td className="p-2 text-right font-mono font-black text-[7.5pt]">¥{safeFormat(ledgerReport.annualTotal.taxableSum)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="text-[7pt] font-black border-l-4 border-gray-900 pl-2">（社会保険料等）</h3>
                <div className="border border-gray-400 rounded-lg overflow-hidden mt-2">
                  <table className="w-full text-[6.5pt] border-collapse">
                    <tbody>
                      <tr className="h-20 align-top">
                        <td className="bg-gray-50 p-2 font-bold w-48 border-r border-gray-400">給与からの社会保険料等の控除合計</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700 text-[8pt]">¥{safeFormat(ledgerReport.annualTotal.socialSub)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ⑥ 勤怠表出力 */}
        {activeReport === 'attendance' && (
          <div className="w-full">
            {history.find(h => h.month === targetMonth && h.employee.id === selectedEmpId) ? (
              <div className="space-y-6">
                <AttendanceSheetView record={history.find(h => h.month === targetMonth && h.employee.id === selectedEmpId)!} />
                
                {/* Debug Logs */}
                {history.find(h => h.month === targetMonth && h.employee.id === selectedEmpId)?.debugLogs && (
                  <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[30px] no-print mx-auto w-full max-w-[210mm]">
                    <h4 className="text-red-800 font-bold text-sm mb-3 flex items-center gap-2">
                      <Calculator size={16} />
                      計算デバッグログ (管理者用)
                    </h4>
                    <ul className="space-y-1">
                      {history.find(h => h.month === targetMonth && h.employee.id === selectedEmpId)?.debugLogs?.map((log, i) => (
                        <li key={i} className="text-[10px] text-red-600 font-mono flex items-start gap-2">
                          <span className="opacity-50">•</span>
                          {log}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ClipboardList size={48} className="mb-4 opacity-20" />
                <p className="font-bold">該当する勤怠データが見つかりません</p>
                <p className="text-xs">対象月と従業員を正しく選択してください</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingView;
