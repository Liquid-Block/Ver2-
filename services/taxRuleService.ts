
import { TaxRule } from '../types';

const STORAGE_KEY = 'payroll_tax_rules';

export const taxRuleService = {
  async getRules(): Promise<TaxRule[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load tax rules:', e);
    }
    return [];
  },

  async saveRule(rule: TaxRule): Promise<void> {
    try {
      const current = await this.getRules();
      // Overwrite if same effective month, otherwise add
      const filtered = current.filter(r => r.effectiveMonth !== rule.effectiveMonth);
      const updated = [...filtered, rule].sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save tax rule:', e);
      throw e;
    }
  },

  async deleteRule(effectiveMonth: string): Promise<void> {
    try {
      const current = await this.getRules();
      const updated = current.filter(r => r.effectiveMonth !== effectiveMonth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete tax rule:', e);
      throw e;
    }
  }
};
