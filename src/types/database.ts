export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Specialist {
  id: string;
  full_name: string;
  phone: string;
  commission_rate: number;
  is_active: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  whatsapp_phone: string;
  notes?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  specialist_id: string;
  service_id: string;
  appointment_date: string; // ISO string
  status: AppointmentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  
  // Relaciones anidadas
  client?: Client;
  specialist?: Specialist;
  service?: Service;
}

export interface ProductivityLog {
  id: string;
  appointment_id: string;
  specialist_id: string;
  service_amount: number;
  commission_rate: number;
  commission_earned: number;
  logged_at: string;
  
  // Relaciones
  specialist?: Specialist;
  appointment?: Appointment;
}

export interface ReminderCandidate {
  appointment_id: string;
  client_id: string;
  client_name: string;
  whatsapp_phone: string;
  service_name: string;
  specialist_name: string;
  completion_date: string;
  days_since: number;
  has_future_appointment: boolean;
  whatsapp_url: string;
  message_text: string;
  already_notified: boolean;
}
