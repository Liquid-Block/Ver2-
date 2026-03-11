
import React from 'react';
import { PayrollResult } from '../types';

interface Props {
  data: PayrollResult;
}

const PayslipView: React.FC<Props> = ({ data }) => {
  const formatNum = (n: any) => (n || 0).toLocaleString();
  const [year, month] = data.month.split('-').map(Number);
  const [payYear, payMonth, payDay] = data.payDate.split('-').map(Number);

  const isDirector = data.employee.employmentType === 'director';
  const baseSalaryLabel = isDirector ? '役員報酬' : '基本給';
  
  const displayReiwaYear = year - 2018;
  const payReiwaYear = payYear - 2018;

  const val = (displayVal: string | number | undefined) => (!displayVal || displayVal === "0" || displayVal === "0:00") ? "" : displayVal;

  return (
    <div className="bg-white p-4 sm:p-[10mm] border border-gray-100 shadow-sm rounded-[50px] mx-auto mb-10 w-full max-w-[210mm] min-h-[297mm] text-[#333] print:shadow-none print:border-none print:m-0 print:p-0 print:rounded-none relative overflow-hidden flex flex-col print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print-portrait">
      
      {/* Header Area */}
      <div className="flex justify-between items-start mb-6 print:mb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold mb-2 print:text-xl">令和{displayReiwaYear}年{month}月分給与明細</h1>
          <p className="text-base font-medium print:text-sm">株式会社リキッドブロック</p>
          <p className="text-sm text-gray-600 print:text-xs">本社</p>
          
          <div className="mt-6 print:mt-4">
            <p className="text-[10px] font-mono text-gray-400 mb-0.5 print:text-[8pt]">{data.employee.employeeCode}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight print:text-2xl">{data.employee.name}</span>
              <span className="text-xl print:text-base">様</span>
            </div>
          </div>

          <div className="mt-4 text-xs space-y-0.5 text-gray-700 print:text-[9pt]">
            <p><span className="w-24 inline-block print:w-20">支給年月日：</span>令和{payReiwaYear}年{payMonth}月{payDay}日</p>
            <p><span className="w-24 inline-block print:w-20">対象期間：</span>{data.targetPeriod}</p>
          </div>
        </div>

        <div className="border-2 border-[#88C6C3] rounded-[30px] p-6 w-72 bg-white shadow-lg shadow-emerald-50 print:p-4 print:w-60 print:shadow-none">
          <p className="text-center text-sm font-bold text-gray-500 mb-4 print:mb-2 print:text-xs">差引支給額</p>
          <p className="text-right text-4xl font-bold tracking-tighter text-emerald-800 print:text-3xl">
            ¥{formatNum(data.netPay)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 flex-grow items-stretch print:gap-2 print:mb-2">
        
        {/* Earnings (支給) */}
        <div className="border-2 border-[#88C6C3] rounded-[35px] overflow-hidden flex flex-col bg-white print:rounded-[20px]">
          <div className="bg-white text-center py-2 text-sm font-bold border-b border-gray-100 print:py-1 print:text-xs">支給</div>
          <div className="p-6 space-y-1 text-sm flex-grow print:p-3 print:text-[8pt]">
            {[
              { label: baseSalaryLabel, value: data.employee.baseSalary },
              { label: '役職手当', value: data.employee.positionAllowance },
              { label: '職能手当', value: data.employee.skillAllowance },
              { label: '住宅手当', value: data.employee.housingAllowance },
              { label: '家族手当', value: data.employee.familyAllowance },
              { label: '残業手当', value: data.overtimePay },
              { label: '休日出勤', value: data.holidayPay },
              { label: '深夜残業', value: data.nightPay },
              { label: '通勤非課税', value: data.employee.commutingAllowanceNonTaxable },
              // 手動調整額の表示
              ...(data.taxableAdjustment !== 0 ? [{ label: '課税調整額', value: data.taxableAdjustment }] : []),
              ...(data.nonTaxableAdjustment !== 0 ? [{ label: '非課税調整額', value: data.nonTaxableAdjustment }] : []),
            ].map((item, i) => (
              <div key={i} className={`flex justify-between items-baseline ${item.label.includes('調整') ? 'text-emerald-700 font-bold' : ''}`}>
                <span className="text-[11px] text-gray-600 print:text-[7pt]">{item.label}</span>
                <span className="font-mono">{formatNum(item.value)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-50 space-y-1 mt-2 print:pt-1 print:mt-1">
              <div className="flex justify-between font-bold text-gray-800"><span>総支給額</span><span className="font-mono">{formatNum(data.grossPay)}</span></div>
            </div>
          </div>
        </div>

        {/* Deductions (控除) */}
        <div className="border-2 border-[#88C6C3] rounded-[35px] overflow-hidden flex flex-col bg-white print:rounded-[20px]">
          <div className="bg-white text-center py-2 text-sm font-bold border-b border-gray-100 print:py-1 print:text-xs">控除</div>
          <div className="p-6 space-y-1 text-sm flex-grow print:p-3 print:text-[8pt]">
            {[
              { label: '健康保険', value: data.employee.healthInsurance },
              { label: '介護保険', value: data.employee.nursingInsurance },
              { label: '厚生年金', value: data.employee.welfarePension },
              { label: '雇用保険', value: data.employmentInsurance },
              { label: '社会保険計', value: data.socialInsuranceTotal, isSub: true },
              { label: '源泉所得税', value: data.incomeTax },
              { label: '住民税', value: data.employee.residentTax },
              { label: '年末調整精算', value: data.yearEndAdjustment },
            ].map((item, i) => (
              <div key={i} className={`flex justify-between items-baseline ${item.isSub ? 'text-gray-400 italic' : ''}`}>
                <span className="text-[11px] print:text-[7pt]">{item.label}</span>
                <span className="font-mono">{formatNum(item.value)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-50 mt-2 print:pt-1 print:mt-1">
              <div className="flex justify-between font-bold text-gray-800 pt-1">
                <span>控除合計</span>
                <span className="font-mono">{formatNum(data.deductionGrandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance (勤怠) */}
        <div className="border-2 border-[#88C6C3] rounded-[35px] overflow-hidden flex flex-col bg-white print:rounded-[20px]">
          <div className="bg-white text-center py-2 text-sm font-bold border-b border-gray-100 print:py-1 print:text-xs">勤怠</div>
          <div className="p-6 space-y-2 text-sm flex-grow print:p-3 print:text-[8pt]">
            <div className="flex justify-between text-[11px] print:text-[7pt]"><span>出勤日数</span><span className="font-bold">{val(data.attendance.workDays)}</span></div>
            <div className="flex justify-between text-[11px] print:text-[7pt]"><span>有給日数</span><span className="font-bold">{val(data.attendance.paidLeaveDays)}</span></div>
            <div className="flex justify-between text-[11px] print:text-[7pt]"><span>休出日数</span><span className="font-bold">{val(data.attendance.holidayWorkDays)}</span></div>
            <div className="pt-2 border-t border-gray-50 space-y-1 mt-1 print:pt-1 print:mt-1">
              <div className="flex justify-between text-[11px] print:text-[7pt] text-emerald-700 font-bold"><span>有給残日数</span><span>{data.paidLeaveBalance}</span></div>
              <div className="flex justify-between text-[11px] print:text-[7pt] text-emerald-600"><span>今月有給消化</span><span>{data.paidLeaveConsumed}</span></div>
            </div>
            <div className="pt-3 border-t border-gray-50 space-y-2 mt-2 print:pt-1 print:mt-1">
              <div className="flex justify-between text-[11px] print:text-[7pt]"><span>出勤時間</span><span className="font-mono font-bold">{val(data.attendance.totalWorkHours)}</span></div>
              <div className="flex justify-between text-[11px] print:text-[7pt]"><span>残業時間</span><span className="font-mono font-bold">{val(data.attendance.overtimeHours)}</span></div>
              <div className="flex justify-between text-[11px] print:text-[7pt]"><span>深夜残業</span><span className="font-mono font-bold">{val(data.attendance.nightWorkHours)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-[#88C6C3] rounded-[35px] overflow-hidden bg-white mb-4 print:rounded-[20px] print:mb-2">
        <div className="bg-[#F0F9F8] text-center py-2 text-sm font-bold border-b border-[#88C6C3] print:py-1 print:text-xs">支払内訳</div>
        <div className="p-6 grid grid-cols-4 gap-4 text-sm print:p-3 print:text-[8pt]">
          <div className="space-y-0.5">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest print:text-[6pt]">銀行振込額</p>
            <p className="font-mono text-gray-300">0</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest print:text-[6pt]">現金支給額</p>
            <p className="font-bold text-lg text-emerald-700 print:text-base">{formatNum(data.netPay)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest print:text-[6pt]">基本給単価</p>
            <p className="font-mono">{formatNum(data.employee.employmentType === 'part-time' ? data.employee.hourlyWage : data.employee.baseSalary)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest print:text-[6pt]">課税累計</p>
            <p className="font-mono">{formatNum(data.taxableTotal + data.taxableAdjustment)}</p>
          </div>
        </div>
      </div>

      <div className="border-2 border-[#88C6C3] rounded-[25px] p-5 flex flex-col justify-center min-h-[70px] bg-emerald-50/20 print:p-3 print:min-h-[50px] print:rounded-[15px]">
        <p className="text-[10px] font-bold text-emerald-800 uppercase mb-0.5 print:text-[7pt]">備考 / 調整理由</p>
        <p className="text-sm font-medium print:text-[8pt]">{data.adjustmentMemo || 'いつもお仕事ありがとうございます。今月もお疲れ様でした。'}</p>
      </div>
    </div>
  );
};

export default PayslipView;
