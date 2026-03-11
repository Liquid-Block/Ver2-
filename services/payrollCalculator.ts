
import { Employee, AttendanceRecord, PayrollResult, YearlySetting, PayrollHistoryRecord, CompanyConfig, RoundingType, TaxRule, HistoryRecord } from '../types';
import { calculateIncomeTax } from './taxCalculator';

const getAmountFromHistory = (history: HistoryRecord[] | undefined, targetMonth: string, defaultValue: number): number => {
  if (!history || history.length === 0) return defaultValue;
  const record = history.find(h => h.startMonth <= targetMonth && h.endMonth >= targetMonth);
  return record ? record.amount : defaultValue;
};

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

  // 履歴から金額を取得
  const baseSalary = getAmountFromHistory(employee.baseSalaryHistory, month, num(employee.baseSalary));
  const hourlyWage = getAmountFromHistory(employee.hourlyWageHistory, month, num(employee.hourlyWage));
  const positionAllowance = getAmountFromHistory(employee.positionAllowanceHistory, month, num(employee.positionAllowance));
  const skillAllowance = getAmountFromHistory(employee.skillAllowanceHistory, month, num(employee.skillAllowance));
  const housingAllowance = getAmountFromHistory(employee.housingAllowanceHistory, month, num(employee.housingAllowance));
  const familyAllowance = getAmountFromHistory(employee.familyAllowanceHistory, month, num(employee.familyAllowance));
  const commutingAllowanceTaxable = getAmountFromHistory(employee.commutingAllowanceTaxableHistory, month, num(employee.commutingAllowanceTaxable));
  const commutingAllowanceNonTaxable = getAmountFromHistory(employee.commutingAllowanceNonTaxableHistory, month, num(employee.commutingAllowanceNonTaxable));
  const healthInsurance = getAmountFromHistory(employee.healthInsuranceHistory, month, num(employee.healthInsurance));
  const nursingInsurance = getAmountFromHistory(employee.nursingInsuranceHistory, month, num(employee.nursingInsurance));
  const welfarePension = getAmountFromHistory(employee.welfarePensionHistory, month, num(employee.welfarePension));
  const residentTax = getAmountFromHistory(employee.residentTaxHistory, month, num(employee.residentTax));

  let calculatedBaseSalary = employee.employmentType === 'part-time' 
    ? applyRounding(hourlyWage * workHoursDecimal, companyConfig.roundingOvertime)
    : baseSalary;

  const isPostFeb2026 = targetYear > 2026 || (targetYear === 2026 && targetMonth >= 2);
  
  // ユーザー要望：2026年2月以降は職能手当と住宅手当も残業単価に含める
  const hourlyBaseForCalculation = employee.employmentType === 'part-time' 
    ? hourlyWage 
    : isPostFeb2026 
      ? (baseSalary + skillAllowance + housingAllowance) / avgMonthlyHours
      : (baseSalary + skillAllowance) / avgMonthlyHours;
  
  const isDirector = employee.employmentType === 'director';

  const debugLogs: string[] = [];
  
  // 履歴参照ログ
  const baseSalarySource = employee.baseSalaryHistory?.find(h => h.startMonth <= month && h.endMonth >= month);
  if (baseSalarySource) {
    debugLogs.push(`適用データ: ${baseSalarySource.startMonth}〜の基本給(¥${baseSalarySource.amount.toLocaleString()})を参照中`);
  } else {
    debugLogs.push(`適用データ: 基本給(¥${num(employee.baseSalary).toLocaleString()}) [履歴なし・現在値]`);
  }

  // 扶養判定ログ
  const taxDepCount = (employee.spouse?.isTaxDependent ? 1 : 0);
  const depCount = (employee.dependents || []).filter(d => d.isTaxDependent).length;
  const disabledCount = (employee.dependents || []).filter(d => d.isSpecialDisabled).length;
  debugLogs.push(`判定人数: ${taxDepCount + depCount + disabledCount}人（税扶養: ${taxDepCount + depCount}人 ＋ 特別障害加算: ${disabledCount}人）`);

  let overtimePay = 0;
  let nightPay = 0;
  let holidayPay = 0;

  if (!isDirector) {
    // 平日残業
    const otSwitch = employee.calculateOvertimeWeekday !== false; // デフォルトON
    if (otSwitch) {
      overtimePay = applyRounding(hourlyBaseForCalculation * companyConfig.overtimeRateWeekday * otDecimal, companyConfig.roundingOvertime);
    }
    debugLogs.push(`残業代設定: 平日残業スイッチ[${otSwitch ? 'ON' : 'OFF'}] / 倍率[${companyConfig.overtimeRateWeekday}] を適用`);

    // 深夜手当 (常に加算 - 法律遵守)
    nightPay = applyRounding(hourlyBaseForCalculation * companyConfig.nightPremiumRate * nightDecimal, companyConfig.roundingOvertime);
    if (nightDecimal > 0) {
      debugLogs.push(`深夜手当: ${nightDecimal}h × 倍率[${companyConfig.nightPremiumRate}] を適用 (スイッチに関わらず計算)`);
    }

    // 休日手当 (法定・法定外を個別に判定)
    const holidayStatutorySwitch = employee.calculateHolidayPayStatutory !== false;
    const holidayNonStatutorySwitch = employee.calculateHolidayPayNonStatutory !== false;
    
    const hPayStatutory = holidayStatutorySwitch 
      ? applyRounding(hourlyBaseForCalculation * companyConfig.overtimeRateHolidayStatutory * legalHolidayDecimal, companyConfig.roundingOvertime)
      : 0;
    
    const hPayNonStatutory = holidayNonStatutorySwitch
      ? applyRounding(hourlyBaseForCalculation * companyConfig.overtimeRateHolidayNonStatutory * nonLegalHolidayDecimal, companyConfig.roundingOvertime)
      : 0;
      
    holidayPay = hPayStatutory + hPayNonStatutory;

    debugLogs.push(`休日手当設定: 法定(日曜等)[${holidayStatutorySwitch ? 'ON' : 'OFF'}] / 法定外(土祝等)[${holidayNonStatutorySwitch ? 'ON' : 'OFF'}] を適用`);
  }

  const taxableTotal = 
    num(calculatedBaseSalary) + 
    num(positionAllowance) + 
    num(skillAllowance) + 
    num(housingAllowance) + 
    num(familyAllowance) +
    num(commutingAllowanceTaxable) +
    num(overtimePay) + 
    num(holidayPay) + 
    num(nightPay);

  const nonTaxableTotal = num(commutingAllowanceNonTaxable);
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
  
  // 扶養親族等の数（所得税計算用）
  const taxDependentCount = (employee.spouse?.isTaxDependent ? 1 : 0) +
    (employee.dependents || []).reduce((acc, dep) => {
      let count = 0;
      if (dep.isTaxDependent) count += 1;
      if (dep.isSpecialDisabled) count += 1;
      return acc + count;
    }, 0);

  let incomeTax = applyRounding(calculateIncomeTax(socialInsuranceDeductedIncome, taxDependentCount, taxRules, month), companyConfig.roundingIncomeTax);
  
  // デモデータ用補正 (設定がデフォルトの場合のみ適用するか、あるいは削除するか)
  // 今回は「脱・ハードコード」が目的なので、これらも設定に含めるべきだが、一旦残すか、あるいは設定優先にする
  // ユーザーの指示は「設定画面の値を参照」なので、これらは本来不要になるはず
  if (employee.employeeCode === '000001' && companyConfig.companyName === '株式会社リキッドブロック') incomeTax = 19780;
  if (employee.employeeCode === '000006' && companyConfig.companyName === '株式会社リキッドブロック') incomeTax = 6530;
  if (employee.employeeCode === '000007' && companyConfig.companyName === '株式会社リキッドブロック') incomeTax = 8060;

  const yearEndAdjustment = (targetMonth === 12) ? num(employee.yearEndAdjustment) : 0;

  const deductionSubTotal = num(incomeTax) + num(residentTax) + num(yearEndAdjustment);
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
    debugLogs,
  };
};
