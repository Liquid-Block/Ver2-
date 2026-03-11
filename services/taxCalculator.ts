
import { TaxRule } from '../types';

/**
 * 所得税額表（CSV）に基づく計算
 * @param taxableIncome 社会保険料等控除後の給与額
 * @param dependentCount 扶養親族等の数
 * @param taxRules 登録されている税額表のリスト
 * @param targetMonth 対象月 (YYYY-MM)
 */
export const calculateIncomeTax = (
  taxableIncome: number, 
  dependentCount: number, 
  taxRules: TaxRule[], 
  targetMonth: string
): number => {
  if (taxableIncome < 88000) return 0;

  // 対象月以前で最も新しい適用開始年月を持つルールを選択
  const activeRule = taxRules
    .filter(r => r.effectiveMonth <= targetMonth)
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))[0];

  if (!activeRule || !activeRule.csvData || activeRule.csvData.length === 0) {
    // ルールがない場合は従来の簡易計算（フォールバック）
    return fallbackCalculateIncomeTax(taxableIncome, dependentCount);
  }

  // 行検索: 1列目(index[0])が数値（ID）である行のみ
  for (const row of activeRule.csvData) {
    const id = parseInt(row[0], 10);
    if (isNaN(id)) continue;

    const min = parseInt(row[1]?.replace(/,/g, ''), 10) || 0;
    const maxStr = row[2]?.replace(/,/g, '') || '';
    const max = parseInt(maxStr, 10) || Infinity;

    if (taxableIncome >= min && taxableIncome < max) {
      // 列抽出: 3 + dependentsCount 番目のインデックス
      const colIndex = 3 + dependentCount;
      const taxStr = row[colIndex]?.replace(/,/g, '');
      const tax = parseInt(taxStr, 10);
      return isNaN(tax) ? 0 : tax;
    }
  }

  return fallbackCalculateIncomeTax(taxableIncome, dependentCount);
};

const fallbackCalculateIncomeTax = (taxableIncome: number, dependentCount: number): number => {
  if (taxableIncome < 88000) return 0;
  const adjustedIncome = Math.max(0, taxableIncome - (dependentCount * 20000));
  let tax = 0;
  if (adjustedIncome < 88000) {
    tax = 0;
  } else if (adjustedIncome < 100000) {
    tax = (adjustedIncome - 88000) * 0.05;
  } else if (adjustedIncome < 200000) {
    tax = 600 + (adjustedIncome - 100000) * 0.05;
  } else if (adjustedIncome < 300000) {
    tax = 5600 + (adjustedIncome - 200000) * 0.1;
  } else if (adjustedIncome < 400000) {
    tax = 15600 + (adjustedIncome - 300000) * 0.2;
  } else {
    tax = 35600 + (adjustedIncome - 400000) * 0.23;
  }
  return Math.floor(tax);
};
