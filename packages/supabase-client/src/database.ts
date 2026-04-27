// AUTO-GENERATED via Supabase MCP `generate_typescript_types`.
// Do not edit by hand. Regenerate after every migration:
//   `mcp__dc86c1b1-...__generate_typescript_types({ project_id: 'yycijtldadobazdjgfvj' })`
// then paste the output here.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      global_quota_state: {
        Row: { id: number; total_capacity_bytes: number; used_bytes: number }
        Insert: { id?: number; total_capacity_bytes: number; used_bytes?: number }
        Update: { id?: number; total_capacity_bytes?: number; used_bytes?: number }
        Relationships: []
      }
      object_deletion_jobs: {
        Row: { attempts: number; enqueued_at: string; last_error: string | null; storage_object: string }
        Insert: { attempts?: number; enqueued_at?: string; last_error?: string | null; storage_object: string }
        Update: { attempts?: number; enqueued_at?: string; last_error?: string | null; storage_object?: string }
        Relationships: []
      }
      pending_uploads: {
        Row: { expires_at: string; sender_id: string; size_bytes: number; token: string }
        Insert: { expires_at?: string; sender_id: string; size_bytes: number; token?: string }
        Update: { expires_at?: string; sender_id?: string; size_bytes?: number; token?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          ed25519_public_key: string
          id: string
          recovery_blob: string
          recovery_kdf_params: Json
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          ed25519_public_key: string
          id: string
          recovery_blob: string
          recovery_kdf_params: Json
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          ed25519_public_key?: string
          id?: string
          recovery_blob?: string
          recovery_kdf_params?: Json
          username?: string
        }
        Relationships: []
      }
      sends: {
        Row: {
          created_at: string
          delivered_at: string | null
          encrypted_manifest: string
          expires_at: string
          id: string
          manifest_sig: string
          recipient_id: string
          sender_id: string
          size_bytes: number
          status: string
          storage_object: string | null
          transport: string
          wrapped_key: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          encrypted_manifest: string
          expires_at?: string
          id?: string
          manifest_sig: string
          recipient_id: string
          sender_id: string
          size_bytes: number
          status: string
          storage_object?: string | null
          transport: string
          wrapped_key: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          encrypted_manifest?: string
          expires_at?: string
          id?: string
          manifest_sig?: string
          recipient_id?: string
          sender_id?: string
          size_bytes?: number
          status?: string
          storage_object?: string | null
          transport?: string
          wrapped_key?: string
        }
        Relationships: []
      }
      user_quota_state: {
        Row: { pending_bytes: number; updated_at: string; user_id: string }
        Insert: { pending_bytes?: number; updated_at?: string; user_id: string }
        Update: { pending_bytes?: number; updated_at?: string; user_id?: string }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          created_at: string | null
          display_name: string | null
          ed25519_public_key: string | null
          id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      commit_upload: {
        Args: {
          p_encrypted_manifest: string
          p_manifest_sig: string
          p_recipient_id: string
          p_size_bytes: number
          p_storage_object: string
          p_token: string
          p_transport: string
          p_wrapped_key: string
        }
        Returns: {
          created_at: string
          delivered_at: string | null
          encrypted_manifest: string
          expires_at: string
          id: string
          manifest_sig: string
          recipient_id: string
          sender_id: string
          size_bytes: number
          status: string
          storage_object: string | null
          transport: string
          wrapped_key: string
        }
      }
      create_profile: {
        Args: {
          p_ed25519_public_key: string
          p_recovery_blob: string
          p_recovery_kdf_params: Json
          p_username: string
        }
        Returns: {
          created_at: string
          display_name: string | null
          ed25519_public_key: string
          id: string
          recovery_blob: string
          recovery_kdf_params: Json
          username: string
        }
      }
      mark_delivered: { Args: { p_send_id: string }; Returns: undefined }
      reserve_quota: {
        Args: { p_size: number }
        Returns: { free: number; ok: boolean; token: string }[]
      }
      revoke_send: { Args: { p_send_id: string }; Returns: undefined }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
