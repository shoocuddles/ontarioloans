export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      application_downloads: {
        Row: {
          application_id: string
          dealer_id: string
          downloaded_at: string
          id: string
          payment_amount: number | null
          payment_id: string | null
        }
        Insert: {
          application_id: string
          dealer_id: string
          downloaded_at?: string
          id?: string
          payment_amount?: number | null
          payment_id?: string | null
        }
        Update: {
          application_id?: string
          dealer_id?: string
          downloaded_at?: string
          id?: string
          payment_amount?: number | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_downloads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_locks: {
        Row: {
          application_id: string
          created_at: string
          dealer_id: string
          expires_at: string
          id: string
          is_paid: boolean | null
          lock_type: string
          locked_at: string
          payment_amount: number | null
          payment_id: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          dealer_id: string
          expires_at: string
          id?: string
          is_paid?: boolean | null
          lock_type: string
          locked_at?: string
          payment_amount?: number | null
          payment_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          dealer_id?: string
          expires_at?: string
          id?: string
          is_paid?: boolean | null
          lock_type?: string
          locked_at?: string
          payment_amount?: number | null
          payment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_locks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          additionalnotes: string | null
          amountowed: string | null
          city: string | null
          created_at: string | null
          currentpayment: string | null
          currentvehicle: string | null
          email: string | null
          employmentstatus: string | null
          fullname: string
          hasexistingloan: boolean | null
          id: string
          iscomplete: boolean | null
          mileage: string | null
          monthlyincome: string | null
          phonenumber: string | null
          postalcode: string | null
          preferredmakemodel: string | null
          province: string | null
          requiredfeatures: string | null
          status: string | null
          streetaddress: string | null
          unwantedcolors: string | null
          updated_at: string | null
          user_id: string | null
          vehicletype: string | null
        }
        Insert: {
          additionalnotes?: string | null
          amountowed?: string | null
          city?: string | null
          created_at?: string | null
          currentpayment?: string | null
          currentvehicle?: string | null
          email?: string | null
          employmentstatus?: string | null
          fullname: string
          hasexistingloan?: boolean | null
          id?: string
          iscomplete?: boolean | null
          mileage?: string | null
          monthlyincome?: string | null
          phonenumber?: string | null
          postalcode?: string | null
          preferredmakemodel?: string | null
          province?: string | null
          requiredfeatures?: string | null
          status?: string | null
          streetaddress?: string | null
          unwantedcolors?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicletype?: string | null
        }
        Update: {
          additionalnotes?: string | null
          amountowed?: string | null
          city?: string | null
          created_at?: string | null
          currentpayment?: string | null
          currentvehicle?: string | null
          email?: string | null
          employmentstatus?: string | null
          fullname?: string
          hasexistingloan?: boolean | null
          id?: string
          iscomplete?: boolean | null
          mileage?: string | null
          monthlyincome?: string | null
          phonenumber?: string | null
          postalcode?: string | null
          preferredmakemodel?: string | null
          province?: string | null
          requiredfeatures?: string | null
          status?: string | null
          streetaddress?: string | null
          unwantedcolors?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicletype?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner_id: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lockout_periods: {
        Row: {
          created_at: string
          fee: number
          hours: number
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee: number
          hours: number
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          hours?: number
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          discounted_price: number
          id: number
          standard_price: number
          temporary_lock_minutes: number
          updated_at: string
        }
        Insert: {
          discounted_price?: number
          id?: number
          standard_price?: number
          temporary_lock_minutes?: number
          updated_at?: string
        }
        Update: {
          discounted_price?: number
          id?: number
          standard_price?: number
          temporary_lock_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_missing_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          user_email: string
          status: string
        }[]
      }
      create_application: {
        Args: {
          p_application_data: Json
        }
        Returns: Json
      }
      get_all_applications: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_application_by_id: {
        Args: {
          p_application_id: string
        }
        Returns: Json
      }
      get_applications_for_dealer: {
        Args: {
          p_dealer_id: string
        }
        Returns: Json
      }
      get_dealer_downloads: {
        Args: {
          p_dealer_id: string
        }
        Returns: Json
      }
      get_user_company: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_application_downloaded_by_dealer: {
        Args: {
          p_application_id: string
          p_dealer_id: string
        }
        Returns: boolean
      }
      is_application_locked: {
        Args: {
          p_application_id: string
          p_current_dealer_id?: string
        }
        Returns: Json
      }
      lock_application: {
        Args: {
          p_application_id: string
          p_dealer_id: string
          p_lock_type: string
          p_payment_id?: string
          p_payment_amount?: number
        }
        Returns: Json
      }
      record_application_download: {
        Args: {
          p_application_id: string
          p_dealer_id: string
          p_payment_id?: string
          p_payment_amount?: number
        }
        Returns: Json
      }
      unlock_application: {
        Args: {
          p_application_id: string
          p_dealer_id: string
        }
        Returns: Json
      }
      update_application: {
        Args: {
          p_application_id: string
          p_application_data: Json
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: "dealer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
