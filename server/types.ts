/**
 * Row types for the tables in supabase/migrations. Once your Supabase project is linked you can
 * replace these with generated types: `npx supabase gen types typescript --linked > server/database.types.ts`.
 */
export interface GroupRow {
  id: string;
  token: string;
  name: string;
  currency: string;
  kind: "group" | "quick";
  organizer_key_hash: string;
  locked: boolean;
  created_at: string;
  last_activity_at: string;
}

export interface ParticipantRow {
  id: string;
  group_id: string;
  name: string;
  status: "active" | "pending" | "removed";
  device_id: string | null;
  default_share: number;
  gcash: string | null;
  maya: string | null;
  pay_qr_path: string | null;
  first_seen_at: string | null;
  created_at: string;
}

export interface EntryRow {
  id: string;
  group_id: string;
  kind: "expense" | "transfer" | "income";
  title: string;
  amount: number;
  payer_id: string;
  recipient_id: string | null;
  split_mode: "equal" | "shares" | "percent" | "fixed";
  category: string | null;
  entry_date: string;
  bill_id: string | null;
  payment_id: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  entry_splits?: { participant_id: string; amount: number; weight: number | null }[];
}

export interface BillRow {
  id: string;
  group_id: string;
  token: string;
  title: string;
  merchant: string | null;
  receipt_date: string | null;
  payer_id: string;
  created_by: string | null;
  status: "claiming" | "finalized" | "paid";
  receipt_total: number | null;
  image_paths: string[];
  claim_deadline: string | null;
  created_at: string;
  finalized_at: string | null;
  paid_at: string | null;
  selection_version: number;
}

export interface BillItemRow {
  id: string;
  bill_id: string;
  position: number;
  name: string;
  qty: number;
  total: number;
  shared_by_all: boolean;
  share_count: number | null;
  source_part: number;
}

export interface PaymentRow {
  id: string;
  group_id: string;
  bill_id: string | null;
  from_id: string;
  to_id: string;
  amount: number;
  method: "gcash" | "maya" | "bank" | "cash" | "other";
  reference: string | null;
  note: string | null;
  proof_path: string | null;
  status: "pending" | "confirmed" | "rejected";
  reject_reason: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface ActivityRow {
  id: number;
  group_id: string;
  actor_id: string | null;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
}
