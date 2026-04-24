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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cadastro_modelos: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          id: string
          nome: string
          valor_unitario: number
        }
        Insert: {
          categoria: string
          codigo?: string
          created_at?: string
          id?: string
          nome: string
          valor_unitario?: number
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      lab_items: {
        Row: {
          acao_recomendada: string
          categoria: string
          codigo: string
          conferido_por: string
          created_at: string
          created_by: string
          data_entrada: string
          dias_estoque: number
          id: string
          interesse: boolean
          nome: string
          origem_fluxo: string
          sn: string
          status_final: string
          status_teste: string
          valor_estimado: number
        }
        Insert: {
          acao_recomendada?: string
          categoria: string
          codigo?: string
          conferido_por?: string
          created_at?: string
          created_by?: string
          data_entrada?: string
          dias_estoque?: number
          id?: string
          interesse?: boolean
          nome: string
          origem_fluxo: string
          sn?: string
          status_final: string
          status_teste: string
          valor_estimado?: number
        }
        Update: {
          acao_recomendada?: string
          categoria?: string
          codigo?: string
          conferido_por?: string
          created_at?: string
          created_by?: string
          data_entrada?: string
          dias_estoque?: number
          id?: string
          interesse?: boolean
          nome?: string
          origem_fluxo?: string
          sn?: string
          status_final?: string
          status_teste?: string
          valor_estimado?: number
        }
        Relationships: []
      }
      laudo_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          laudo_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          laudo_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          laudo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_attachments_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "laudos"
            referencedColumns: ["id"]
          },
        ]
      }
      laudos: {
        Row: {
          causa_reincidencia: string
          concluido: boolean
          created_at: string
          created_by: string
          id: string
          observacoes: string
          sn: string
          updated_at: string
        }
        Insert: {
          causa_reincidencia?: string
          concluido?: boolean
          created_at?: string
          created_by?: string
          id?: string
          observacoes?: string
          sn: string
          updated_at?: string
        }
        Update: {
          causa_reincidencia?: string
          concluido?: boolean
          created_at?: string
          created_by?: string
          id?: string
          observacoes?: string
          sn?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_returns: {
        Row: {
          created_at: string
          encaminhamento: string
          id: string
          observacoes: string
          resultado_amostragem: string
          sn: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          encaminhamento?: string
          id?: string
          observacoes?: string
          resultado_amostragem?: string
          sn: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          encaminhamento?: string
          id?: string
          observacoes?: string
          resultado_amostragem?: string
          sn?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "repair_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_suppliers: {
        Row: {
          created_at: string
          id: string
          indice_qualidade: number
          nome: string
          total_falhas: number
          total_reparos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          indice_qualidade?: number
          nome: string
          total_falhas?: number
          total_reparos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          indice_qualidade?: number
          nome?: string
          total_falhas?: number
          total_reparos?: number
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          codigo: string
          created_at: string
          created_by: string
          data_teste: string
          destino_reparo: string
          id: string
          nome: string
          observacoes: string
          resultado: string
          sn: string
          testado_por: string
        }
        Insert: {
          codigo?: string
          created_at?: string
          created_by?: string
          data_teste?: string
          destino_reparo?: string
          id?: string
          nome?: string
          observacoes?: string
          resultado: string
          sn: string
          testado_por?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string
          data_teste?: string
          destino_reparo?: string
          id?: string
          nome?: string
          observacoes?: string
          resultado?: string
          sn?: string
          testado_por?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_supervisor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "operador"
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
      app_role: ["admin", "supervisor", "operador"],
    },
  },
} as const
