export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: 'admin' | 'agent'
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: 'admin' | 'agent'
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: 'admin' | 'agent'
        }
        Relationships: []
      }
      attendance: {
        Row: {
          agent_id: string
          time_in: string
          time_out: string | null
          qr_verified: boolean
        }
        Insert: {
          agent_id: string
          time_in?: string
          time_out?: string | null
          qr_verified: boolean
        }
        Update: {
          agent_id?: string
          time_in?: string
          time_out?: string | null
          qr_verified?: boolean
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          resumption_time: string
          closing_time: string
          late_threshold_minutes: number
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          resumption_time: string
          closing_time: string
          late_threshold_minutes: number
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          resumption_time?: string
          closing_time?: string
          late_threshold_minutes?: number
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      attendance_exceptions: {
        Row: {
          id: string
          agent_id: string
          exception_date: string
          note: string
          granted_by: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          exception_date: string
          note: string
          granted_by: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          exception_date?: string
          note?: string
          granted_by?: string
          created_at?: string
        }
        Relationships: []
      }
      attendance_qr: {
        Row: {
          id: string
          qr_code: string
          label: string
          qr_value: string
          is_active: boolean
          activated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          qr_code: string
          label: string
          qr_value: string
          is_active?: boolean
          activated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          qr_code?: string
          label?: string
          qr_value?: string
          is_active?: boolean
          activated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_activation_logs: {
        Row: {
          id: string
          qr_id: string
          qr_code: string
          activated_by: string | null
          activated_at: string
          note: string | null
        }
        Insert: {
          id?: string
          qr_id: string
          qr_code: string
          activated_by?: string | null
          activated_at?: string
          note?: string | null
        }
        Update: {
          id?: string
          qr_id?: string
          qr_code?: string
          activated_by?: string | null
          activated_at?: string
          note?: string | null
        }
        Relationships: []
      }
      attendance_qr_tokens: {
        Row: {
          valid_date: string
          token_hash: string
          created_by: string
          created_at: string
        }
        Insert: {
          valid_date: string
          token_hash: string
          created_by: string
          created_at?: string
        }
        Update: {
          valid_date?: string
          token_hash?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      punch_in_with_qr: {
        Args: { p_qr_token: string }
        Returns: {
          agent_id: string
          time_in: string
          time_out: string | null
          qr_verified: boolean
        }
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}