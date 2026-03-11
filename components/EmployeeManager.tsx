
import React, { useState, useMemo } from 'react';
import { Employee, Dependent, HistoryRecord } from '../types';
import { UserPlus, Edit2, Trash2, X, Save, ChevronUp, ChevronDown, CheckSquare, Square, RefreshCcw, User, Briefcase, Users as UsersIcon, Plus, Minus, History, Calendar } from 'lucide-react';

interface Props {
  employees: Employee[];
  setEmployees: (emps: Employee[]) => void;
}

const FieldCard: React.FC<{
  label: string;
  value: number | string;
  onChange: (val: any) => void;
  type?: 'number' | 'text';
  history?: HistoryRecord[];
  onHistoryChange?: (h: HistoryRecord[]) => void;
  rightElement?: React.ReactNode;
  prefix?: string;
  className?: string;
  bg?: string;
}> = ({ label, value, onChange, type = 'number', history, onHistoryChange, rightElement, prefix, className, bg = "bg-white" }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className={`${bg} border border-gray-100 rounded-2xl p-5 shadow-sm transition-all ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">{label}</label>
        <div className="flex flex-col items-end gap-1">
          {rightElement}
          {history && onHistoryChange && (
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1 px-2 py-1 border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors text-[10px] font-bold whitespace-nowrap"
            >
              <History size={12} />
              履歴
              <ChevronDown size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{prefix}</span>}
        <input 
          type={type} 
          value={value} 
          onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          className={`w-full border border-gray-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${prefix ? 'pl-9' : ''}`}
        />
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <History size={20} />
                </div>
                <h4 className="font-bold text-gray-800">{label} の変更履歴</h4>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">過去の適用期間と金額を設定してください。</p>
                <button 
                  onClick={() => {
                    const newRecord: HistoryRecord = {
                      startMonth: new Date().toISOString().substring(0, 7),
                      endMonth: '9999-12',
                      amount: Number(value) || 0
                    };
                    onHistoryChange([newRecord, ...history].sort((a, b) => b.startMonth.localeCompare(a.startMonth)));
                  }}
                  className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 transition-all"
                >
                  <Plus size={14} /> 履歴を追加
                </button>
              </div>
              {history.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <History size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400 italic">履歴データはありません。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((record, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="col-span-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">開始月</label>
                        <input 
                          type="month" 
                          value={record.startMonth} 
                          onChange={e => {
                            const newHistory = [...history];
                            newHistory[idx] = { ...newHistory[idx], startMonth: e.target.value };
                            onHistoryChange(newHistory);
                          }}
                          className="w-full text-xs border border-gray-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">終了月</label>
                        <input 
                          type="month" 
                          value={record.endMonth === '9999-12' ? '' : record.endMonth} 
                          onChange={e => {
                            const newHistory = [...history];
                            newHistory[idx] = { ...newHistory[idx], endMonth: e.target.value || '9999-12' };
                            onHistoryChange(newHistory);
                          }}
                          className="w-full text-xs border border-gray-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="現在まで"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">金額</label>
                        <input 
                          type="number" 
                          value={record.amount} 
                          onChange={e => {
                            const newHistory = [...history];
                            newHistory[idx] = { ...newHistory[idx], amount: Number(e.target.value) };
                            onHistoryChange(newHistory);
                          }}
                          className="w-full text-xs border border-gray-100 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        />
                      </div>
                      <div className="col-span-1 text-right pt-5">
                        <button onClick={() => onHistoryChange(history.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setIsHistoryOpen(false)} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">履歴を保存して閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeManager: React.FC<Props> = ({ employees, setEmployees }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({ dependents: [] });
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'insurance' | 'dependents' | 'payroll'>('basic');

  const getAge = (birthDate?: string) => {
    if (!birthDate) return "";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return isNaN(age) ? "" : age;
  };

  const openAdd = () => {
    setFormData({
      employeeCode: (employees.length + 1).toString().padStart(6, '0'),
      name: '',
      kanaName: '',
      birthDate: '',
      address: '',
      zipCode: '',
      position: '本社',
      joinDate: new Date().toISOString().split('T')[0],
      entryDate: new Date().toISOString().split('T')[0],
      initialBalance: 0,
      initialMonth: new Date().toISOString().substring(0, 7),
      baseSalary: 0,
      hourlyWage: 0,
      positionAllowance: 0,
      skillAllowance: 0,
      housingAllowance: 0,
      familyAllowance: 0,
      commutingAllowanceTaxable: 0,
      commutingAllowanceNonTaxable: 0,
      healthInsurance: 0,
      nursingInsurance: 0,
      welfarePension: 0,
      residentTax: 0,
      yearEndAdjustment: 0,
      employmentType: 'regular',
      isLaborInsuranceEnrolled: true,
      laborInsuranceJoinDate: '',
      laborInsuranceNo: '',
      pensionNo: '',
      healthInsuranceNo: '',
      spouse: { name: '', isTaxDependent: false },
      dependents: [],
    });
    setEditingId(null);
    setActiveSubTab('basic');
    setIsModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setFormData({ 
      ...emp, 
      spouse: emp.spouse || { name: '', isTaxDependent: false },
      dependents: emp.dependents || [] 
    });
    setEditingId(emp.id);
    setActiveSubTab('basic');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      setEmployees(employees.map(e => e.id === editingId ? { ...e, ...formData } as Employee : e));
    } else {
      setEmployees([...employees, { ...formData, id: crypto.randomUUID() } as Employee]);
    }
    setIsModalOpen(false);
  };

  const addDependent = () => {
    const newDependent: Dependent = { 
      id: crypto.randomUUID(), 
      name: '', 
      relationship: '', 
      birthDate: '',
      isTaxDependent: false,
      isSpecialDisabled: false
    };
    setFormData({ ...formData, dependents: [...(formData.dependents || []), newDependent] });
  };

  const updateDependent = (id: string, field: keyof Dependent, value: any) => {
    setFormData({
      ...formData,
      dependents: (formData.dependents || []).map(d => d.id === id ? { ...d, [field]: value } : d)
    });
  };

  const removeDependent = (id: string) => {
    setFormData({
      ...formData,
      dependents: (formData.dependents || []).filter(d => d.id !== id)
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">従業員マスター管理</h2>
        <button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm">
          <UserPlus size={18} /> 新規従業員追加
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
              <th className="p-4 font-semibold w-24">順序</th>
              <th className="p-4 font-semibold">コード</th>
              <th className="p-4 font-semibold">区分</th>
              <th className="p-4 font-semibold">氏名</th>
              <th className="p-4 font-semibold">役職</th>
              <th className="p-4 font-semibold">基本給</th>
              <th className="p-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp, index) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      const newEmps = [...employees];
                      if (index > 0) {
                        [newEmps[index], newEmps[index-1]] = [newEmps[index-1], newEmps[index]];
                        setEmployees(newEmps);
                      }
                    }} disabled={index === 0} className={`p-1 rounded ${index === 0 ? 'opacity-0' : 'text-gray-400 hover:text-gray-700'}`}><ChevronUp size={18} /></button>
                    <button onClick={() => {
                      const newEmps = [...employees];
                      if (index < employees.length - 1) {
                        [newEmps[index], newEmps[index+1]] = [newEmps[index+1], newEmps[index]];
                        setEmployees(newEmps);
                      }
                    }} disabled={index === employees.length - 1} className={`p-1 rounded ${index === employees.length - 1 ? 'opacity-0' : 'text-gray-400 hover:text-gray-700'}`}><ChevronDown size={18} /></button>
                  </div>
                </td>
                <td className="p-4 text-sm font-mono text-gray-500">{emp.employeeCode}</td>
                <td className="p-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    emp.employmentType === 'part-time' ? 'bg-orange-100 text-orange-700' : 
                    emp.employmentType === 'director' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {emp.employmentType === 'part-time' ? 'アルバイト' : emp.employmentType === 'director' ? '役員' : '正社員'}
                  </span>
                </td>
                <td className="p-4 text-sm font-bold text-gray-800">{emp.name}</td>
                <td className="p-4 text-sm text-gray-600">{emp.position}</td>
                <td className="p-4 text-sm text-gray-600">¥{emp.baseSalary.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                    <button onClick={() => { if(window.confirm('削除しますか？')) setEmployees(employees.filter(e => e.id !== emp.id)) }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold">{editingId ? '従業員情報の編集' : '新規従業員の登録'}</h3>
                <p className="text-xs text-gray-500 mt-1">{formData.name || '名称未設定'} / No.{formData.employeeCode}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white no-print">
              <button onClick={() => setActiveSubTab('basic')} className={`px-8 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'basic' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <User size={16}/>基本情報
              </button>
              <button onClick={() => setActiveSubTab('insurance')} className={`px-8 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'insurance' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <Briefcase size={16}/>労保社保
              </button>
              <button onClick={() => setActiveSubTab('dependents')} className={`px-8 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'dependents' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <UsersIcon size={16}/>扶養者情報
              </button>
              <button onClick={() => setActiveSubTab('payroll')} className={`px-8 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'payroll' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <RefreshCcw size={16}/>計算設定
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {activeSubTab === 'basic' && (
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 flex items-center gap-8 mb-2">
                    <div className="flex gap-3">
                      {['regular', 'part-time', 'director'].map((type) => (
                        <button key={type} onClick={() => setFormData({...formData, employmentType: type as any})} className={`px-6 py-2 rounded-xl text-xs font-bold border-2 transition-all ${formData.employmentType === type ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                          {type === 'regular' ? '正社員' : type === 'part-time' ? 'アルバイト' : '役員'}
                        </button>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => setFormData({...formData, isLaborInsuranceEnrolled: !formData.isLaborInsuranceEnrolled})}
                      className="flex items-center gap-2 group transition-all"
                    >
                      <div className={`p-1 rounded-md transition-all ${formData.isLaborInsuranceEnrolled ? 'text-emerald-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
                        {formData.isLaborInsuranceEnrolled ? <CheckSquare size={24} /> : <Square size={24} />}
                      </div>
                      <span className={`text-sm font-bold ${formData.isLaborInsuranceEnrolled ? 'text-emerald-700' : 'text-gray-400'}`}>雇用保険に加入する</span>
                    </button>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">従業員コード</label>
                    <input type="text" value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} className="w-full border rounded-xl p-3 text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">氏名</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">カナ氏名</label>
                    <input type="text" value={formData.kanaName} onChange={e => setFormData({...formData, kanaName: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">生年月日</label>
                    <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">年齢</label>
                    <div className="border rounded-xl p-3 text-sm bg-gray-50 font-bold">{getAge(formData.birthDate)} 歳</div>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">郵便番号</label>
                    <input type="text" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className="w-full border rounded-xl p-3 text-sm" placeholder="000-0000" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">現住所</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">入社日</label>
                    <input type="date" value={formData.entryDate} onChange={e => setFormData({...formData, entryDate: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">移行時有給残日数</label>
                    <input type="number" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">移行基準月</label>
                    <input type="month" value={formData.initialMonth} onChange={e => setFormData({...formData, initialMonth: e.target.value})} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div className="col-span-6 border-t my-4 pt-6"><h4 className="text-emerald-700 font-bold text-sm">支給・手当設定</h4></div>
                  
                  <FieldCard 
                    label="役職/部署" 
                    value={formData.position || ''} 
                    onChange={v => setFormData({...formData, position: v})} 
                    type="text"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="基本給" 
                    value={formData.baseSalary || 0} 
                    onChange={v => setFormData({...formData, baseSalary: v})} 
                    history={formData.baseSalaryHistory || []}
                    onHistoryChange={h => setFormData({...formData, baseSalaryHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="残業計算用時給" 
                    value={formData.hourlyWage || 0} 
                    onChange={v => setFormData({...formData, hourlyWage: v})} 
                    history={formData.hourlyWageHistory || []}
                    onHistoryChange={h => setFormData({...formData, hourlyWageHistory: h})}
                    bg="bg-emerald-50/30"
                    rightElement={
                      <button 
                        onClick={() => setFormData({...formData, hourlyWage: Math.round(((formData.baseSalary||0)+(formData.positionAllowance||0)+(formData.skillAllowance||0))/160)})} 
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        自動算出
                      </button>
                    }
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="役職手当" 
                    value={formData.positionAllowance || 0} 
                    onChange={v => setFormData({...formData, positionAllowance: v})} 
                    history={formData.positionAllowanceHistory || []}
                    onHistoryChange={h => setFormData({...formData, positionAllowanceHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="職能給" 
                    value={formData.skillAllowance || 0} 
                    onChange={v => setFormData({...formData, skillAllowance: v})} 
                    history={formData.skillAllowanceHistory || []}
                    onHistoryChange={h => setFormData({...formData, skillAllowanceHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="住宅手当" 
                    value={formData.housingAllowance || 0} 
                    onChange={v => setFormData({...formData, housingAllowance: v})} 
                    history={formData.housingAllowanceHistory || []}
                    onHistoryChange={h => setFormData({...formData, housingAllowanceHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="家族手当" 
                    value={formData.familyAllowance || 0} 
                    onChange={v => setFormData({...formData, familyAllowance: v})} 
                    history={formData.familyAllowanceHistory || []}
                    onHistoryChange={h => setFormData({...formData, familyAllowanceHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="通勤手当（課税）" 
                    value={formData.commutingAllowanceTaxable || 0} 
                    onChange={v => setFormData({...formData, commutingAllowanceTaxable: v})} 
                    history={formData.commutingAllowanceTaxableHistory || []}
                    onHistoryChange={h => setFormData({...formData, commutingAllowanceTaxableHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />

                  <FieldCard 
                    label="通勤手当（非課税）" 
                    value={formData.commutingAllowanceNonTaxable || 0} 
                    onChange={v => setFormData({...formData, commutingAllowanceNonTaxable: v})} 
                    history={formData.commutingAllowanceNonTaxableHistory || []}
                    onHistoryChange={h => setFormData({...formData, commutingAllowanceNonTaxableHistory: h})}
                    prefix="¥"
                    className="col-span-2"
                  />
                </div>
              )}

              {activeSubTab === 'insurance' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-4">
                    <h4 className="text-blue-800 font-bold text-sm mb-4">社会保険・労働保険登録</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">雇用保険資格取得年月日</label>
                        <input type="date" value={formData.laborInsuranceJoinDate} onChange={e => setFormData({...formData, laborInsuranceJoinDate: e.target.value})} className="w-full border-blue-200 rounded-xl p-3 text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">雇用保険番号</label>
                        <input type="text" value={formData.laborInsuranceNo} onChange={e => setFormData({...formData, laborInsuranceNo: e.target.value})} className="w-full border-blue-200 rounded-xl p-3 text-sm bg-white font-mono" placeholder="0000-000000-0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">基礎年金番号</label>
                        <input type="text" value={formData.pensionNo} onChange={e => setFormData({...formData, pensionNo: e.target.value})} className="w-full border-blue-200 rounded-xl p-3 text-sm bg-white font-mono" placeholder="0000-000000" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">健康保険整理番号</label>
                        <input type="text" value={formData.healthInsuranceNo} onChange={e => setFormData({...formData, healthInsuranceNo: e.target.value})} className="w-full border-blue-200 rounded-xl p-3 text-sm bg-white font-mono" />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 pt-4 border-t"><h4 className="text-red-700 font-bold text-sm mb-4">控除設定 (保険料・住民税)</h4></div>
                  
                  <FieldCard 
                    label="健康保険料" 
                    value={formData.healthInsurance || 0} 
                    onChange={v => setFormData({...formData, healthInsurance: v})} 
                    history={formData.healthInsuranceHistory || []}
                    onHistoryChange={h => setFormData({...formData, healthInsuranceHistory: h})}
                    prefix="¥"
                    className="col-span-1"
                  />

                  <FieldCard 
                    label="介護保険料" 
                    value={formData.nursingInsurance || 0} 
                    onChange={v => setFormData({...formData, nursingInsurance: v})} 
                    history={formData.nursingInsuranceHistory || []}
                    onHistoryChange={h => setFormData({...formData, nursingInsuranceHistory: h})}
                    prefix="¥"
                    className="col-span-1"
                  />

                  <FieldCard 
                    label="厚生年金保険料" 
                    value={formData.welfarePension || 0} 
                    onChange={v => setFormData({...formData, welfarePension: v})} 
                    history={formData.welfarePensionHistory || []}
                    onHistoryChange={h => setFormData({...formData, welfarePensionHistory: h})}
                    prefix="¥"
                    className="col-span-1"
                  />

                  <FieldCard 
                    label="住民税" 
                    value={formData.residentTax || 0} 
                    onChange={v => setFormData({...formData, residentTax: v})} 
                    history={formData.residentTaxHistory || []}
                    onHistoryChange={h => setFormData({...formData, residentTaxHistory: h})}
                    prefix="¥"
                    className="col-span-1"
                  />
                </div>
              )}

              {activeSubTab === 'dependents' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                    <h4 className="text-emerald-800 font-bold text-sm mb-4">配偶者情報</h4>
                    <div className="grid grid-cols-6 gap-4 items-end">
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">配偶者氏名</label>
                        <input 
                          type="text" 
                          value={formData.spouse?.name || ''} 
                          onChange={e => setFormData({...formData, spouse: { ...(formData.spouse || { isTaxDependent: false }), name: e.target.value }})}
                          className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                          placeholder="氏名を入力"
                        />
                      </div>
                      <div className="col-span-3 pb-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={formData.spouse?.isTaxDependent || false} 
                            onChange={e => setFormData({...formData, spouse: { ...(formData.spouse || { name: '' }), isTaxDependent: e.target.checked }})}
                            className="hidden"
                          />
                          <div className={`p-1 rounded-md transition-all ${formData.spouse?.isTaxDependent ? 'text-emerald-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
                            {formData.spouse?.isTaxDependent ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                          <span className={`text-sm font-bold ${formData.spouse?.isTaxDependent ? 'text-emerald-700' : 'text-gray-400'}`}>税扶養（1人分としてカウント）</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border">
                    <div>
                      <h4 className="font-bold text-sm">扶養親族情報の管理</h4>
                      <p className="text-xs text-gray-500 mt-1">ここに追加された人数に応じて所得税が自動計算されます。</p>
                    </div>
                    <button onClick={addDependent} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"><Plus size={14}/> 扶養者を追加</button>
                  </div>

                  <div className="overflow-hidden border rounded-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b">
                        <tr>
                          <th className="p-4 w-12 text-center">No</th>
                          <th className="p-4">姓名</th>
                          <th className="p-4 w-24">続柄</th>
                          <th className="p-4 w-32">生年月日</th>
                          <th className="p-4 w-16 text-center">税扶養</th>
                          <th className="p-4 w-16 text-center">特別障害</th>
                          <th className="p-4 w-12 text-center">年齢</th>
                          <th className="p-4 w-12 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(formData.dependents || []).map((dep, idx) => (
                          <tr key={dep.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 text-center text-xs font-mono">{idx + 1}</td>
                            <td className="p-4"><input type="text" value={dep.name} onChange={e => updateDependent(dep.id, 'name', e.target.value)} className="w-full border-none p-0 focus:ring-0 text-sm font-bold bg-transparent" placeholder="氏名を入力" /></td>
                            <td className="p-4"><input type="text" value={dep.relationship} onChange={e => updateDependent(dep.id, 'relationship', e.target.value)} className="w-full border-none p-0 focus:ring-0 text-sm bg-transparent" placeholder="長女等" /></td>
                            <td className="p-4"><input type="date" value={dep.birthDate} onChange={e => updateDependent(dep.id, 'birthDate', e.target.value)} className="w-full border-none p-0 focus:ring-0 text-sm bg-transparent" /></td>
                            <td className="p-4 text-center">
                              <button onClick={() => updateDependent(dep.id, 'isTaxDependent', !dep.isTaxDependent)} className={`transition-all ${dep.isTaxDependent ? 'text-emerald-600' : 'text-gray-300'}`}>
                                {dep.isTaxDependent ? <CheckSquare size={20} /> : <Square size={20} />}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button onClick={() => updateDependent(dep.id, 'isSpecialDisabled', !dep.isSpecialDisabled)} className={`transition-all ${dep.isSpecialDisabled ? 'text-emerald-600' : 'text-gray-300'}`}>
                                {dep.isSpecialDisabled ? <CheckSquare size={20} /> : <Square size={20} />}
                              </button>
                            </td>
                            <td className="p-4 text-sm font-bold text-center">{getAge(dep.birthDate)}</td>
                            <td className="p-4 text-center"><button onClick={() => removeDependent(dep.id)} className="text-red-400 hover:text-red-600"><Minus size={16}/></button></td>
                          </tr>
                        ))}
                        {(formData.dependents || []).length === 0 && (
                          <tr><td colSpan={8} className="p-10 text-center text-gray-400 text-sm italic">扶養家族はいません</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeSubTab === 'payroll' && (
                <div className="space-y-8">
                  <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                    <h4 className="text-gray-800 font-bold text-lg mb-6 flex items-center gap-2">
                      <RefreshCcw className="text-emerald-600" size={20} />
                      給与計算実行スイッチ
                    </h4>
                    <p className="text-sm text-gray-500 mb-8">
                      従業員ごとに、特定の割増賃金を計算に含めるかどうかを制御します。OFFの場合、該当する勤務時間があっても金額は0円として計算されます。
                    </p>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <button 
                        onClick={() => setFormData({...formData, calculateOvertimeWeekday: formData.calculateOvertimeWeekday === false ? true : false})}
                        className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all text-left ${formData.calculateOvertimeWeekday !== false ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${formData.calculateOvertimeWeekday !== false ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <Calendar size={24} />
                          </div>
                          <div>
                            <span className={`block font-bold text-lg ${formData.calculateOvertimeWeekday !== false ? 'text-emerald-900' : 'text-gray-400'}`}>平日の割増残業代を計算する</span>
                            <span className="text-sm text-gray-500">平日1.25倍などの時間外手当を自動計算に含めます。</span>
                          </div>
                        </div>
                        <div className={`w-14 h-8 rounded-full relative transition-all ${formData.calculateOvertimeWeekday !== false ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.calculateOvertimeWeekday !== false ? 'right-1' : 'left-1'}`} />
                        </div>
                      </button>

                      <button 
                        onClick={() => setFormData({...formData, calculateHolidayPayNonStatutory: formData.calculateHolidayPayNonStatutory === false ? true : false})}
                        className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all text-left ${formData.calculateHolidayPayNonStatutory !== false ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${formData.calculateHolidayPayNonStatutory !== false ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <UsersIcon size={24} />
                          </div>
                          <div>
                            <span className={`block font-bold text-lg ${formData.calculateHolidayPayNonStatutory !== false ? 'text-emerald-900' : 'text-gray-400'}`}>法定外休日（土・祝）の手当を計算する</span>
                            <span className="text-sm text-gray-500">土曜や祝日の勤務に対する割増手当（1.25倍等）を計算に含めます。</span>
                          </div>
                        </div>
                        <div className={`w-14 h-8 rounded-full relative transition-all ${formData.calculateHolidayPayNonStatutory !== false ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.calculateHolidayPayNonStatutory !== false ? 'right-1' : 'left-1'}`} />
                        </div>
                      </button>

                      <button 
                        onClick={() => setFormData({...formData, calculateHolidayPayStatutory: formData.calculateHolidayPayStatutory === false ? true : false})}
                        className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all text-left ${formData.calculateHolidayPayStatutory !== false ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${formData.calculateHolidayPayStatutory !== false ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <UsersIcon size={24} />
                          </div>
                          <div>
                            <span className={`block font-bold text-lg ${formData.calculateHolidayPayStatutory !== false ? 'text-emerald-900' : 'text-gray-400'}`}>法定休日（日曜）の手当を計算する</span>
                            <span className="text-sm text-gray-500">日曜などの法定休日勤務に対する割増手当（1.35倍等）を計算に含めます。</span>
                          </div>
                        </div>
                        <div className={`w-14 h-8 rounded-full relative transition-all ${formData.calculateHolidayPayStatutory !== false ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.calculateHolidayPayStatutory !== false ? 'right-1' : 'left-1'}`} />
                        </div>
                      </button>
                    </div>

                    <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                      <div className="text-amber-600 pt-0.5">
                        <History size={18} />
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>深夜割増（0.25倍）について:</strong><br />
                        上記のスイッチがOFFであっても、22時以降の勤務（深夜労働）がある場合は、法令に基づき深夜割増分が常に加算されます。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 no-print">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 border rounded-xl hover:bg-white font-bold transition-all text-sm">キャンセル</button>
              <button onClick={handleSave} className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all text-sm">
                <Save size={18}/> 設定を保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;
