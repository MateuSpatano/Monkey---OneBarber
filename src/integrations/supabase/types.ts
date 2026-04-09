export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          checked_in_at: string | null
          checkout_at: string | null
          client_id: string | null
          duration_minutes: number | null
          created_at: string
          establishment_id: string | null
          id: string
          notes: string | null
          professional_id: string | null
          service: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          checked_in_at?: string | null
          checkout_at?: string | null
          client_id?: string | null
          duration_minutes?: number | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          notes?: string | null
          professional_id?: string | null
          service: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          checked_in_at?: string | null
          checkout_at?: string | null
          client_id?: string | null
          duration_minutes?: number | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          notes?: string | null
          professional_id?: string | null
          service?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action: Database["public"]["Enums"]["automation_action"]
          action_config: Json | null
          campaign_id: string | null
          created_at: string
          description: string | null
          execution_count: number | null
          id: string
          last_executed_at: string | null
          name: string
          status: Database["public"]["Enums"]["automation_status"]
          template_id: string | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          trigger_config: Json | null
          updated_at: string
        }
        Insert: {
          action: Database["public"]["Enums"]["automation_action"]
          action_config?: Json | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          last_executed_at?: string | null
          name: string
          status?: Database["public"]["Enums"]["automation_status"]
          template_id?: string | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          trigger_config?: Json | null
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["automation_action"]
          action_config?: Json | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          last_executed_at?: string | null
          name?: string
          status?: Database["public"]["Enums"]["automation_status"]
          template_id?: string | null
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          trigger_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rules: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          body_email: string | null
          body_whatsapp: string | null
          budget: number | null
          channel: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          name: string
          spent: number | null
          start_date: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          body_email?: string | null
          body_whatsapp?: string | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          name: string
          spent?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          body_email?: string | null
          body_whatsapp?: string | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          name?: string
          spent?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_movements: {
        Row: {
          amount: number
          cash_register_id: string
          category: Database["public"]["Enums"]["expense_category"] | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          is_immutable: boolean
          occurred_at: string
          origin: Database["public"]["Enums"]["cash_movement_origin"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          reference_id: string | null
          type: Database["public"]["Enums"]["cash_movement_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          cash_register_id: string
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          is_immutable?: boolean
          occurred_at?: string
          origin: Database["public"]["Enums"]["cash_movement_origin"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_id?: string | null
          type: Database["public"]["Enums"]["cash_movement_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          is_immutable?: boolean
          occurred_at?: string
          origin?: Database["public"]["Enums"]["cash_movement_origin"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_id?: string | null
          type?: Database["public"]["Enums"]["cash_movement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          cash_difference: number | null
          closed_at: string | null
          closed_by_user_id: string | null
          closing_cash_counted: number | null
          closing_payment_summary: Json | null
          created_at: string
          expected_cash_amount: number | null
          id: string
          notes_closing: string | null
          notes_opening: string | null
          opened_at: string
          opened_by_user_id: string
          opening_cash_amount: number
          status: Database["public"]["Enums"]["cash_register_status"]
          updated_at: string
        }
        Insert: {
          cash_difference?: number | null
          closed_at?: string | null
          closed_by_user_id?: string | null
          closing_cash_counted?: number | null
          closing_payment_summary?: Json | null
          created_at?: string
          expected_cash_amount?: number | null
          id?: string
          notes_closing?: string | null
          notes_opening?: string | null
          opened_at?: string
          opened_by_user_id: string
          opening_cash_amount?: number
          status?: Database["public"]["Enums"]["cash_register_status"]
          updated_at?: string
        }
        Update: {
          cash_difference?: number | null
          closed_at?: string | null
          closed_by_user_id?: string | null
          closing_cash_counted?: number | null
          closing_payment_summary?: Json | null
          created_at?: string
          expected_cash_amount?: number | null
          id?: string
          notes_closing?: string | null
          notes_opening?: string | null
          opened_at?: string
          opened_by_user_id?: string
          opening_cash_amount?: number
          status?: Database["public"]["Enums"]["cash_register_status"]
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          establishment_id: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          state: string | null
          status: string | null
          street: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          establishment_id?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          establishment_id?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["commission_payment_status"]
          professional_id: string
          reference_date: string
          reference_id: string | null
          reference_type: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["commission_payment_status"]
          professional_id: string
          reference_date: string
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["commission_payment_status"]
          professional_id?: string
          reference_date?: string
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          action_type: string
          body: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string
          body: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          automation_id: string | null
          campaign_id: string | null
          client_id: string | null
          content: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          subject: string | null
          type: Database["public"]["Enums"]["communication_type"]
          updated_at: string
        }
        Insert: {
          automation_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          content: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          type: Database["public"]["Enums"]["communication_type"]
          updated_at?: string
        }
        Update: {
          automation_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          content?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["communication_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          document_number: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          opening_hours: Json | null
          phone: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      financial_audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          entity_id: string
          entity_type: string
          id: string
          occurred_at: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          occurred_at?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount_gross: number
          amount_net: number | null
          cash_movement_id: string | null
          cash_register_id: string | null
          category: Database["public"]["Enums"]["expense_category"] | null
          created_at: string
          description: string | null
          fee_amount: number
          id: string
          is_immutable: boolean
          occurred_at: string
          origin: Database["public"]["Enums"]["cash_movement_origin"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          professional_id: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["cash_movement_type"]
          updated_at: string
        }
        Insert: {
          amount_gross: number
          amount_net?: number | null
          cash_movement_id?: string | null
          cash_register_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          description?: string | null
          fee_amount?: number
          id?: string
          is_immutable?: boolean
          occurred_at?: string
          origin: Database["public"]["Enums"]["cash_movement_origin"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          professional_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["cash_movement_type"]
          updated_at?: string
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          cash_movement_id?: string | null
          cash_register_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string
          description?: string | null
          fee_amount?: number
          id?: string
          is_immutable?: boolean
          occurred_at?: string
          origin?: Database["public"]["Enums"]["cash_movement_origin"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          professional_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["cash_movement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_cash_movement_id_fkey"
            columns: ["cash_movement_id"]
            isOneToOne: false
            referencedRelation: "cash_register_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          credentials_encrypted: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          provider: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          provider: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          provider?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          client_id: string
          created_at: string
          establishment_id: string | null
          id: string
          last_interaction_at: string | null
          lifetime_points: number
          points: number
          tier: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          establishment_id?: string | null
          id?: string
          last_interaction_at?: string | null
          lifetime_points?: number
          points?: number
          tier?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          establishment_id?: string | null
          id?: string
          last_interaction_at?: string | null
          lifetime_points?: number
          points?: number
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          establishment_id: string | null
          id: string
          points_used: number
          redeemed_at: string | null
          reward_type: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          establishment_id?: string | null
          id?: string
          points_used?: number
          redeemed_at?: string | null
          reward_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          establishment_id?: string | null
          id?: string
          points_used?: number
          redeemed_at?: string | null
          reward_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          item_type: string
          name: string
          product_id: string | null
          professional_id: string | null
          quantity: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          item_type: string
          name: string
          product_id?: string | null
          professional_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          item_type?: string
          name?: string
          product_id?: string | null
          professional_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          description: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          description?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          description?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
        }
        Relationships: []
      }
      product_raw_materials: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_raw_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_raw_materials_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cest: string | null
          cfop: string | null
          cost: number | null
          created_at: string | null
          duration_minutes: number | null
          csosn: string | null
          description: string | null
          icms_rate: number | null
          id: string
          iss_rate: number | null
          min_stock: number | null
          name: string
          ncm: string | null
          origin: string | null
          price: number
          service_code: string | null
          sku: string | null
          status: string | null
          stock_quantity: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cest?: string | null
          cfop?: string | null
          cost?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          csosn?: string | null
          description?: string | null
          icms_rate?: number | null
          id?: string
          iss_rate?: number | null
          min_stock?: number | null
          name: string
          ncm?: string | null
          origin?: string | null
          price?: number
          service_code?: string | null
          sku?: string | null
          status?: string | null
          stock_quantity?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cest?: string | null
          cfop?: string | null
          cost?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          csosn?: string | null
          description?: string | null
          icms_rate?: number | null
          id?: string
          iss_rate?: number | null
          min_stock?: number | null
          name?: string
          ncm?: string | null
          origin?: string | null
          price?: number
          service_code?: string | null
          sku?: string | null
          status?: string | null
          stock_quantity?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      professional_attachments: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_attachments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          professional_id: string
          slot_interval: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          professional_id: string
          slot_interval?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          professional_id?: string
          slot_interval?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_availability_exceptions: {
        Row: {
          created_at: string
          end_time: string | null
          exception_date: string
          id: string
          is_available: boolean
          professional_id: string
          reason: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          exception_date: string
          id?: string
          is_available?: boolean
          professional_id: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          exception_date?: string
          id?: string
          is_available?: boolean
          professional_id?: string
          reason?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_exceptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_commission_settings: {
        Row: {
          chair_rental_amount: number | null
          chair_rental_enabled: boolean | null
          chair_rental_period: string | null
          combo_enabled: boolean | null
          combo_percentage: number | null
          created_at: string
          fixed_per_service_amount: number | null
          fixed_per_service_enabled: boolean | null
          id: string
          product_sales_enabled: boolean | null
          product_sales_percentage: number | null
          professional_id: string
          revenue_percentage_enabled: boolean | null
          revenue_percentage_rate: number | null
          service_percentage_enabled: boolean | null
          service_percentage_rate: number | null
          updated_at: string
        }
        Insert: {
          chair_rental_amount?: number | null
          chair_rental_enabled?: boolean | null
          chair_rental_period?: string | null
          combo_enabled?: boolean | null
          combo_percentage?: number | null
          created_at?: string
          fixed_per_service_amount?: number | null
          fixed_per_service_enabled?: boolean | null
          id?: string
          product_sales_enabled?: boolean | null
          product_sales_percentage?: number | null
          professional_id: string
          revenue_percentage_enabled?: boolean | null
          revenue_percentage_rate?: number | null
          service_percentage_enabled?: boolean | null
          service_percentage_rate?: number | null
          updated_at?: string
        }
        Update: {
          chair_rental_amount?: number | null
          chair_rental_enabled?: boolean | null
          chair_rental_period?: string | null
          combo_enabled?: boolean | null
          combo_percentage?: number | null
          created_at?: string
          fixed_per_service_amount?: number | null
          fixed_per_service_enabled?: boolean | null
          id?: string
          product_sales_enabled?: boolean | null
          product_sales_percentage?: number | null
          professional_id?: string
          revenue_percentage_enabled?: boolean | null
          revenue_percentage_rate?: number | null
          service_percentage_enabled?: boolean | null
          service_percentage_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_commission_settings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_commission_tiers: {
        Row: {
          bonus_amount: number | null
          commission_rate: number
          created_at: string
          id: string
          max_value: number | null
          min_value: number
          professional_id: string
          tier_type: string
          updated_at: string
        }
        Insert: {
          bonus_amount?: number | null
          commission_rate?: number
          created_at?: string
          id?: string
          max_value?: number | null
          min_value?: number
          professional_id: string
          tier_type?: string
          updated_at?: string
        }
        Update: {
          bonus_amount?: number | null
          commission_rate?: number
          created_at?: string
          id?: string
          max_value?: number | null
          min_value?: number
          professional_id?: string
          tier_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_commission_tiers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_service_commissions: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          professional_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          professional_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          professional_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_service_commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_service_commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          commission_rate: number | null
          cpf: string | null
          created_at: string | null
          email: string | null
          establishment_id: string | null
          id: string
          name: string
          neighborhood: string | null
          phone: string | null
          specialty: string | null
          state: string | null
          status: string | null
          street: string | null
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          commission_rate?: number | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          establishment_id?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          phone?: string | null
          specialty?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          commission_rate?: number | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          establishment_id?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          phone?: string | null
          specialty?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      report_definitions: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean
          name: string
          query_config: Json | null
          type: string
          updated_at: string
          visualization_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          query_config?: Json | null
          type: string
          updated_at?: string
          visualization_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          query_config?: Json | null
          type?: string
          updated_at?: string
          visualization_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "report_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      report_groups: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_establishments: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          is_owner: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          is_owner?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          is_owner?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_establishments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_cash_register_totals: {
        Args: { register_id: string }
        Returns: {
          total_expenses: number
          total_expenses_cash: number
          total_income_card_credit: number
          total_income_card_debit: number
          total_income_cash: number
          total_income_other: number
          total_income_pix: number
        }[]
      }
      confirm_payment: {
        Args: {
          p_amount_gross?: number
          p_category?: Database["public"]["Enums"]["expense_category"]
          p_description?: string
          p_fee_amount?: number
          p_origin: Database["public"]["Enums"]["cash_movement_origin"]
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_professional_id?: string
          p_reference_id?: string
          p_reference_type?: string
          p_type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Returns: string
      }
      get_auth_email: { Args: never; Returns: string }
      get_open_cash_register: { Args: never; Returns: string }
      get_user_role_name: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_client: { Args: { _user_id: string }; Returns: boolean }
      reverse_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: string
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "clients"
        | "appointments"
        | "services"
        | "financial"
        | "reports"
        | "settings"
        | "users"
        | "roles"
        | "professionals"
        | "products"
        | "marketing"
      automation_action:
        | "send_whatsapp"
        | "send_sms"
        | "send_email"
        | "add_points"
        | "create_voucher"
        | "notify_staff"
      automation_status: "active" | "inactive" | "draft"
      automation_trigger:
        | "new_client"
        | "appointment_completed"
        | "birthday"
        | "inactivity"
        | "points_reached"
        | "custom"
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      cash_movement_origin: "sale" | "appointment" | "manual" | "adjustment"
      cash_movement_type: "income" | "expense" | "adjustment" | "reversal"
      cash_register_status: "open" | "closed"
      commission_payment_status: "pending" | "paid" | "cancelled"
      communication_status: "pending" | "sent" | "delivered" | "failed" | "read"
      communication_type: "whatsapp" | "sms" | "email"
      expense_category:
        | "purchase"
        | "maintenance"
        | "marketing"
        | "professional_advance"
        | "other"
      payment_method: "cash" | "pix" | "card_credit" | "card_debit" | "other"
      permission_action: "view" | "create" | "edit" | "delete"
      transaction_status: "pending" | "confirmed" | "reversed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "dashboard",
        "clients",
        "appointments",
        "services",
        "financial",
        "reports",
        "settings",
        "users",
        "roles",
        "professionals",
        "products",
        "marketing",
      ],
      automation_action: [
        "send_whatsapp",
        "send_sms",
        "send_email",
        "add_points",
        "create_voucher",
        "notify_staff",
      ],
      automation_status: ["active", "inactive", "draft"],
      automation_trigger: [
        "new_client",
        "appointment_completed",
        "birthday",
        "inactivity",
        "points_reached",
        "custom",
      ],
      campaign_status: ["draft", "active", "paused", "completed", "cancelled"],
      cash_movement_origin: ["sale", "appointment", "manual", "adjustment"],
      cash_movement_type: ["income", "expense", "adjustment", "reversal"],
      cash_register_status: ["open", "closed"],
      commission_payment_status: ["pending", "paid", "cancelled"],
      communication_status: ["pending", "sent", "delivered", "failed", "read"],
      communication_type: ["whatsapp", "sms", "email"],
      expense_category: [
        "purchase",
        "maintenance",
        "marketing",
        "professional_advance",
        "other",
      ],
      payment_method: ["cash", "pix", "card_credit", "card_debit", "other"],
      permission_action: ["view", "create", "edit", "delete"],
      transaction_status: ["pending", "confirmed", "reversed", "cancelled"],
    },
  },
} as const
