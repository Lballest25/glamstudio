// Hand-written to match glamstudio/supabase/migrations/*.sql.
// Once the Supabase CLI is set up, replace this file with the real output of:
//   supabase gen types typescript --project-id <ref> > src/app/core/models/database.types.ts
// The shape (Database.public.Tables.<table>.Row/Insert/Update/Relationships,
// Database.public.Functions.<fn>.Args/Returns) matches the generator's
// output so that swap is a drop-in replacement.

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type ServiceCategory = 'pestañas' | 'cejas' | 'depilacion' | 'tratamiento' | 'otro';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'partial';
export type BenefitType = 'discount' | 'gift';
export type ExpenseCategory = 'insumos' | 'renta' | 'servicios' | 'marketing' | 'otro';
export type WhatsappMessageType =
  | 'loyalty_alert'
  | 'benefit_unlocked'
  | 'appointment_reminder'
  | 'birthday'
  | 'gift_notification'
  | 'manual';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          business_name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          timezone: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; full_name: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          birth_date: string | null;
          photo_url: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['clients']['Row']> & { owner_id: string; full_name: string };
        Update: Partial<Database['public']['Tables']['clients']['Row']>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          category: ServiceCategory;
          base_price: number;
          duration_min: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['services']['Row']> & {
          owner_id: string;
          name: string;
          category: ServiceCategory;
          base_price: number;
        };
        Update: Partial<Database['public']['Tables']['services']['Row']>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string;
          scheduled_at: string;
          completed_at: string | null;
          status: AppointmentStatus;
          notes: string | null;
          session_number: number | null;
          is_benefit_session: boolean;
          discount_pct: number;
          subtotal: number | null;
          total_amount: number | null;
          duration_min: number | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['appointments']['Row']> & {
          owner_id: string;
          client_id: string;
          scheduled_at: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'appointments_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          }
        ];
      };
      appointment_services: {
        Row: {
          id: string;
          appointment_id: string;
          service_id: string;
          price_at_time: number;
          quantity: number;
          notes: string | null;
        };
        Insert: Partial<Database['public']['Tables']['appointment_services']['Row']> & {
          appointment_id: string;
          service_id: string;
          price_at_time: number;
        };
        Update: Partial<Database['public']['Tables']['appointment_services']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'appointment_services_appointment_id_fkey';
            columns: ['appointment_id'];
            isOneToOne: false;
            referencedRelation: 'appointments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointment_services_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          owner_id: string;
          appointment_id: string;
          client_id: string;
          amount: number;
          method: PaymentMethod;
          reference: string | null;
          paid_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & {
          owner_id: string;
          appointment_id: string;
          client_id: string;
          amount: number;
        };
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
        Relationships: [];
      };
      loyalty_rules: {
        Row: {
          id: string;
          owner_id: string;
          stage_order: number;
          sessions_required: number;
          benefit_type: BenefitType;
          benefit_value: number | null;
          description: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['loyalty_rules']['Row']> & {
          owner_id: string;
          stage_order: number;
          sessions_required: number;
          benefit_type: BenefitType;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['loyalty_rules']['Row']>;
        Relationships: [];
      };
      loyalty_progress: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string;
          total_sessions: number;
          current_stage_order: number;
          stage_sessions: number;
          benefit_pending: boolean;
          pending_benefit_type: BenefitType | null;
          pending_benefit_value: number | null;
          sessions_to_next: number | null;
          alert_pending: boolean;
          alert_message: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['loyalty_progress']['Row']> & {
          owner_id: string;
          client_id: string;
        };
        Update: Partial<Database['public']['Tables']['loyalty_progress']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'loyalty_progress_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          }
        ];
      };
      rewards: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string;
          appointment_id: string | null;
          reward_type: BenefitType;
          reward_value: number | null;
          description: string;
          redeemed_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['rewards']['Row']> & {
          owner_id: string;
          client_id: string;
          reward_type: BenefitType;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['rewards']['Row']>;
        Relationships: [];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string;
          phone: string;
          message_type: WhatsappMessageType;
          message_body: string;
          method: 'deep_link' | 'whatsapp_api';
          status: 'sent' | 'failed' | 'pending';
          sent_at: string;
          api_message_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['whatsapp_messages']['Row']> & {
          owner_id: string;
          client_id: string;
          phone: string;
          message_type: WhatsappMessageType;
          message_body: string;
        };
        Update: Partial<Database['public']['Tables']['whatsapp_messages']['Row']>;
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: string;
          owner_id: string;
          key: string;
          value: unknown;
          description: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['business_settings']['Row']> & {
          owner_id: string;
          key: string;
          value: unknown;
        };
        Update: Partial<Database['public']['Tables']['business_settings']['Row']>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          owner_id: string;
          amount: number;
          category: ExpenseCategory;
          description: string;
          spent_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & {
          owner_id: string;
          amount: number;
          description: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Row']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      public_list_services: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          description: string | null;
          category: ServiceCategory;
          base_price: number;
          duration_min: number;
          sort_order: number;
        }[];
      };
      public_get_available_slots: {
        Args: { p_date: string; p_service_ids: string[] };
        Returns: { slot_start: string }[];
      };
      public_check_phone_benefit: {
        Args: { p_phone: string };
        Returns: boolean;
      };
      public_create_booking: {
        Args: {
          p_client_name: string;
          p_client_phone: string;
          p_client_email: string | null;
          p_scheduled_at: string;
          p_service_ids: string[];
        };
        Returns: {
          appointment_id: string;
          scheduled_at: string;
          subtotal: number;
          has_pending_benefit: boolean;
        }[];
      };
      admin_create_appointment: {
        Args: {
          p_client_id: string;
          p_scheduled_at: string;
          p_service_ids: string[];
          p_notes?: string | null;
        };
        Returns: string;
      };
      complete_appointment_and_pay: {
        Args: {
          p_appointment_id: string;
          p_discount_pct: number;
          p_subtotal: number;
          p_total_amount: number;
          p_payment_method: PaymentMethod;
          p_payment_reference?: string | null;
          p_payment_notes?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
