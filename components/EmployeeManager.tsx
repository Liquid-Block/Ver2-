
import React, { useState, useMemo } from 'react';
import { Employee, Dependent } from '../types';
import { UserPlus, Edit2, Trash2, X, Save, ChevronUp, ChevronDown, CheckSquare, Square, RefreshCcw, User, Briefcase, Users as UsersIcon, Plus, Minus } from 'lucide-react';

interface Props {
  employees: Employee[];
  setEmployees: (emps: Employee[]) => void;
}

const EmployeeManager: React.FC<Props> = ({ employees, setEmployees }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({ dependents: [] });
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'insurance' | 'dependents'>('basic');

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
      dependents: [],
    });
    setEditingId(null);
    setActiveSubTab('basic');
    setIsModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setFormData({ ...emp, dependents: emp.dependents || [] });
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
    const newDependent: Dependent = { id: crypto.randomUUID(), name: '', relationship: '', birthDate: '' };
    setFormData({ ...formData, dependents: [...(formData.dependents || []), newDependent] });
  };

  const updateDependent = (id: string, field: keyof Dependent, value: string) => {
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
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
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
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">役職/部署</label>
                    <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">基本給</label>
                    <input type="number" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm font-bold" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex justify-between">
                      残業計算用時給 
                      <button onClick={() => setFormData({...formData, hourlyWage: Math.round(((formData.baseSalary||0)+(formData.positionAllowance||0)+(formData.skillAllowance||0))/160)})} className="text-emerald-600 hover:underline">自動算出</button>
                    </label>
                    <input type="number" value={formData.hourlyWage} onChange={e => setFormData({...formData, hourlyWage: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm bg-emerald-50" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">役職手当</label>
                    <input type="number" value={formData.positionAllowance} onChange={e => setFormData({...formData, positionAllowance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">職能給</label>
                    <input type="number" value={formData.skillAllowance} onChange={e => setFormData({...formData, skillAllowance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">住宅手当</label>
                    <input type="number" value={formData.housingAllowance} onChange={e => setFormData({...formData, housingAllowance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">家族手当</label>
                    <input type="number" value={formData.familyAllowance} onChange={e => setFormData({...formData, familyAllowance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
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
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">健康保険料</label>
                    <input type="number" value={formData.healthInsurance} onChange={e => setFormData({...formData, healthInsurance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">介護保険料</label>
                    <input type="number" value={formData.nursingInsurance} onChange={e => setFormData({...formData, nursingInsurance: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">厚生年金保険料</label>
                    <input type="number" value={formData.welfarePension} onChange={e => setFormData({...formData, welfarePension: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">住民税</label>
                    <input type="number" value={formData.residentTax} onChange={e => setFormData({...formData, residentTax: Number(e.target.value)})} className="w-full border rounded-xl p-3 text-sm" />
                  </div>
                </div>
              )}

              {activeSubTab === 'dependents' && (
                <div className="space-y-4">
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
                          <th className="p-4 w-32">続柄</th>
                          <th className="p-4 w-48">生年月日</th>
                          <th className="p-4 w-20">年齢</th>
                          <th className="p-4 w-16">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(formData.dependents || []).map((dep, idx) => (
                          <tr key={dep.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 text-center text-xs font-mono">{idx + 1}</td>
                            <td className="p-4"><input type="text" value={dep.name} onChange={e => updateDependent(dep.id, 'name', e.target.value)} className="w-full border-none p-0 focus:ring-0 text-sm font-bold bg-transparent" placeholder="氏名を入力" /></td>
                            <td className="p-4"><input type="text" value={dep.relationship} onChange={e => updateDependent(dep.id, 'relationship', e.target.value)} className="w-full border-none p-0 focus:ring-0 text-sm bg-transparent" placeholder="長女等" /></td>
                            <td className="p-4"><input type="date" value={dep.birthDate} onChange={e => updateDependent(dep.id, 'birthDate', e.target.value)} className="w-full border-none p-0 focus:ring-0 text-sm bg-transparent" /></td>
                            <td className="p-4 text-sm font-bold">{getAge(dep.birthDate)}</td>
                            <td className="p-4"><button onClick={() => removeDependent(dep.id)} className="text-red-400 hover:text-red-600"><Minus size={16}/></button></td>
                          </tr>
                        ))}
                        {(formData.dependents || []).length === 0 && (
                          <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-sm italic">扶養家族はいません</td></tr>
                        )}
                      </tbody>
                    </table>
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
