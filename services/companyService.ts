
import { CompanyConfig } from '../types';
import { DEFAULT_COMPANY_CONFIG } from '../constants';

// NOTE: In a real production environment with Firestore, you would use the Firebase SDK.
// The path requested was: /artifacts/{appId}/public/data/config/company
// For this implementation, we use localStorage to ensure persistence in the preview environment.

const STORAGE_KEY = 'payroll_company_config';

export const companyService = {
  async getConfig(): Promise<CompanyConfig> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load company config:', e);
    }
    return DEFAULT_COMPANY_CONFIG;
  },

  async saveConfig(config: CompanyConfig): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // If this were a real Firestore integration, we would do:
      // await setDoc(doc(db, "config", "company"), config);
    } catch (e) {
      console.error('Failed to save company config:', e);
      throw e;
    }
  }
};
