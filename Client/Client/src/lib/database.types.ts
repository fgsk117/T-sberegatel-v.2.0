export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          created_at: string
          last_login: string
        }
        Insert: {
          id?: string
          username: string
          created_at?: string
          last_login?: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string
          last_login?: string
        }
      }
      financial_profiles: {
        Row: {
          id: string
          user_id: string
          monthly_salary: number
          monthly_savings: number
          current_balance: number
          consider_savings: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          monthly_salary?: number
          monthly_savings?: number
          current_balance?: number
          consider_savings?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monthly_salary?: number
          monthly_savings?: number
          current_balance?: number
          consider_savings?: boolean
          updated_at?: string
        }
      }
      cooling_ranges: {
        Row: {
          id: string
          user_id: string
          min_amount: number
          max_amount: number | null
          cooling_days: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          min_amount: number
          max_amount?: number | null
          cooling_days: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          min_amount?: number
          max_amount?: number | null
          cooling_days?: number
          created_at?: string
        }
      }
      categories_blacklist: {
        Row: {
          id: string
          user_id: string
          category_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_name?: string
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          name: string
          price: number
          category: string
          url: string | null
          cooling_until: string
          status: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          price: number
          category: string
          url?: string | null
          cooling_until: string
          status?: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          price?: number
          category?: string
          url?: string | null
          cooling_until?: string
          status?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      purchase_history: {
        Row: {
          id: string
          user_id: string
          purchase_id: string | null
          action: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          purchase_id?: string | null
          action: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          purchase_id?: string | null
          action?: string
          notes?: string | null
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          frequency: string
          channel: string
          enabled: boolean
          exclude_categories: string[]
          last_notification_sent: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          frequency?: string
          channel?: string
          enabled?: boolean
          exclude_categories?: string[]
          last_notification_sent?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          frequency?: string
          channel?: string
          enabled?: boolean
          exclude_categories?: string[]
          last_notification_sent?: string | null
          updated_at?: string
        }
      }
      ai_prompts: {
        Row: {
          id: string
          name: string
          prompt_text: string
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          prompt_text: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          prompt_text?: string
          description?: string | null
          updated_at?: string
        }
      }
    }
  }
}
