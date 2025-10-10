import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      typing_races: {
        Row: {
          id: string
          created_at: string
          player_name: string
          wpm: number
          accuracy: number
          text_id: string
          completed_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          player_name: string
          wpm: number
          accuracy: number
          text_id: string
          completed_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          player_name?: string
          wpm?: number
          accuracy?: number
          text_id?: string
          completed_at?: string
        }
      }
      race_sessions: {
        Row: {
          id: string
          created_at: string
          text_content: string
          is_active: boolean
          max_players: number
        }
        Insert: {
          id?: string
          created_at?: string
          text_content: string
          is_active?: boolean
          max_players?: number
        }
        Update: {
          id?: string
          created_at?: string
          text_content?: string
          is_active?: boolean
          max_players?: number
        }
      }
      race_participants: {
        Row: {
          id: string
          race_id: string
          player_name: string
          current_position: number
          wpm: number
          accuracy: number
          is_finished: boolean
          created_at: string
        }
        Insert: {
          id?: string
          race_id: string
          player_name: string
          current_position?: number
          wpm?: number
          accuracy?: number
          is_finished?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          race_id?: string
          player_name?: string
          current_position?: number
          wpm?: number
          accuracy?: number
          is_finished?: boolean
          created_at?: string
        }
      }
    }
  }
}