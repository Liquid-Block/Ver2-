
export type RoundingType = 'round' | 'floor' | 'ceil' | 'special_50sen'; // 四捨五入, 切り捨て, 切り上げ, 50銭以下切捨

export interface CompanyConfig {
  // 基本情報
  companyName: string;
  representativeName: string;
  corporateNumber: string;
  zipCode: string;
  address: string;

  // 給与規定
  closingDay: string; // '末日' or '1'...'28'
  paymentMonth: 'current' | 'next';
  paymentDay: string; // '1'...'31'
  residentTaxRevisionMonth: number; // 6
  socialInsuranceCollection: 'current' | 'next'; // 当月徴収, 翌月徴収

  // 労働時間規定 (参照用)
  standardStartTime: string; // '09:00'
  standardEndTime: string; // '18:00'
  standardBreakTime: string; // '01:00'
  workRuleMemo: string;

  // 端数処理設定
  roundingHealthInsurance: RoundingType;
  roundingWelfarePension: RoundingType;
  roundingEmploymentInsurance: RoundingType;
  roundingIncomeTax: RoundingType;
  roundingOvertime: RoundingType;

  // 割増率・料率設定
  overtimeRateWeekday: number; // 1.25
  overtimeRateHolidayNonStatutory: number; // 1.25
  overtimeRateHolidayStatutory: number; // 1.35
  nightPremiumRate: number; // 0.25
  partTimeOvertimeRate: number; // 0.25 (追加分)

  // 保険料率 (単位: /1000)
  insuranceRates: {
    health: { employee: number; employer: number };
    nursing: { employee: number; employer: number };
    welfare: { employee: number; employer: number };
    employment: { employee: number; employer: number };
  };
}

export interface TaxRule {
  effectiveMonth: string; // YYYY-MM
  csvData: string[][]; // Raw CSV rows
  createdAt: string;
}

export interface YearlySetting {
  year: number;
  avgMonthlyDays: number;
  avgMonthlyHours: number;
  companyHolidays?: string[]; // YYYY-MM-DD
}

export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  birthDate: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  kanaName: string;
  birthDate: string;
  address: string;
  zipCode: string;
  position: string;
  joinDate: string;
  baseSalary: number;
  hourlyWage: number;
  positionAllowance: number;
  skillAllowance: number;
  housingAllowance: number;
  familyAllowance: number;
  commutingAllowanceTaxable: number;
  commutingAllowanceNonTaxable: number;
  healthInsurance: number;
  nursingInsurance: number;
  welfarePension: number;
  residentTax: number;
  yearEndAdjustment?: number;
  remainingPaidLeave?: number;
  entryDate: string; // YYYY-MM-DD
  initialBalance: number;
  initialMonth: string; // YYYY-MM
  employmentType: 'regular' | 'part-time' | 'director';
  isLaborInsuranceEnrolled: boolean;
  laborInsuranceJoinDate: string;
  laborInsuranceNo: string;
  pensionNo: string;
  healthInsuranceNo: string;
  dependents: Dependent[];
}

export type AttendanceStatus = '直行' | '直帰' | '直行直帰' | '遅刻' | '早退' | '有給' | '代休' | '休日出勤' | '欠勤' | 'その他' | '';

export interface DailyAttendance {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakTime: string; // HH:mm
  workHours: string; // HH:mm
  nightWorkHours: string; // HH:mm
  overtimeHours: string; // HH:mm
  status: AttendanceStatus;
  paidLeaveType: 'none' | 'full' | 'am' | 'pm';
  memo: string;
  isStatutoryHoliday?: boolean; // 法定 (1.35)
  isNonStatutoryHoliday?: boolean; // 法定外 (1.25)
}

export interface AttendanceRecord {
  employeeId: string;
  workDays: number;
  holidayWorkDays: number;
  paidLeaveDays: number;
  absentDays: number;
  specialLeaveDays: number;
  totalWorkHours: string; 
  overtimeHours: string; 
  legalHolidayHours: string; 
  nonLegalHolidayHours: string; 
  nightWorkHours: string; 
  lateEarlyCount: number;
  lateEarlyHours: string;
  dailyRecords?: DailyAttendance[]; // Optional daily details
}

export interface PayrollResult {
  employee: Employee;
  attendance: AttendanceRecord;
  month: string; 
  payDate: string;
  targetPeriod: string;
  overtimePay: number;
  holidayPay: number;
  nightPay: number;
  lateEarlyDeduction: number;
  absentDeduction: number;
  taxableTotal: number;
  nonTaxableTotal: number;
  grossPay: number;
  socialInsuranceTotal: number;
  employmentInsurance: number;
  taxableIncome: number;
  incomeTax: number;
  yearEndAdjustment: number;
  taxableAdjustment: number; // 追加：課税調整
  nonTaxableAdjustment: number; // 追加：非課税調整
  adjustmentMemo: string; // 追加：調整理由
  paidLeaveBalance: number; // 有給残日数
  paidLeaveConsumed: number; // 今月の有給消化数
  deductionSubTotal: number;
  deductionGrandTotal: number;
  netPay: number;
  cashPay: number;
  transferPay: number;
}

export interface PayrollHistoryRecord extends PayrollResult {
  id: string;
  finalizedAt: string;
  settingsSnapshot: YearlySetting;
}
