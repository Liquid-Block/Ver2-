
import React from 'react';
import { PayrollHistoryRecord, DailyAttendance } from '../types';

interface Props {
  record: PayrollHistoryRecord;
}

const AttendanceSheetView: React.FC<Props> = ({ record }) => {
  const { employee, attendance, month, settingsSnapshot } = record;
  const [year, monthNum] = month.split('-').map(Number);
  const dailyRecords = attendance.dailyRecords || [];
  const companyHolidays = settingsSnapshot?.companyHolidays || [];

  // 祝日判定 (2026年分)
  const JAPAN_HOLIDAYS_2026 = [
    '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
    '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
    '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23',
    '2026-10-12', '2026-11-03', '2026-11-23'
  ];

  const isHoliday = (dateStr: string, dayOfWeek: string) => {
    return dayOfWeek === '日' || dayOfWeek === '土' || JAPAN_HOLIDAYS_2026.includes(dateStr) || companyHolidays.includes(dateStr);
  };

  const isStatutoryHoliday = (dayOfWeek: string) => dayOfWeek === '日';
  const isNonStatutoryHoliday = (dateStr: string, dayOfWeek: string, companyHolidays: string[] = []) => {
    return (dayOfWeek === '土' || JAPAN_HOLIDAYS_2026.includes(dateStr) || companyHolidays.includes(dateStr)) && dayOfWeek !== '日';
  };

  const formatNum = (n: number) => n.toLocaleString();
  
  // サマリー計算
  const summary = dailyRecords.reduce((acc, d) => {
    const isStatutory = d.isStatutoryHoliday ?? isStatutoryHoliday(d.dayOfWeek);
    const isNonStatutory = d.isNonStatutoryHoliday ?? isNonStatutoryHoliday(d.date, d.dayOfWeek, companyHolidays);
    const isDayHoliday = isStatutory || isNonStatutory;
    const workMin = (timeStr: string) => {
      if (!timeStr || timeStr === '-:--') return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const dWorkMin = workMin(d.workHours);

    if (d.status === '有給') acc.paidLeave++;
    else if (d.status === '欠勤') acc.absence++;
    else if (isDayHoliday && dWorkMin > 0) {
      acc.holidayWorkDays++;
      if (isStatutory) {
        acc.legalHolidayMin += dWorkMin;
      } else {
        acc.nonLegalHolidayMin += dWorkMin;
      }
      acc.nightMin += workMin(d.nightWorkHours);
    } else if (dWorkMin > 0 || d.status === '休日出勤') {
      if (d.status === '休日出勤') acc.holidayWorkDays++;
      acc.workDays++;
      acc.totalWorkMin += dWorkMin;
      acc.nightMin += workMin(d.nightWorkHours);
      acc.overtimeMin += workMin(d.overtimeHours);
    }
    return acc;
  }, { workDays: 0, totalWorkMin: 0, holidayWorkDays: 0, legalHolidayMin: 0, nonLegalHolidayMin: 0, paidLeave: 0, absence: 0, overtimeMin: 0, nightMin: 0 });

  const minutesToTime = (minutes: number, showDashIfZero: boolean = false): string => {
    if (showDashIfZero && minutes === 0) return '-:--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-4 sm:p-[15mm] border border-gray-100 shadow-sm rounded-[50px] mx-auto mb-10 w-full max-w-[210mm] min-h-[297mm] text-[#333] print:shadow-none print:border-none print:m-0 print:p-[5mm] print:rounded-none relative overflow-hidden flex flex-col print:w-[210mm] print:min-h-[297mm] print-portrait print-scale-90">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 print:mb-2">
        <div>
          <h1 className="text-2xl font-bold mb-0.5 print:text-xl">勤怠管理表</h1>
          <p className="text-base font-medium print:text-xs">対象月: {year}年{monthNum}月分</p>
          <div className="mt-2 print:mt-1">
            <p className="text-[10px] font-mono text-gray-400 mb-0 print:text-[8pt]">{employee.employeeCode}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight print:text-xl">{employee.name}</span>
              <span className="text-lg print:text-sm">様</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold print:text-[10pt]">株式会社リキッドブロック</p>
          <p className="text-xs text-gray-500 print:text-[8pt]">兵庫県神戸市...</p>
        </div>
      </div>

      <div className="flex flex-col flex-grow print:gap-2">
        {/* Table */}
        <div className="border-2 border-gray-100 rounded-[30px] overflow-hidden bg-white print:border print:rounded-none">
          <table className="w-full text-[9pt] border-collapse print:text-[10pt]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[8pt] font-bold text-gray-500 print:bg-gray-100 print:text-[9pt] print:text-black">
                <th className="px-2 py-2 border-r text-center w-12 print:px-1 print:py-0.5 print:border">日付</th>
                <th className="px-2 py-2 border-r text-center w-12 print:px-1 print:py-0.5 print:border">出社</th>
                <th className="px-2 py-2 border-r text-center w-12 print:px-1 print:py-0.5 print:border">退社</th>
                <th className="px-2 py-2 border-r text-center w-12 print:px-1 print:py-0.5 print:border">休憩</th>
                <th className="px-2 py-2 border-r text-center w-16 print:px-1 print:py-0.5 print:border">労働</th>
                <th className="px-2 py-2 border-r text-center w-12 print:px-1 print:py-0.5 print:border">深夜</th>
                <th className="px-2 py-2 border-r text-center w-12 print:px-1 print:py-0.5 print:border">残業</th>
                <th className="px-2 py-2 border-r text-center w-10 print:px-1 print:py-0.5 print:border">休日</th>
                <th className="px-2 py-2 border-r text-center w-16 print:px-1 print:py-0.5 print:border">状況</th>
                <th className="px-2 py-2 text-left print:px-1 print:py-0.5 print:border">備考</th>
              </tr>
            </thead>
            <tbody>
              {dailyRecords.map((record, idx) => {
                const isDayHoliday = isHoliday(record.date, record.dayOfWeek);
                const isDirector = employee.employmentType === 'director';
                return (
                  <tr key={idx} className={`border-b border-gray-50 ${isDayHoliday ? 'bg-red-50/30 text-red-600 print:bg-red-50' : record.dayOfWeek === '土' ? 'bg-blue-50/30 text-blue-600 print:bg-blue-50' : ''} print:border`}>
                    <td className="px-2 py-1.5 border-r text-center font-medium print:px-1 print:py-0 print:border">
                      <span className="print:text-[10pt]">{record.date.split('-')[2]}</span> <span className={isDayHoliday ? 'text-red-500 font-bold' : record.dayOfWeek === '土' ? 'text-blue-500' : 'text-gray-400'}>({record.dayOfWeek})</span>
                    </td>
                    <td className="px-2 py-1.5 border-r text-center font-mono print:px-1 print:py-0 print:border">{isDirector ? '-:--' : (record.startTime || '-:--')}</td>
                    <td className="px-2 py-1.5 border-r text-center font-mono print:px-1 print:py-0 print:border">{isDirector ? '-:--' : (record.endTime || '-:--')}</td>
                    <td className="px-2 py-1.5 border-r text-center font-mono print:px-1 print:py-0 print:border">
                      {isDirector ? '-:--' : ((!record.startTime && !record.endTime) ? '-:--' : (record.breakTime === '00:00' ? '-:--' : record.breakTime))}
                    </td>
                    <td className="px-2 py-1.5 border-r text-center font-mono font-bold print:px-1 print:py-0 print:border">{isDirector ? '-:--' : (record.workHours !== '0:00' ? record.workHours : '-:--')}</td>
                    <td className="px-2 py-1.5 border-r text-center font-mono text-amber-600 print:px-1 print:py-0 print:border">{isDirector ? '-:--' : (record.nightWorkHours !== '0:00' ? record.nightWorkHours : '-:--')}</td>
                    <td className="px-2 py-1.5 border-r text-center font-mono text-red-600 print:px-1 print:py-0 print:border">{isDirector ? '-:--' : (record.overtimeHours !== '0:00' ? record.overtimeHours : '-:--')}</td>
                    <td className="px-2 py-1.5 border-r text-center print:px-1 print:py-0 print:border">
                      <div className="flex flex-col items-center gap-0.5 leading-none">
                        {record.isStatutoryHoliday && (record.startTime || record.endTime) && <span className="text-[7px] font-bold text-red-600 print:text-[7pt]">法定</span>}
                        {record.isNonStatutoryHoliday && (record.startTime || record.endTime) && <span className="text-[7px] font-bold text-blue-600 print:text-[7pt]">外</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 border-r text-center text-[8pt] print:px-1 print:py-0 print:border print:text-[9pt]">{isDirector ? '' : record.status}</td>
                    <td className="px-2 py-1.5 text-[8pt] text-gray-500 truncate max-w-[100px] print:px-1 print:py-0 print:border print:text-[8pt]">{isDirector ? '' : record.memo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Approval */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6 print:mt-2 print:grid-cols-2 print:gap-4">
          {/* Summary */}
          <div className="xl:col-span-3 border-2 border-emerald-100 rounded-[30px] p-6 bg-emerald-50/30 print:border print:rounded-none print:p-2 print:bg-emerald-50 print:col-span-1">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2 mb-4 text-sm print:mb-1 print:pb-0.5 print:text-[10pt]">集計サマリー</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 print:grid-cols-2 print:gap-x-4 print:gap-y-1">
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">出勤日数</span>
                <span className="font-bold text-lg print:text-[10pt]">{employee.employmentType === 'director' ? '-' : summary.workDays} <span className="text-[10px] font-normal print:text-[7pt]">日</span></span>
              </div>
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">有給日数</span>
                <span className="font-bold text-lg text-emerald-600 print:text-[10pt]">{employee.employmentType === 'director' ? '-' : summary.paidLeave} <span className="text-[10px] font-normal print:text-[7pt]">日</span></span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-emerald-100 pt-2 print:pt-0.5 print:text-[9pt]">
                <span className="text-gray-500">労働合計</span>
                <span className="font-mono font-bold text-lg print:text-[10pt]">{employee.employmentType === 'director' ? '-:--' : minutesToTime(summary.totalWorkMin)}</span>
              </div>
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">休日出勤(日)</span>
                <span className="font-bold print:text-[10pt]">{employee.employmentType === 'director' ? '-' : summary.holidayWorkDays} 日</span>
              </div>
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">休日出勤(法定)</span>
                <span className="font-mono font-bold print:text-[10pt]">{employee.employmentType === 'director' ? '-:--' : minutesToTime(summary.legalHolidayMin)}</span>
              </div>
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">休日出勤(法定外)</span>
                <span className="font-mono font-bold print:text-[10pt]">{employee.employmentType === 'director' ? '-:--' : minutesToTime(summary.nonLegalHolidayMin)}</span>
              </div>
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">欠勤日数</span>
                <span className="font-bold text-red-600 print:text-[10pt]">{employee.employmentType === 'director' ? '-' : summary.absence} 日</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-emerald-100 pt-2 print:pt-0.5 print:text-[9pt]">
                <span className="text-gray-500">法定外残業</span>
                <span className="font-mono font-bold text-red-600 print:text-[10pt]">{employee.employmentType === 'director' ? '-:--' : minutesToTime(summary.overtimeMin, true)}</span>
              </div>
              <div className="flex justify-between items-center text-xs print:text-[9pt]">
                <span className="text-gray-500">深夜労働</span>
                <span className="font-mono font-bold text-amber-600 print:text-[10pt]">{employee.employmentType === 'director' ? '-:--' : minutesToTime(summary.nightMin, true)}</span>
              </div>
            </div>
          </div>

          {/* Approval */}
          <div className="border-2 border-gray-100 rounded-[30px] p-6 bg-gray-50/30 print:border print:rounded-none print:p-2 print:bg-white print:col-span-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 print:mb-1 print:text-[8pt]">承認印</p>
            <div className="flex gap-4 print:gap-2">
              <div className="w-16 h-16 border border-gray-200 rounded-lg flex items-center justify-center text-[8pt] text-gray-300 print:w-12 print:h-12 print:text-[7pt] print:text-gray-400">担当</div>
              <div className="w-16 h-16 border border-gray-200 rounded-lg flex items-center justify-center text-[8pt] text-gray-300 print:w-12 print:h-12 print:text-[7pt] print:text-gray-400">検印</div>
              <div className="w-16 h-16 border border-gray-200 rounded-lg flex items-center justify-center text-[8pt] text-gray-300 print:w-12 print:h-12 print:text-[7pt] print:text-gray-400">承認</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheetView;
