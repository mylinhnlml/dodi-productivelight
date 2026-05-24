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
      mission_progress: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          mission_id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          awarded_at: string
          awarded_date: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_date?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_date?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          points: number
          updated_at: string
          user_id: string
          vision_images: string[]
          vision_notification_time: string | null
          vision_quote: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          points?: number
          updated_at?: string
          user_id: string
          vision_images?: string[]
          vision_notification_time?: string | null
          vision_quote?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          points?: number
          updated_at?: string
          user_id?: string
          vision_images?: string[]
          vision_notification_time?: string | null
          vision_quote?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          cost: number
          id: string
          redeemed_at: string
          reward_emoji: string
          reward_id: string | null
          reward_title: string
          user_id: string
        }
        Insert: {
          cost: number
          id?: string
          redeemed_at?: string
          reward_emoji?: string
          reward_id?: string | null
          reward_title: string
          user_id: string
        }
        Update: {
          cost?: number
          id?: string
          redeemed_at?: string
          reward_emoji?: string
          reward_id?: string | null
          reward_title?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          cost: number
          created_at: string
          emoji: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          emoji?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          emoji?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stickers: {
        Row: {
          created_at: string
          emoji: string
          id: string
          mission_id: string | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji: string
          id: string
          mission_id?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          mission_id?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          due_date: string
          emoji: string
          id: string
          priority: number
          repeat: string | null
          time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date: string
          emoji?: string
          id?: string
          priority?: number
          repeat?: string | null
          time?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string
          emoji?: string
          id?: string
          priority?: number
          repeat?: string | null
          time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_unlocked_stickers: {
        Row: {
          id: string
          sticker_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          sticker_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          sticker_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_stickers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          install_date: string
          last_active_date: string | null
          perfect_days: string[]
          stickers_used: string[]
          streak_count: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          install_date?: string
          last_active_date?: string | null
          perfect_days?: string[]
          stickers_used?: string[]
          streak_count?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          install_date?: string
          last_active_date?: string | null
          perfect_days?: string[]
          stickers_used?: string[]
          streak_count?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_redemption_rank: {
        Args: never
        Returns: {
          my_count: number
          my_rank: number
          total_users: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
