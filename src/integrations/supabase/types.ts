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
      activity_logs: {
        Row: {
          action: string
          branch_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_template_items: {
        Row: {
          category_id: string | null
          created_at: string
          default_quantity: number
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          template_id: string
          unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          default_quantity: number
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          template_id: string
          unit?: Database["public"]["Enums"]["inventory_unit"]
        }
        Update: {
          category_id?: string | null
          created_at?: string
          default_quantity?: number
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          template_id?: string
          unit?: Database["public"]["Enums"]["inventory_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "bom_template_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_template_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bom_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_templates: {
        Row: {
          created_at: string
          description: string | null
          garment_type: Database["public"]["Enums"]["garment_type"]
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          garment_type: Database["public"]["Enums"]["garment_type"]
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          garment_type?: Database["public"]["Enums"]["garment_type"]
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          created_by: string | null
          customer_code: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_code: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birthday?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_person_id: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          failure_reason: string | null
          id: string
          notes: string | null
          order_id: string
          proof_photo_url: string | null
          rescheduled_from: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_person_id?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          failure_reason?: string | null
          id?: string
          notes?: string | null
          order_id: string
          proof_photo_url?: string | null
          rescheduled_from?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_person_id?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          failure_reason?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          proof_photo_url?: string | null
          rescheduled_from?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          attributes: Json
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_code: string
          name: string
          reorder_level: number
          selling_price: number | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at: string
        }
        Insert: {
          attributes?: Json
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_code: string
          name: string
          reorder_level?: number
          selling_price?: number | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Update: {
          attributes?: Json
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_code?: string
          name?: string
          reorder_level?: number
          selling_price?: number | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_amount: number
          branch_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number
          id: string
          invoice_number: string
          notes: string | null
          order_id: string
          paid_amount: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance_amount?: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number
          id?: string
          invoice_number: string
          notes?: string | null
          order_id: string
          paid_amount?: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance_amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number
          id?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string
          paid_amount?: number
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_orders: {
        Row: {
          actual_hours: number | null
          assigned_tailor_id: string | null
          branch_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          estimated_hours: number | null
          id: string
          mo_number: string
          order_id: string
          qc_checked_at: string | null
          qc_checked_by: string | null
          qc_notes: string | null
          qc_status: Database["public"]["Enums"]["qc_result"]
          started_at: string | null
          status: Database["public"]["Enums"]["mo_status"]
          updated_at: string
          work_instructions: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_tailor_id?: string | null
          branch_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          estimated_hours?: number | null
          id?: string
          mo_number: string
          order_id: string
          qc_checked_at?: string | null
          qc_checked_by?: string | null
          qc_notes?: string | null
          qc_status?: Database["public"]["Enums"]["qc_result"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["mo_status"]
          updated_at?: string
          work_instructions?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_tailor_id?: string | null
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          estimated_hours?: number | null
          id?: string
          mo_number?: string
          order_id?: string
          qc_checked_at?: string | null
          qc_checked_by?: string | null
          qc_notes?: string | null
          qc_status?: Database["public"]["Enums"]["qc_result"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["mo_status"]
          updated_at?: string
          work_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_profiles: {
        Row: {
          created_at: string
          customer_id: string
          garment_type: Database["public"]["Enums"]["garment_type"]
          id: string
          is_active: boolean
          label: string | null
          measured_at: string
          measured_by: string | null
          measurements: Json
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          garment_type: Database["public"]["Enums"]["garment_type"]
          id?: string
          is_active?: boolean
          label?: string | null
          measured_at?: string
          measured_by?: string | null
          measurements?: Json
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          garment_type?: Database["public"]["Enums"]["garment_type"]
          id?: string
          is_active?: boolean
          label?: string | null
          measured_at?: string
          measured_by?: string | null
          measurements?: Json
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_id: string
          id: string
          measurement_profile_id: string
          new_measurements: Json
          previous_measurements: Json
          reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["measurement_request_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id: string
          id?: string
          measurement_profile_id: string
          new_measurements?: Json
          previous_measurements?: Json
          reason?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["measurement_request_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          measurement_profile_id?: string
          new_measurements?: Json
          previous_measurements?: Json
          reason?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["measurement_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_requests_measurement_profile_id_fkey"
            columns: ["measurement_profile_id"]
            isOneToOne: false
            referencedRelation: "measurement_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mo_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          manufacturing_order_id: string
          notes: string | null
          status: Database["public"]["Enums"]["mo_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          manufacturing_order_id: string
          notes?: string | null
          status: Database["public"]["Enums"]["mo_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          manufacturing_order_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["mo_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mo_status_history_manufacturing_order_id_fkey"
            columns: ["manufacturing_order_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          recipient: string
          retry_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          template_id: string | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          recipient: string
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          recipient?: string
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          placeholders: Json
          subject: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          body_template: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          placeholders?: Json
          subject?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: Json
          subject?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_bom_items: {
        Row: {
          allocated_quantity: number
          branch_id: string | null
          consumed_quantity: number
          created_at: string
          id: string
          item_id: string | null
          item_name: string
          order_id: string
          required_quantity: number
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at: string
        }
        Insert: {
          allocated_quantity?: number
          branch_id?: string | null
          consumed_quantity?: number
          created_at?: string
          id?: string
          item_id?: string | null
          item_name: string
          order_id: string
          required_quantity?: number
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number
          branch_id?: string | null
          consumed_quantity?: number
          created_at?: string
          id?: string
          item_id?: string | null
          item_name?: string
          order_id?: string
          required_quantity?: number
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bom_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bom_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bom_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advance_amount: number
          assigned_tailor_id: string | null
          balance_amount: number
          branch_id: string
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          design_specifications: Json
          discount_amount: number
          fabric_item_id: string | null
          fabric_source: string
          garment_type: Database["public"]["Enums"]["garment_type"]
          id: string
          measurement_profile_id: string | null
          net_amount: number
          notes: string | null
          order_number: string
          priority: string
          status: Database["public"]["Enums"]["order_status"]
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          advance_amount?: number
          assigned_tailor_id?: string | null
          balance_amount?: number
          branch_id: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          design_specifications?: Json
          discount_amount?: number
          fabric_item_id?: string | null
          fabric_source?: string
          garment_type: Database["public"]["Enums"]["garment_type"]
          id?: string
          measurement_profile_id?: string | null
          net_amount?: number
          notes?: string | null
          order_number: string
          priority?: string
          status?: Database["public"]["Enums"]["order_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          assigned_tailor_id?: string | null
          balance_amount?: number
          branch_id?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          design_specifications?: Json
          discount_amount?: number
          fabric_item_id?: string | null
          fabric_source?: string
          garment_type?: Database["public"]["Enums"]["garment_type"]
          id?: string
          measurement_profile_id?: string | null
          net_amount?: number
          notes?: string | null
          order_number?: string
          priority?: string
          status?: Database["public"]["Enums"]["order_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_fabric_item_id_fkey"
            columns: ["fabric_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_measurement_profile_id_fkey"
            columns: ["measurement_profile_id"]
            isOneToOne: false
            referencedRelation: "measurement_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          customer_id: string
          id: string
          invoice_id: string
          notes: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: string
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          customer_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          ordered_at: string | null
          po_number: string
          received_at: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          po_number: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          po_number?: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          allocated_quantity: number
          branch_id: string
          id: string
          item_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          allocated_quantity?: number
          branch_id: string
          id?: string
          item_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number
          branch_id?: string
          id?: string
          item_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: Database["public"]["Enums"]["stock_txn_type"]
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: Database["public"]["Enums"]["stock_txn_type"]
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: Database["public"]["Enums"]["stock_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          received_quantity: number
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity: number
          received_quantity?: number
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          received_quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_branch_id: string
          id: string
          notes: string | null
          status: string
          to_branch_id: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_branch_id: string
          id?: string
          notes?: string | null
          status?: string
          to_branch_id: string
          transfer_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_branch_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_branch_id?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          items_supplied: string | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          items_supplied?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          items_supplied?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_branch_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "pos_operator"
        | "tailor"
        | "inventory_manager"
        | "delivery_person"
      delivery_status: "scheduled" | "in_transit" | "delivered" | "failed"
      delivery_type: "pickup" | "home_delivery"
      garment_type:
        | "shirt"
        | "pant"
        | "kurta"
        | "suit"
        | "blouse"
        | "sherwani"
        | "lehenga"
        | "saree_blouse"
        | "waistcoat"
        | "other"
      inventory_unit:
        | "meters"
        | "pieces"
        | "spools"
        | "yards"
        | "kg"
        | "grams"
        | "rolls"
      measurement_request_status: "pending" | "approved" | "rejected"
      mo_status:
        | "pending"
        | "cutting"
        | "stitching"
        | "finishing"
        | "qc"
        | "completed"
      notification_channel: "sms" | "email" | "whatsapp"
      notification_status: "pending" | "sent" | "failed"
      order_status:
        | "pending"
        | "measurement_confirmed"
        | "in_production"
        | "first_fitting"
        | "alterations"
        | "ready"
        | "delivered"
        | "cancelled"
      payment_method: "cash" | "card" | "upi" | "bank_transfer"
      po_status: "draft" | "ordered" | "received" | "cancelled"
      qc_result: "pending" | "passed" | "failed" | "rework"
      stock_txn_type:
        | "purchase"
        | "consumption"
        | "adjustment"
        | "transfer"
        | "allocation"
        | "deallocation"
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
      app_role: [
        "admin",
        "manager",
        "pos_operator",
        "tailor",
        "inventory_manager",
        "delivery_person",
      ],
      delivery_status: ["scheduled", "in_transit", "delivered", "failed"],
      delivery_type: ["pickup", "home_delivery"],
      garment_type: [
        "shirt",
        "pant",
        "kurta",
        "suit",
        "blouse",
        "sherwani",
        "lehenga",
        "saree_blouse",
        "waistcoat",
        "other",
      ],
      inventory_unit: [
        "meters",
        "pieces",
        "spools",
        "yards",
        "kg",
        "grams",
        "rolls",
      ],
      measurement_request_status: ["pending", "approved", "rejected"],
      mo_status: [
        "pending",
        "cutting",
        "stitching",
        "finishing",
        "qc",
        "completed",
      ],
      notification_channel: ["sms", "email", "whatsapp"],
      notification_status: ["pending", "sent", "failed"],
      order_status: [
        "pending",
        "measurement_confirmed",
        "in_production",
        "first_fitting",
        "alterations",
        "ready",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cash", "card", "upi", "bank_transfer"],
      po_status: ["draft", "ordered", "received", "cancelled"],
      qc_result: ["pending", "passed", "failed", "rework"],
      stock_txn_type: [
        "purchase",
        "consumption",
        "adjustment",
        "transfer",
        "allocation",
        "deallocation",
      ],
    },
  },
} as const
