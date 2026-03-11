
import React, { useState, useMemo, useEffect } from 'react';
import { AttendanceRecord, Employee, DailyAttendance, YearlySetting } from '../types';
import { ClipboardCheck, Info, CheckCircle2, AlertCircle, Edit3, Save, Trash2, Plus, Calendar as CalendarIcon, Clock, Coffee, FileText, User, Printer, Calendar } from 'lucide-react';

interface Props {
  employees: Employee[];
  onImport: (records: AttendanceRecord[]) => void;
  targetMonth: string; // YYYY-MM
  settings: YearlySetting[];
}

// 祝日判定 (2026年分)
const JAPAN_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
  '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23',
  '2026-10-12', '2026-11-03', '2026-11-23'
];

const isHoliday = (dateStr: string, dayOfWeek: string, companyHolidays: string[] = []) => {
  return dayOfWeek === '日' || dayOfWeek === '土' || JAPAN_HOLIDAYS_2026.includes(dateStr) || companyHolidays.includes(dateStr);
};

const isStatutoryHoliday = (dayOfWeek: string) => dayOfWeek === '日';
const isNonStatutoryHoliday = (dateStr: string, dayOfWeek: string, companyHolidays: string[] = []) => {
  return (dayOfWeek === '土' || JAPAN_HOLIDAYS_2026.includes(dateStr) || companyHolidays.includes(dateStr)) && dayOfWeek !== '日';
};

// 勤怠計算ユーティリティ
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
};

const minutesToTime = (minutes: number, showDashIfZero: boolean = false): string => {
  if (showDashIfZero && minutes === 0) return '-:--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const calculateDailyHours = (start: string, end: string, breakTime: string) => {
  // 出勤・退勤のどちらか一方が空欄の場合は、すべて 0
  if (!start || !end) return { work: 0, night: 0, overtime: 0, isEmpty: true };

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const breakMin = timeToMinutes(breakTime);

  if (endMin <= startMin) return { work: 0, night: 0, overtime: 0, isEmpty: false };

  // 実労働時間 ＝ (退社時刻 － 出社時刻) － 休憩時間
  let totalWork = endMin - startMin - breakMin;
  if (totalWork < 0) totalWork = 0;

  // 深夜労働 (00:00-05:00 および 22:00-29:00)
  const getNightWork = (s: number, e: number) => {
    let night = 0;
    // 00:00 - 05:00
    const n1s = 0, n1e = 5 * 60;
    const a1s = Math.max(s, n1s), a1e = Math.min(e, n1e);
    if (a1e > a1s) night += (a1e - a1s);
    // 22:00 - 29:00
    const n2s = 22 * 60, n2e = 29 * 60;
    const a2s = Math.max(s, n2s), a2e = Math.min(e, n2e);
    if (a2e > a2s) night += (a2e - a2s);
    return night;
  };
  
  const nightWork = getNightWork(startMin, endMin);

  // 残業 (8時間超)
  const overtime = Math.max(0, totalWork - 8 * 60);

  return {
    work: totalWork,
    night: nightWork,
    overtime: overtime,
    isEmpty: false
  };
};

const STATUS_OPTIONS = ['直行', '直帰', '直行直帰', '遅刻', '早退', '有給', '代休', '休日出勤', '欠勤', 'その他'];
const PAID_LEAVE_OPTIONS = [
  { value: 'none', label: '-' },
  { value: 'full', label: '全休' },
  { value: 'am', label: 'AM半休' },
  { value: 'pm', label: 'PM半休' }
];

const AttendanceImporter: React.FC<Props> = ({ employees, onImport, targetMonth, settings }) => {
  const [pastedData, setPastedData] = useState('');
  const [parsedData, setParsedData] = useState<Record<string, DailyAttendance[]>>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = parseInt(targetMonth.split('-')[0]);
  const companyHolidays = settings.find(s => s.year === currentYear)?.companyHolidays || [];

  // パース処理
  const handleParse = () => {
    if (!pastedData.trim()) {
      setError("データが入力されていません。");
      return;
    }

    const lines = pastedData.trim().split(/\r?\n/);
    const logs: { empId: string, timestamp: number, type: 'in' | 'out', dateStr: string, timeStr: string }[] = [];

    lines.forEach(line => {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length < 4) return;

      const datePart = parts[0].replace(/\//g, '-');
      const timePart = parts[1];
      const name = parts[2] + (parts.length > 4 && !['出社', '退社'].includes(parts[3]) ? ' ' + parts[3] : '');
      const typeStr = parts[parts.length - 1];

      const emp = employees.find(e => e.name.replace(/\s/g, '') === name.replace(/\s/g, ''));
      if (!emp) return;

      const timestamp = new Date(`${datePart} ${timePart}`).getTime();
      if (isNaN(timestamp)) return;

      logs.push({
        empId: emp.id,
        timestamp,
        type: typeStr === '出社' ? 'in' : 'out',
        dateStr: datePart,
        timeStr: timePart.substring(0, 5)
      });
    });

    logs.sort((a, b) => a.timestamp - b.timestamp);

    const tempLogs: Record<string, Record<string, { in?: string, out?: string }>> = {};

    logs.forEach(log => {
      if (!tempLogs[log.empId]) tempLogs[log.empId] = {};
      
      if (log.type === 'in') {
        if (!tempLogs[log.empId][log.dateStr]) tempLogs[log.empId][log.dateStr] = {};
        tempLogs[log.empId][log.dateStr].in = log.timeStr;
      } else {
        const [h, m] = log.timeStr.split(':').map(Number);
        const logDate = new Date(log.dateStr);
        const prevDate = new Date(logDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        if (h < 10 && tempLogs[log.empId][prevDateStr]?.in && !tempLogs[log.empId][prevDateStr]?.out) {
           tempLogs[log.empId][prevDateStr].out = `${h + 24}:${String(m).padStart(2, '0')}`;
        } else {
           if (!tempLogs[log.empId][log.dateStr]) tempLogs[log.empId][log.dateStr] = {};
           tempLogs[log.empId][log.dateStr].out = log.timeStr;
        }
      }
    });

    const [year, month] = targetMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const newParsedData: Record<string, DailyAttendance[]> = {};

    // ログがある従業員 + 役員全員を対象にする
    const targetEmpIds = new Set(Object.keys(tempLogs));
    employees.filter(e => e.employmentType === 'director').forEach(e => targetEmpIds.add(e.id));

    targetEmpIds.forEach(empId => {
      const daily: DailyAttendance[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const log = (tempLogs[empId] && tempLogs[empId][dateStr]) || {};
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][new Date(dateStr).getDay()];
        
        // 出勤・退勤のいずれか一方でも入力がある行は、休憩時間を必ず 「01:00」 と表示
        const defaultBreak = (log.in || log.out) ? '01:00' : '00:00';
        const { work, night, overtime, isEmpty } = calculateDailyHours(log.in || '', log.out || '', defaultBreak);

        const isStatutory = isStatutoryHoliday(dayOfWeek);
        const isNonStatutory = isNonStatutoryHoliday(dateStr, dayOfWeek, companyHolidays);

        daily.push({
          date: dateStr,
          dayOfWeek,
          startTime: log.in || '',
          endTime: log.out || '',
          breakTime: defaultBreak,
          workHours: isEmpty ? '-:--' : minutesToTime(work, true),
          nightWorkHours: isEmpty ? '-:--' : minutesToTime(night, true),
          overtimeHours: isEmpty ? '-:--' : minutesToTime(overtime, true),
          status: '',
          paidLeaveType: 'none',
          memo: '',
          isStatutoryHoliday: isStatutory,
          isNonStatutoryHoliday: isNonStatutory
        });
      }
      newParsedData[empId] = daily;
    });

    if (Object.keys(newParsedData).length === 0) {
      setError("有効な勤怠ログが見つかりませんでした。名前がマスターと一致しているか確認してください。");
    } else {
      setParsedData(newParsedData);
      setIsEditing(true);
      setError(null);
    }
  };

  // 貼り付け時の自動解析
  useEffect(() => {
    if (pastedData.trim() && !isEditing) {
      handleParse();
    }
  }, [pastedData]);

  const handleUpdateDaily = (empId: string, dateIdx: number, field: keyof DailyAttendance, value: any) => {
    setParsedData(prev => {
      const next = { ...prev };
      const records = [...next[empId]];
      const record = { ...records[dateIdx], [field]: value };

      // 出勤・退勤のいずれかに入力があり、休憩が空または00:00なら01:00をデフォルトセット
      if ((field === 'startTime' || field === 'endTime') && value && (record.breakTime === '00:00' || !record.breakTime)) {
        record.breakTime = '01:00';
      }

      // 再計算
      if (['startTime', 'endTime', 'breakTime', 'paidLeaveType'].includes(field)) {
        const { work, night, overtime, isEmpty } = calculateDailyHours(record.startTime, record.endTime, record.breakTime);
        
        // 有給時のステータス自動設定
        if (field === 'paidLeaveType') {
          if (value !== 'none') {
            record.status = '有給';
          } else if (record.status === '有給') {
            record.status = '';
          }
        }

        record.workHours = isEmpty ? '-:--' : minutesToTime(work, true);
        record.nightWorkHours = isEmpty ? '-:--' : minutesToTime(night, true);
        record.overtimeHours = isEmpty ? '-:--' : minutesToTime(overtime, true);
      }

      records[dateIdx] = record;
      next[empId] = records;
      return next;
    });
  };

  const handleFinalize = () => {
    const [year, month] = targetMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const prescribedDailyMin = Math.round((155.2 * 60) / daysInMonth);

    const finalRecords: AttendanceRecord[] = Object.entries(parsedData).map(([empId, daily]: [string, DailyAttendance[]]) => {
      let totalWorkMin = 0;
      let totalNightMin = 0;
      let totalOvertimeMin = 0;
      let workDays = 0;
      let paidLeaveDays = 0;
      let absentDays = 0;
      let holidayWorkDays = 0;

      let legalHolidayMin = 0;
      let nonLegalHolidayMin = 0;

      daily.forEach(d => {
        const isStatutory = !!d.isStatutoryHoliday;
        const isNonStatutory = !!d.isNonStatutoryHoliday;
        const isDayHoliday = isStatutory || isNonStatutory;
        let workMin = d.workHours === '-:--' ? 0 : timeToMinutes(d.workHours);
        const nightMin = d.nightWorkHours === '-:--' ? 0 : timeToMinutes(d.nightWorkHours);

        // 有給の労働時間加算
        if (d.paidLeaveType === 'full') {
          workMin += prescribedDailyMin;
          paidLeaveDays += 1;
        } else if (d.paidLeaveType === 'am' || d.paidLeaveType === 'pm') {
          workMin += Math.round(prescribedDailyMin / 2);
          paidLeaveDays += 0.5;
        }

        if (d.status === '有給' && d.paidLeaveType === 'none') {
          // 互換性のため、statusが有給でpaidLeaveTypeがnoneの場合は1日として扱う
          paidLeaveDays += 1;
          workMin += prescribedDailyMin;
        }

        if (d.status === '欠勤') {
          absentDays++;
        } else if (isDayHoliday && workMin > 0) {
          // 休日チェック優先：通常の労働時間や残業時間には含めず、休日労働として集計
          holidayWorkDays++;
          if (isStatutory) {
            legalHolidayMin += workMin;
          } else {
            nonLegalHolidayMin += workMin;
          }
          // 深夜労働は休日であっても別途集計（給与計算側で0.25加算するため）
          totalNightMin += nightMin;
        } else if (workMin > 0 || d.status === '休日出勤') {
          if (d.status === '休日出勤') holidayWorkDays++;
          workDays++;
          totalWorkMin += workMin;
          totalNightMin += nightMin;
          totalOvertimeMin += d.overtimeHours === '-:--' ? 0 : timeToMinutes(d.overtimeHours);
        }
      });

      return {
        employeeId: empId,
        workDays,
        holidayWorkDays,
        paidLeaveDays,
        absentDays,
        specialLeaveDays: 0,
        totalWorkHours: minutesToTime(totalWorkMin),
        overtimeHours: minutesToTime(totalOvertimeMin),
        legalHolidayHours: minutesToTime(legalHolidayMin),
        nonLegalHolidayHours: minutesToTime(nonLegalHolidayMin),
        nightWorkHours: minutesToTime(totalNightMin),
        lateEarlyCount: 0,
        lateEarlyHours: '0:00',
        dailyRecords: daily
      };
    });

    onImport(finalRecords);
    setIsEditing(false);
    setParsedData({});
    setPastedData('');
  };

  if (isEditing) {
    const activeEmpId = selectedEmployeeId || Object.keys(parsedData)[0];
    const activeRecords = parsedData[activeEmpId];
    const activeEmp = employees.find(e => e.id === activeEmpId);

    // サマリー計算
    const summary = activeRecords.reduce((acc, d) => {
      const isStatutory = d.isStatutoryHoliday;
      const isNonStatutory = d.isNonStatutoryHoliday;
      const isDayHoliday = isStatutory || isNonStatutory;
      const workMin = d.workHours === '-:--' ? 0 : timeToMinutes(d.workHours);

      if (d.status === '有給') acc.paidLeave++;
      else if (d.status === '欠勤') acc.absence++;
      else if (isDayHoliday && workMin > 0) {
        acc.holidayWorkDays++;
        if (isStatutory) {
          acc.legalHolidayMin += workMin;
        } else {
          acc.nonLegalHolidayMin += workMin;
        }
        acc.nightMin += d.nightWorkHours === '-:--' ? 0 : timeToMinutes(d.nightWorkHours);
      } else if (workMin > 0 || d.status === '休日出勤') {
        if (d.status === '休日出勤') acc.holidayWorkDays++;
        acc.workDays++;
        acc.totalWorkMin += workMin;
        acc.nightMin += d.nightWorkHours === '-:--' ? 0 : timeToMinutes(d.nightWorkHours);
        acc.overtimeMin += d.overtimeHours === '-:--' ? 0 : timeToMinutes(d.overtimeHours);
      }
      return acc;
    }, { workDays: 0, totalWorkMin: 0, holidayWorkDays: 0, legalHolidayMin: 0, nonLegalHolidayMin: 0, paidLeave: 0, absence: 0, overtimeMin: 0, nightMin: 0 });

    return (
      <div className="space-y-6 animate-in fade-in duration-500 print:space-y-4 print-portrait mx-auto print:w-[210mm] print:min-h-[297mm] print:p-[10mm] print:bg-white">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm no-print">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">{activeEmp?.name} <span className="text-sm font-normal text-gray-400">の勤怠編集</span></h3>
              <p className="text-xs text-gray-400">対象月: {targetMonth}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              value={activeEmpId} 
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-gray-50 border-none text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {Object.keys(parsedData).map(id => (
                <option key={id} value={id}>{employees.find(e => e.id === id)?.name}</option>
              ))}
            </select>
            <button 
              onClick={handleFinalize}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              計算結果を確定する
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start print:flex print:flex-row print:gap-2 print:items-start">
          {/* 勤怠表 */}
          <div className="xl:col-span-3 bg-white rounded-2xl border shadow-sm overflow-hidden print:border-none print:shadow-none print:flex-[3]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse print:text-[7pt]">
                <thead>
                  <tr className="bg-gray-50 border-bottom text-[10px] uppercase tracking-wider text-gray-500 font-bold print:bg-white">
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">日付</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">出社</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">退社</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">休憩</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">労働</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">深夜</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">残業</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border text-center">休日判定</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">有給</th>
                    <th className="px-4 py-3 border-r print:px-0.5 print:py-1 print:border">状態</th>
                    <th className="px-4 py-3 print:px-0.5 print:py-1 print:border">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((record, idx) => {
                    const isDayHoliday = isHoliday(record.date, record.dayOfWeek, companyHolidays);
                    const isDirector = activeEmp?.employmentType === 'director';
                    return (
                      <tr key={idx} className={`border-b hover:bg-emerald-50/30 transition-colors ${isDayHoliday ? 'bg-red-50/50 text-red-600 print:bg-red-50' : record.dayOfWeek === '土' ? 'bg-blue-50/30 text-blue-600 print:bg-blue-50' : ''} print:border`}>
                        <td className={`px-4 py-2 border-r font-medium whitespace-nowrap print:px-0.5 print:py-0.5 print:border`}>
                          <span className="text-gray-400 mr-1 print:text-[6pt]">{record.date.split('-')[2]}</span>
                          <span className={isDayHoliday ? 'text-red-500 font-bold' : record.dayOfWeek === '土' ? 'text-blue-500' : ''}>({record.dayOfWeek})</span>
                        </td>
                        <td className="px-2 py-1 border-r print:px-0.5 print:py-0 print:border">
                          {!isDirector && (
                            <input 
                              type="text" 
                              value={record.startTime} 
                              onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'startTime', e.target.value)}
                              placeholder="-:--"
                              className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 print:hidden text-center placeholder:text-gray-300"
                            />
                          )}
                          <span className={`${isDirector ? '' : 'hidden print:block'} text-center`}>{isDirector ? '-:--' : (record.startTime || '-:--')}</span>
                        </td>
                        <td className="px-2 py-1 border-r print:px-0.5 print:py-0 print:border">
                          {!isDirector && (
                            <input 
                              type="text" 
                              value={record.endTime} 
                              onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'endTime', e.target.value)}
                              placeholder="-:--"
                              className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 print:hidden text-center placeholder:text-gray-300"
                            />
                          )}
                          <span className={`${isDirector ? '' : 'hidden print:block'} text-center`}>{isDirector ? '-:--' : (record.endTime || '-:--')}</span>
                        </td>
                        <td className="px-2 py-1 border-r print:px-0.5 print:py-0 print:border">
                          {!isDirector && (
                            <input 
                              type="text" 
                              value={record.breakTime === '00:00' && !record.startTime && !record.endTime ? '' : record.breakTime} 
                              onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'breakTime', e.target.value || '00:00')}
                              placeholder="-:--"
                              className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 print:hidden text-center placeholder:text-gray-300"
                            />
                          )}
                          <span className={`${isDirector ? '' : 'hidden print:block'} text-center`}>
                            {isDirector ? '-:--' : ((!record.startTime && !record.endTime) ? '-:--' : (record.breakTime === '00:00' ? '-:--' : record.breakTime))}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-r font-mono text-gray-600 print:px-0.5 print:py-0.5 print:border text-center">{isDirector ? '-:--' : record.workHours}</td>
                        <td className="px-4 py-2 border-r font-mono text-amber-600 print:px-0.5 print:py-0.5 print:border text-center">{isDirector ? '-:--' : record.nightWorkHours}</td>
                        <td className="px-4 py-2 border-r font-mono text-red-600 print:px-0.5 print:py-0.5 print:border text-center">{isDirector ? '-:--' : record.overtimeHours}</td>
                        <td className="px-2 py-1 border-r print:px-0.5 print:py-0 print:border">
                          {!isDirector && (record.startTime || record.endTime) && isDayHoliday && (
                            <div className="flex flex-col gap-1 no-print">
                              <label className="flex items-center gap-1 text-[9px] cursor-pointer hover:text-emerald-600">
                                <input 
                                  type="checkbox" 
                                  checked={record.isNonStatutoryHoliday} 
                                  onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'isNonStatutoryHoliday', e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3"
                                />
                                外(1.25)
                              </label>
                              <label className="flex items-center gap-1 text-[9px] cursor-pointer hover:text-red-600">
                                <input 
                                  type="checkbox" 
                                  checked={record.isStatutoryHoliday} 
                                  onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'isStatutoryHoliday', e.target.checked)}
                                  className="rounded text-red-600 focus:ring-red-500 w-3 h-3"
                                />
                                法(1.35)
                              </label>
                            </div>
                          )}
                          <div className="hidden print:flex flex-col items-center gap-0.5">
                            {record.isStatutoryHoliday && (record.startTime || record.endTime) && <span className="text-[6pt] font-bold text-red-600">法定</span>}
                            {record.isNonStatutoryHoliday && (record.startTime || record.endTime) && <span className="text-[6pt] font-bold text-blue-600">外</span>}
                          </div>
                        </td>
                        <td className="px-2 py-1 border-r print:px-0.5 print:py-0 print:border">
                          {!isDirector && (
                            <select 
                              value={record.paidLeaveType || 'none'} 
                              onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'paidLeaveType', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 text-xs p-1 print:hidden font-bold text-emerald-600"
                            >
                              {PAID_LEAVE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          )}
                          <span className={`${isDirector ? '' : 'hidden print:block'} text-[6pt] text-center`}>
                            {record.paidLeaveType === 'full' ? '全休' : record.paidLeaveType === 'am' ? 'AM半' : record.paidLeaveType === 'pm' ? 'PM半' : ''}
                          </span>
                        </td>
                        <td className="px-2 py-1 border-r print:px-0.5 print:py-0 print:border">
                          {!isDirector && (
                            <select 
                              value={record.status} 
                              onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'status', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 text-xs p-1 print:hidden"
                            >
                              <option value=""></option>
                              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}
                          <span className={`${isDirector ? '' : 'hidden print:block'} text-[6pt] text-center`}>{isDirector ? '' : record.status}</span>
                        </td>
                        <td className="px-2 py-1 print:px-0.5 print:py-0 print:border">
                          {!isDirector && (
                            <input 
                              type="text" 
                              value={record.memo} 
                              onChange={(e) => handleUpdateDaily(activeEmpId, idx, 'memo', e.target.value)}
                              placeholder="備考..."
                              className="w-full bg-transparent border-none focus:ring-0 text-xs p-1 print:hidden"
                            />
                          )}
                          <span className={`${isDirector ? '' : 'hidden print:block'} text-[6pt] truncate max-w-[40px]`}>{isDirector ? '' : record.memo}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* サマリーテーブル */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6 print:border-2 print:border-gray-200 print:p-2 print:shadow-none print:flex-[1] print:space-y-2">
            <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2 print:text-[9pt] print:pb-1">
              <FileText size={18} className="text-emerald-600 print:w-3 print:h-3" />
              集計サマリー
            </h4>
            <div className="space-y-4 print:space-y-1">
              <div className="grid grid-cols-2 gap-4 print:gap-1">
                <div className="bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 print:text-[6pt] print:mb-0">出勤日数</p>
                  <p className="text-xl font-bold print:text-[10pt]">{activeEmp?.employmentType === 'director' ? '-' : summary.workDays} 日</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 print:text-[6pt] print:mb-0">有給日数</p>
                  <p className="text-xl font-bold text-emerald-600 print:text-[10pt]">{activeEmp?.employmentType === 'director' ? '-' : summary.paidLeave} 日</p>
                </div>
              </div>

              <div className="space-y-2 print:space-y-1">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">労働合計</span>
                  <span className="font-mono font-bold text-lg print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-:--' : minutesToTime(summary.totalWorkMin)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">休日出勤(日)</span>
                  <span className="font-bold print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-' : summary.holidayWorkDays} 日</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">休日出勤(法定)</span>
                  <span className="font-mono font-bold text-lg print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-:--' : minutesToTime(summary.legalHolidayMin)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">休日出勤(法定外)</span>
                  <span className="font-mono font-bold text-lg print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-:--' : minutesToTime(summary.nonLegalHolidayMin)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">欠勤日数</span>
                  <span className="font-bold text-red-600 print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-' : summary.absence} 日</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">法定外残業</span>
                  <span className="font-mono font-bold text-red-600 print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-:--' : minutesToTime(summary.overtimeMin, true)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl print:p-1 print:bg-white print:border">
                  <span className="text-xs font-bold text-gray-500 print:text-[7pt]">深夜労働</span>
                  <span className="font-mono font-bold text-amber-600 print:text-[9pt]">{activeEmp?.employmentType === 'director' ? '-:--' : minutesToTime(summary.nightMin, true)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t no-print">
               <button 
                onClick={() => window.print()}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
               >
                 <Printer size={18} />
                 この表を印刷する
               </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-start no-print">
          <button 
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium flex items-center gap-1"
          >
            <Trash2 size={14} />
            解析をやり直す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
            <ClipboardCheck size={24} />
          </div>
          勤怠データのコピペインポート
        </h3>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Google Form Integration</div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative group">
            <textarea
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder="Googleフォームの回答データをここに貼り付けてください...
例: 2026/01/15 9:30:30  野田 菓子  出社"
              className="w-full h-80 p-6 font-mono text-sm border-2 border-gray-100 rounded-2xl focus:border-emerald-500 focus:ring-0 outline-none bg-gray-50/50 transition-all resize-none group-hover:bg-white"
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={() => setPastedData('')}
                className="px-4 py-2 bg-white border text-gray-400 hover:text-red-500 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                クリア
              </button>
              <button 
                onClick={handleParse}
                disabled={!pastedData.trim()}
                className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${pastedData.trim() ? 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                <Clock size={18} />
                データを解析する
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-3 animate-in shake duration-500">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-800">
            <div className="flex items-center gap-2 mb-4 text-blue-900">
              <Info size={20} />
              <h4 className="font-bold">インポート手順</h4>
            </div>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="bg-blue-200 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p>Googleフォームの回答スプレッドシートから、<b>タイムスタンプ・名前・出退勤</b>の列をコピーします。</p>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-200 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <p>左の入力欄にそのまま貼り付け、「データを解析する」をクリックします。</p>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-200 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <p>表示されるエディタで、休憩時間や有給などの修正を行い、確定ボタンを押します。</p>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Coffee size={18} className="text-amber-500" />
              自動計算ルール
            </h4>
            <div className="space-y-3 text-xs text-gray-500 leading-relaxed">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>深夜労働時間</span>
                <span className="font-bold text-gray-700">22:00 〜 05:00</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>法定外残業</span>
                <span className="font-bold text-gray-700">実働 8時間 超過分</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>デフォルト休憩</span>
                <span className="font-bold text-gray-700">1時間 (出退勤ペア時)</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>丸め処理</span>
                <span className="font-bold text-gray-700">1分単位 (切り捨て)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceImporter;
