
import React, { useState, useMemo } from 'react';
import { PayrollHistoryRecord, Employee } from '../types';
import { History, Search, Trash2, ExternalLink, AlertTriangle, Printer } from 'lucide-react';

interface Props {
  history: PayrollHistoryRecord[];
  setHistory: (history: PayrollHistoryRecord[]) => void;
  employees: Employee[];
  onViewPayslip: (record: PayrollHistoryRecord) => void;
  onViewBulkPayslip: (records: PayrollHistoryRecord[]) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMonth: (month: string) => void;
}

const HistoryManager: React.FC<Props> = ({ history, setHistory, employees, onViewPayslip, onViewBulkPayslip, onDeleteRecord, onDeleteMonth }) => {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterName, setFilterName] = useState('');

  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.filter(h => {
      const matchMonth = filterMonth ? h.month === filterMonth : true;
      const matchName = filterName ? (h.employee.name.includes(filterName) || h.employee.employeeCode.includes(filterName)) : true;
      return matchMonth && matchName;
    }).sort((a, b) => b.month.localeCompare(a.month) || a.employee.employeeCode.localeCompare(b.employee.employeeCode));
  }, [history, filterMonth, filterName]);

  const handleDelete = (id: string) => {
    onDeleteRecord(id);
  };

  const handleBulkDeleteMonth = () => {
    if (!filterMonth) return;
    onDeleteMonth(filterMonth);
  };

  const handleBulkPrint = () => {
    if (filteredHistory.length === 0) return;
    onViewBulkPayslip(filteredHistory);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800"><History className="text-emerald-600" />個人別給与履歴</h2>
        {filterMonth && filteredHistory.length > 0 && (
          <button 
            onClick={handleBulkPrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100 text-sm"
          >
            <Printer size={18} /> この月の明細を一括表示/印刷
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between no-print gap-4">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="名前で検索..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
            </div>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border rounded-xl px-4 py-2 text-sm outline-none font-bold" />
          </div>
          {filterMonth && (
            <button onClick={handleBulkDeleteMonth} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all">
              <AlertTriangle size={14} /> この月の全データを削除
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b">
              <tr>
                <th className="p-4">対象月</th>
                <th className="p-4">従業員</th>
                <th className="p-4 text-right">支給額</th>
                <th className="p-4 text-right font-bold text-emerald-700">差引支給額</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredHistory.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold">{h.month.replace('-', '/')}</td>
                  <td className="p-4 font-bold">{h.employee.name} <span className="text-[10px] text-gray-400 ml-2">{h.employee.employeeCode}</span></td>
                  <td className="p-4 text-right font-mono">¥{(h.grossPay || 0).toLocaleString()}</td>
                  <td className="p-4 text-right font-bold text-emerald-600 font-mono">¥{(h.netPay || 0).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onViewPayslip(h)} className="flex items-center gap-1 px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white shadow-sm transition-all"><ExternalLink size={14}/> 明細表示</button>
                      <button onClick={() => handleDelete(h.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (<tr><td colSpan={5} className="p-32 text-center text-gray-300 italic">履歴データがありません</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryManager;
