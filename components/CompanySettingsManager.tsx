
import React, { useState } from 'react';
import { CompanyConfig, RoundingType } from '../types';
import { Building2, Save, ChevronDown, ChevronUp, Clock, Percent, ShieldCheck, FileText, MapPin, User } from 'lucide-react';

interface Props {
  config: CompanyConfig;
  onSave: (config: CompanyConfig) => void;
}

const CompanySettingsManager: React.FC<Props> = ({ config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<CompanyConfig>(config);
  const [openSections, setOpenSections] = useState<string[]>(['basic', 'payroll', 'work', 'rounding', 'rates', 'insurance']);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleChange = (path: string, value: any) => {
    setLocalConfig(prev => {
      const next = { ...prev };
      const parts = path.split('.');
      let current: any = next;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    alert('設定を保存しました。');
  };

  const SectionHeader = ({ id, icon: Icon, title }: { id: string, icon: any, title: string }) => (
    <button 
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          <Icon size={20} />
        </div>
        <span className="font-bold text-slate-800">{title}</span>
      </div>
      {openSections.includes(id) ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">会社情報設定</h2>
            <p className="text-slate-500 text-sm">基本情報や給与規定、保険料率の設定を行います。</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Save size={20} />
          設定を保存
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 基本情報 */}
        <SectionHeader id="basic" icon={User} title="基本情報" />
        {openSections.includes('basic') && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">会社名</label>
              <input
                type="text"
                value={localConfig.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">代表者名</label>
              <input
                type="text"
                value={localConfig.representativeName}
                onChange={e => handleChange('representativeName', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">法人番号</label>
              <input
                type="text"
                value={localConfig.corporateNumber}
                onChange={e => handleChange('corporateNumber', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">郵便番号</label>
              <input
                type="text"
                value={localConfig.zipCode}
                onChange={e => handleChange('zipCode', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">所在地</label>
              <input
                type="text"
                value={localConfig.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* 給与規定 */}
        <SectionHeader id="payroll" icon={FileText} title="給与規定" />
        {openSections.includes('payroll') && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">締め日</label>
              <select
                value={localConfig.closingDay}
                onChange={e => handleChange('closingDay', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="末日">末日</option>
                {[...Array(28)].map((_, i) => (
                  <option key={i+1} value={String(i+1)}>{i+1}日</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">住民税改定月</label>
              <select
                value={localConfig.residentTaxRevisionMonth}
                onChange={e => handleChange('residentTaxRevisionMonth', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}月</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">支払月</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChange('paymentMonth', 'current')}
                  className={`flex-1 py-3 rounded-xl font-bold border transition-all ${localConfig.paymentMonth === 'current' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  当月
                </button>
                <button
                  onClick={() => handleChange('paymentMonth', 'next')}
                  className={`flex-1 py-3 rounded-xl font-bold border transition-all ${localConfig.paymentMonth === 'next' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  翌月
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">支払日</label>
              <select
                value={localConfig.paymentDay}
                onChange={e => handleChange('paymentDay', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {[...Array(31)].map((_, i) => (
                  <option key={i+1} value={String(i+1)}>{i+1}日</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">社会保険料の徴収時期</label>
              <select
                value={localConfig.socialInsuranceCollection}
                onChange={e => handleChange('socialInsuranceCollection', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="current">当月徴収</option>
                <option value="next">翌月徴収</option>
              </select>
            </div>
          </div>
        )}

        {/* 労働時間規定 */}
        <SectionHeader id="work" icon={Clock} title="労働時間規定 (参照用)" />
        {openSections.includes('work') && (
          <div className="p-6 space-y-6 bg-slate-50/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">標準始業時刻</label>
                <input
                  type="time"
                  value={localConfig.standardStartTime}
                  onChange={e => handleChange('standardStartTime', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">標準終業時刻</label>
                <input
                  type="time"
                  value={localConfig.standardEndTime}
                  onChange={e => handleChange('standardEndTime', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">休憩時間</label>
                <input
                  type="time"
                  value={localConfig.standardBreakTime}
                  onChange={e => handleChange('standardBreakTime', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">労働時間規定 (参照用)</label>
              <textarea
                value={localConfig.workRuleMemo}
                onChange={e => handleChange('workRuleMemo', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                placeholder="例：1日8時間、週40時間を基本とする..."
              />
              <p className="text-[10px] text-slate-400">※ これらの時刻は就業規則上の目安です。システムによる「遅刻」「早退」の自動判定や控除は行われません。勤怠入力された時間をそのまま集計します。</p>
            </div>
          </div>
        )}

        {/* 端数処理設定 */}
        <SectionHeader id="rounding" icon={Percent} title="端数処理設定" />
        {openSections.includes('rounding') && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
            {[
              { id: 'roundingHealthInsurance', label: '健康保険' },
              { id: 'roundingWelfarePension', label: '厚生年金' },
              { id: 'roundingEmploymentInsurance', label: '雇用保険' },
              { id: 'roundingIncomeTax', label: '所得税' },
              { id: 'roundingOvertime', label: '残業代・割増賃金' },
            ].map(item => (
              <div key={item.id} className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</label>
                <select
                  value={localConfig[item.id as keyof CompanyConfig] as string}
                  onChange={e => handleChange(item.id, e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="floor">切り捨て</option>
                  <option value="round">四捨五入</option>
                  <option value="ceil">切り上げ</option>
                  <option value="special_50sen">50銭以下切捨 (50.00円まで切捨、50.01円から切上)</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* 割増率設定 */}
        <SectionHeader id="rates" icon={Percent} title="割増率設定" />
        {openSections.includes('rates') && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">平日残業 (1.25倍等)</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.overtimeRateWeekday}
                onChange={e => handleChange('overtimeRateWeekday', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">土祝・法定外休日 (1.25倍等)</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.overtimeRateHolidayNonStatutory}
                onChange={e => handleChange('overtimeRateHolidayNonStatutory', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">日曜・法定休日 (1.35倍等)</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.overtimeRateHolidayStatutory}
                onChange={e => handleChange('overtimeRateHolidayStatutory', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">深夜割増 (0.25倍等)</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.nightPremiumRate}
                onChange={e => handleChange('nightPremiumRate', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">パート・アルバイト残業割増</label>
              <input
                type="number"
                step="0.01"
                value={localConfig.partTimeOvertimeRate}
                onChange={e => handleChange('partTimeOvertimeRate', Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* 保険料率設定 */}
        <SectionHeader id="insurance" icon={ShieldCheck} title="保険料率設定 (単位: /1000)" />
        {openSections.includes('insurance') && (
          <div className="p-6 bg-slate-50/30">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">保険種類</th>
                  <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">本人負担分</th>
                  <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">事業主負担分</th>
                  <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">合計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { id: 'health', label: '健康保険' },
                  { id: 'nursing', label: '介護保険' },
                  { id: 'welfare', label: '厚生年金' },
                  { id: 'employment', label: '雇用保険' },
                ].map(item => (
                  <tr key={item.id}>
                    <td className="py-4 font-bold text-slate-700">{item.label}</td>
                    <td className="py-4">
                      <input
                        type="number"
                        step="0.1"
                        value={localConfig.insuranceRates[item.id as keyof typeof localConfig.insuranceRates].employee}
                        onChange={e => handleChange(`insuranceRates.${item.id}.employee`, Number(e.target.value))}
                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        step="0.1"
                        value={localConfig.insuranceRates[item.id as keyof typeof localConfig.insuranceRates].employer}
                        onChange={e => handleChange(`insuranceRates.${item.id}.employer`, Number(e.target.value))}
                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </td>
                    <td className="py-4 text-slate-500 font-mono">
                      {(localConfig.insuranceRates[item.id as keyof typeof localConfig.insuranceRates].employee + localConfig.insuranceRates[item.id as keyof typeof localConfig.insuranceRates].employer).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySettingsManager;
