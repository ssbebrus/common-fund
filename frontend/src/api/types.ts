export interface Participant {
  id: number;
  name: string;
  created_at: string;
  contribution: number;
}

export interface Transaction {
  id: number;
  amount: number;
  category: 'DEPOSIT' | 'EXPENSE';
  description: string;
  timestamp: string;
  is_voided: boolean;
  participant_id?: number | null;
  participant_name?: string; // Optional helper
}

export interface FundSummary {
  total_balance: number;
  total_deposits: number;
  total_expenses: number;
  participant_contributions: Participant[];
}
