export type MemberStatus = 'Pending Verification' | 'Active' | 'Expired' | 'Suspended';

export interface Member {
  id: string;
  nama: string;
  nomor_whatsapp: string;
  alamat: string;
  foto_url?: string;
  status: MemberStatus;
  membership_type: string;
  tanggal_daftar: Date;
  tanggal_expired: Date;
  qr_token: string;
  verification_status: boolean;
  created_at: Date;
}

export interface MemberCard {
  member_id: string;
  qr_code_url: string;
  digital_card_url: string;
  generated_at: Date;
  expired_at: Date;
  is_active: boolean;
}

export interface VerificationToken {
  member_id: string;
  token: string;
  expired_at: Date;
  verified: boolean;
  created_at: Date;
}

export interface CheckInSession {
  id: string;
  member_id: string;
  scanned_at: Date;
  status: 'Success' | 'Failed';
  reason?: string;
}

// SPK Equipment schema
export interface Equipment {
  id: string;
  name: string;
  category: string;
  condition_score: number; // 1-100
  last_maintenance: Date;
  usage_frequency: 'High' | 'Medium' | 'Low';
  priority_badge: 'Critical' | 'Warning' | 'Good';
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  sender_photo?: string;
  content: string;
  created_at: any;
}
