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
          categoria: string | null
          classificacao: string | null
          codigo: string
          created_at: string
          id: string
          nome: string
          valor_unitario: number
        }
        Insert: {
          categoria?: string | null
          classificacao?: string | null
          codigo: string
          created_at?: string
          id?: string
          nome: string
          valor_unitario?: number
        }
        Update: {
          categoria?: string | null
          classificacao?: string | null
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          acao_recomendada: string
          categoria: string
          classificacao: string | null
          codigo: string
          codigo_imanager: string | null
          conferido_por: string
          created_at: string
          created_by: string
          data_entrada: string
          destinacao: string | null
          destino: string | null
          dias_estoque: number
          id: string
          interesse: boolean
          lote_id: string | null
          modelo_id: string | null
          nome: string
          origem: string | null
          origem_fluxo: string
          serial_number: string
          status: string | null
          status_final: string
          status_teste: string
          tecnico_entrada: string | null
          tecnico_responsavel: string | null
          tipo: string | null
          valor_estimado: number
        }
        Insert: {
          acao_recomendada?: string
          categoria: string
          classificacao?: string | null
          codigo?: string
          codigo_imanager?: string | null
          conferido_por?: string
          created_at?: string
          created_by?: string
          data_entrada?: string
          destinacao?: string | null
          destino?: string | null
          dias_estoque?: number
          id?: string
          interesse?: boolean
          lote_id?: string | null
          modelo_id?: string | null
          nome: string
          origem?: string | null
          origem_fluxo: string
          serial_number?: string
          status?: string | null
          status_final: string
          status_teste: string
          tecnico_entrada?: string | null
          tecnico_responsavel?: string | null
          tipo?: string | null
          valor_estimado?: number
        }
        Update: {
          acao_recomendada?: string
          categoria?: string
          classificacao?: string | null
          codigo?: string
          codigo_imanager?: string | null
          conferido_por?: string
          created_at?: string
          created_by?: string
          data_entrada?: string
          destinacao?: string | null
          destino?: string | null
          dias_estoque?: number
          id?: string
          interesse?: boolean
          lote_id?: string | null
          modelo_id?: string | null
          nome?: string
          origem?: string | null
          origem_fluxo?: string
          serial_number?: string
          status?: string | null
          status_final?: string
          status_teste?: string
          tecnico_entrada?: string | null
          tecnico_responsavel?: string | null
          tipo?: string | null
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "cadastro_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      item_history: {
        Row: {
          created_at: string
          equipment_id: string | null
          id: string
          observacoes: string | null
          realizado_por: string | null
          status_anterior: string | null
          status_novo: string | null
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          equipment_id?: string | null
          id?: string
          observacoes?: string | null
          realizado_por?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          equipment_id?: string | null
          id?: string
          observacoes?: string | null
          realizado_por?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_items: {
        Row: {
          acao_recomendada: string | null
          categoria: string | null
          codigo: string | null
          codigo_interno: string | null
          codigo_item: string | null
          condicao: string | null
          conferente: string | null
          conferente_id: string | null
          conferente_nome: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          data_entrada: string | null
          data_saida: string | null
          dias_estoque: number | null
          equipment_id: string | null
          fabricante: string | null
          fornecedor: string | null
          id: string
          interesse: boolean | null
          localizacao: string | null
          modelo: string | null
          nome: string | null
          observacoes: string | null
          origem: string | null
          origem_fluxo: string | null
          origem_nome: string | null
          setor: string | null
          sn: string | null
          status: string | null
          status_final: string | null
          status_teste: string | null
          supplier_id: string | null
          tecnico: string | null
          tecnico_responsavel: string | null
          usuario: string | null
          usuario_nome: string | null
          valor_estimado: number | null
        }
        Insert: {
          acao_recomendada?: string | null
          categoria?: string | null
          codigo?: string | null
          codigo_interno?: string | null
          codigo_item?: string | null
          condicao?: string | null
          conferente?: string | null
          conferente_id?: string | null
          conferente_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          dias_estoque?: number | null
          equipment_id?: string | null
          fabricante?: string | null
          fornecedor?: string | null
          id?: string
          interesse?: boolean | null
          localizacao?: string | null
          modelo?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          origem_fluxo?: string | null
          origem_nome?: string | null
          setor?: string | null
          sn?: string | null
          status?: string | null
          status_final?: string | null
          status_teste?: string | null
          supplier_id?: string | null
          tecnico?: string | null
          tecnico_responsavel?: string | null
          usuario?: string | null
          usuario_nome?: string | null
          valor_estimado?: number | null
        }
        Update: {
          acao_recomendada?: string | null
          categoria?: string | null
          codigo?: string | null
          codigo_interno?: string | null
          codigo_item?: string | null
          condicao?: string | null
          conferente?: string | null
          conferente_id?: string | null
          conferente_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          dias_estoque?: number | null
          equipment_id?: string | null
          fabricante?: string | null
          fornecedor?: string | null
          id?: string
          interesse?: boolean | null
          localizacao?: string | null
          modelo?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          origem_fluxo?: string | null
          origem_nome?: string | null
          setor?: string | null
          sn?: string | null
          status?: string | null
          status_final?: string | null
          status_teste?: string | null
          supplier_id?: string | null
          tecnico?: string | null
          tecnico_responsavel?: string | null
          usuario?: string | null
          usuario_nome?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
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
          causa_reincidencia: string | null
          concluido: boolean | null
          created_at: string
          created_by: string | null
          equipment_id: string | null
          id: string
          observacoes: string | null
          sn: string
          status_reincidencia: string | null
          updated_at: string
        }
        Insert: {
          causa_reincidencia?: string | null
          concluido?: boolean | null
          created_at?: string
          created_by?: string | null
          equipment_id?: string | null
          id?: string
          observacoes?: string | null
          sn: string
          status_reincidencia?: string | null
          updated_at?: string
        }
        Update: {
          causa_reincidencia?: string | null
          concluido?: boolean | null
          created_at?: string
          created_by?: string | null
          equipment_id?: string | null
          id?: string
          observacoes?: string | null
          sn?: string
          status_reincidencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudos_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          created_at: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          numero_lote: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_lote: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_lote?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "repair_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_returns: {
        Row: {
          created_at: string | null
          data_analise: string | null
          data_retorno: string | null
          defeito_constatado: string | null
          encaminhamento: string | null
          equipment_id: string | null
          id: string
          lote: string | null
          observacoes: string | null
          resultado_amostragem: string | null
          sn: string | null
          solucao: string | null
          status: string | null
          supplier_id: string | null
          tecnico: string | null
        }
        Insert: {
          created_at?: string | null
          data_analise?: string | null
          data_retorno?: string | null
          defeito_constatado?: string | null
          encaminhamento?: string | null
          equipment_id?: string | null
          id?: string
          lote?: string | null
          observacoes?: string | null
          resultado_amostragem?: string | null
          sn?: string | null
          solucao?: string | null
          status?: string | null
          supplier_id?: string | null
          tecnico?: string | null
        }
        Update: {
          created_at?: string | null
          data_analise?: string | null
          data_retorno?: string | null
          defeito_constatado?: string | null
          encaminhamento?: string | null
          equipment_id?: string | null
          id?: string
          lote?: string | null
          observacoes?: string | null
          resultado_amostragem?: string | null
          sn?: string | null
          solucao?: string | null
          status?: string | null
          supplier_id?: string | null
          tecnico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_returns_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
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
          indice_qualidade: number | null
          nome: string
          total_falhas: number | null
          total_reparos: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          indice_qualidade?: number | null
          nome: string
          total_falhas?: number | null
          total_reparos?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          indice_qualidade?: number | null
          nome?: string
          total_falhas?: number | null
          total_reparos?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          checklist_botoes: boolean | null
          checklist_firmware: boolean | null
          checklist_fonte: boolean | null
          checklist_portas: boolean | null
          checklist_wifi: boolean | null
          codigo: string | null
          codigo_imanager: string | null
          created_at: string
          created_by: string | null
          data_teste: string | null
          defeitos_identificados: string | null
          destino: string | null
          destino_reparo: string | null
          equipment_id: string | null
          id: string
          nome: string | null
          observacoes: string | null
          resultado: string | null
          resultado_final: string | null
          serial_number: string | null
          sn: string | null
          testado_por: string | null
        }
        Insert: {
          checklist_botoes?: boolean | null
          checklist_firmware?: boolean | null
          checklist_fonte?: boolean | null
          checklist_portas?: boolean | null
          checklist_wifi?: boolean | null
          codigo?: string | null
          codigo_imanager?: string | null
          created_at?: string
          created_by?: string | null
          data_teste?: string | null
          defeitos_identificados?: string | null
          destino?: string | null
          destino_reparo?: string | null
          equipment_id?: string | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          resultado?: string | null
          resultado_final?: string | null
          serial_number?: string | null
          sn?: string | null
          testado_por?: string | null
        }
        Update: {
          checklist_botoes?: boolean | null
          checklist_firmware?: boolean | null
          checklist_fonte?: boolean | null
          checklist_portas?: boolean | null
          checklist_wifi?: boolean | null
          codigo?: string | null
          codigo_imanager?: string | null
          created_at?: string
          created_by?: string | null
          data_teste?: string | null
          defeitos_identificados?: string | null
          destino?: string | null
          destino_reparo?: string | null
          equipment_id?: string | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          resultado?: string | null
          resultado_final?: string | null
          serial_number?: string | null
          sn?: string | null
          testado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: { Args: { user_id: string }; Returns: boolean }
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
