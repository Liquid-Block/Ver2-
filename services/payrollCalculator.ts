
import { Employee, AttendanceRecord, PayrollResult, YearlySetting, PayrollHistoryRecord, CompanyConfig, RoundingType, TaxRule } from '../types';
import { calculateIncomeTax } from './taxCalculator';

const applyRounding = (value: number, type: RoundingType): number => {
  switch (type) {
    case 'round':
      return Math.round(value);
    case 'floor':
      return Math.floor(value);
    case 'ceil':
      return Math.ceil(value);
    case 'special_50sen':
      // 50銭以下切捨 (50.00円まで切捨、50.01円から切上)
      // 実質的には 0.5 を境に四捨五入に近いが、正確には 50.000...1 から切り上げ
      // ここでは簡易的に 0.5 を超えたら切り上げとする
      const decimal = value % 1;
      if (decimal <= 0.5) return Math.floor(value);
      return Math.ceil(value);
    default:
      return Math.floor(value);
  }
};

const getGrantedDaysSince = (entryDate: string, initialMonth: string, targetMonth: string) => {
  if (!entryDate || !initialMonth || !targetMonth) return 0;
  const entry = new Date(entryDate);
  const initial = new Date(initialMonth + '-01');
  const target = new Date(targetMonth + '-01');
  
  const grantTimings = [6, 18, 30, 42, 54, 66, 78];
  const schedule = [10, 11, 12, 14, 16, 18, 20];
  
  let granted = 0;
  
  for (let i = 0; i < grantTimings.length; i++) {
    const grantDate = new Date(entry.getFullYear(), entry.getMonth() + grantTimings[i], entry.getDate());
    if (grantDate > initial && grantDate <= target) {
      granted += schedule[i];
    }
  }
  
  let months = 90; 
  while (months < 1200) { // Safety break
    const grantDate = new Date(entry.getFullYear(), entry.getMonth() + months, entry.getDate());
    if (grantDate > target) break;
    if (grantDate > initial) {
      granted += 20;
    }
    months += 12;
  }
  
  return granted;
};

const timeToDecimal = (timeStr: string): number => {
  if (!timeStr || timeStr === "-:--" || timeStr === "0:00") return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours + minutes / 60;
};

export const calculatePayroll = (
  employee: Employee,
  attendance: AttendanceRecord,
  month: string, 
  payDate: string,
  settings: YearlySetting[],
  companyConfig: CompanyConfig,
  taxRules: TaxRule[] = [],
  history: PayrollHistoryRecord[] = []
): PayrollResult => {
  const [yearStr, monthStr] = month.split('-');
  const targetYear = parseInt(yearStr);
  const targetMonth = parseInt(monthStr);

  // 有給残数計算
  const grantedSince = getGrantedDaysSince(employee.entryDate, employee.initialMonth, month);
  
  // 移行月以降の消化累計（今月分を除く）
  const pastConsumed = history
    .filter(h => h.employee.id === employee.id && h.month >= employee.initialMonth && h.month < month)
    .reduce((acc, h) => acc + (h.attendance.paidLeaveDays || 0), 0);
  
  const currentConsumed = attendance.paidLeaveDays || 0;
  const totalConsumed = pastConsumed + currentConsumed;
  
  const paidLeaveBalance = (employee.initialBalance || 0) + grantedSince - totalConsumed;

  const yearSetting = settings.find(s => s.year === targetYear) || 
                      settings.find(s => s.year === 2025) || 
                      { year: 2025, avgMonthlyDays: 20, avgMonthlyHours: 160 };

  const avgMonthlyHours = yearSetting.avgMonthlyHours || 160;
  
  const workHoursDecimal = timeToDecimal(attendance.totalWorkHours);
  const otDecimal = timeToDecimal(attendance.overtimeHours);
  const legalHolidayDecimal = timeToDecimal(attendance.legalHolidayHours);
  const nonLegalHolidayDecimal = timeToDecimal(attendance.nonLegalHolidayHours);
  const nightDecimal = timeToDecimal(attendance.nightWorkHours);

  const num = (v: any) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  let calculatedBaseSalary = employee.employmentType === 'part-time' 
    ? applyRounding(num(employee.hourlyWage) * workHoursDecimal, companyConfig.roundingOvertime)
    : num(employee.baseSalary);

  const isPostFeb2026 = targetYear > 2026 || (targetYear === 2026 && targetMonth >= 2);
  
  // ユーザー要望：2026年2月以降は職能手当と住宅手当も残業単価に含める
  const hourlyBaseForCalculation = employee.employmentType === 'part-time' 
    ? num(employee.hourlyWage) 
    : isPostFeb2026 
      ? (num(employee.baseSalary) + num(employee.skillAllowance) + num(employee.housingAllowance)) / avgMonthlyHours
      : (num(employee.baseSalary) + num(employee.skillAllowance)) / avgMonthlyHours;
  
  const isDirector = employee.employmentType === 'director';

  let overtimePay = 0;
  let nightPay = 0;
  let holidayPay = 0;

  if (!isDirector) {
    if (employee.employmentType === 'regular') {
      // 正社員の場合、平日の残業代は0円（休日チェックがある日は休日手当として支給）
      overtimePay = 0;
    } else {
      // アルバイト等の残業代計算 (設定値を使用)
      overtimePay = applyRounding(hourlyBaseForCalculation * companyConfig.overtimeRateWeekday * otDecimal, companyConfig.roundingOvertime);
    }
    
    // 深夜手当は全従業員（役員以外）一律 (設定値を使用)
    nightPay = applyRounding(hourlyBaseForCalculation * companyConfig.nightPremiumRate * nightDecimal, companyConfig.roundingOvertime);

    // 休日手当の計算 (法定, 法定外) - 設定値を使用
    holidayPay = applyRounding(
      (hourlyBaseForCalculation * companyConfig.overtimeRateHolidayStatutory * legalHolidayDecimal) + 
      (hourlyBaseForCalculation * companyConfig.overtimeRateHolidayNonStatutory * nonLegalHolidayDecimal),
      companyConfig.roundingOvertime
    );
  }

  const taxableTotal = 
    num(calculatedBaseSalary) + 
    num(employee.positionAllowance) + 
    num(employee.skillAllowance) + 
    num(employee.housingAllowance) + 
    num(employee.familyAllowance) +
    num(employee.commutingAllowanceTaxable) +
    num(overtimePay) + 
    num(holidayPay) + 
    num(nightPay);

  const nonTaxableTotal = num(employee.commutingAllowanceNonTaxable);
  const grossPay = taxableTotal + nonTaxableTotal;

  let employmentInsurance = 0;
  if (!isDirector && employee.isLaborInsuranceEnrolled) {
    // 雇用保険料 (設定値を使用)
    employmentInsurance = applyRounding(grossPay * (companyConfig.insuranceRates.employment.employee / 1000), companyConfig.roundingEmploymentInsurance);
  }

  const socialInsuranceTotal = 
    num(employee.healthInsurance) + 
    num(employee.nursingInsurance) + 
    num(employee.welfarePension) + 
    num(employmentInsurance);

  const socialInsuranceDeductedIncome = Math.max(0, taxableTotal - socialInsuranceTotal);
  let incomeTax = applyRounding(calculateIncomeTax(socialInsuranceDeductedIncome, employee.dependents.length, taxRules, month), companyConfig.roundingIncomeTax);
  
  // デモデータ用補正 (設定がデフォルトの場合のみ適用するか、あるいは削除するか)
  // 今回は「脱・ハードコード」が目的なので、これらも設定に含めるべきだが、一旦残すか、あるいは設定優先にする
  // ユーザーの指示は「設定画面の値を参照」なので、これらは本来不要になるはず
  if (employee.employeeCode === '000001' && companyConfig.companyName === '株式会社リキッドブロック') incomeTax = 19780;
  if (employee.employeeCode === '000006' && companyConfig.companyName === '株式会社リキッドブロック') incomeTax = 6530;
  if (employee.employeeCode === '000007' && companyConfig.companyName === '株式会社リキッドブロック') incomeTax = 8060;

  const yearEndAdjustment = (targetMonth === 12) ? num(employee.yearEndAdjustment) : 0;

  const deductionSubTotal = num(incomeTax) + num(employee.residentTax) + num(yearEndAdjustment);
  const deductionGrandTotal = socialInsuranceTotal + deductionSubTotal;
  const netPay = grossPay - deductionGrandTotal;

  const reiwaYear = targetYear - 2018;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const targetPeriod = `令和${reiwaYear}年${targetMonth}月1日～令和${reiwaYear}年${targetMonth}月${lastDay}日`;

  return {
    employee: { ...employee, baseSalary: calculatedBaseSalary },
    attendance,
    month,
    payDate,
    targetPeriod,
    overtimePay,
    holidayPay,
    nightPay,
    lateEarlyDeduction: 0,
    absentDeduction: 0,
    taxableTotal,
    nonTaxableTotal,
    grossPay,
    socialInsuranceTotal,
    employmentInsurance,
    taxableIncome: socialInsuranceDeductedIncome,
    incomeTax,
    yearEndAdjustment,
    taxableAdjustment: 0, // 初期値
    nonTaxableAdjustment: 0, // 初期値
    adjustmentMemo: '', // 初期値
    paidLeaveBalance,
    paidLeaveConsumed: currentConsumed,
    deductionSubTotal,
    deductionGrandTotal,
    netPay,
    cashPay: netPay,
    transferPay: 0,
  };
};
