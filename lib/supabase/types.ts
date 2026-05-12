// Supabase の自動生成型を想定したプレースホルダ。
// 本番では `npx supabase gen types typescript` の出力をここに置き換えてください。

export type PointCategory =
  | "lab_attendance"
  | "report_post"
  | "community"
  | "redeem"
  | "bonus"
  | "other";

export type PointHistoryRow = {
  id: string;
  user_id: string;
  amount: number;
  category: PointCategory;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserPointSummary = {
  user_id: string;
  total_points: number;
  weekly_delta: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  last_activity_at: string | null;
};

export type ReportKind = "pdf" | "image";

export type ReportTier = "basic" | "essence";

export type ReportRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  mime_type: string;
  file_size: number;
  kind: ReportKind;
  lab_date: string | null;
  /** basic=全員閲覧可 / essence=Soil Essence会員のみ */
  tier: ReportTier;
  /** アップロードしたスタッフID（監査用、null可） */
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportAnalysisRow = {
  id: string;
  report_id: string;
  user_id: string;
  measured_at: string | null;
  ph: number | null;
  cec: number | null;
  humus_pct: number | null;
  nitrogen_mg: number | null;
  phosphorus_mg: number | null;
  potassium_mg: number | null;
  microbial_score: number | null;
  created_at: string;
};

export type GiftKind = "moocal_700_shipping" | "donation";

export type GiftRow = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  kind: GiftKind;
  points_spent: number;
  message: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  handle: string;
  display_name: string | null;
  /** 20L容器の再利用に協力する意思表示。trueなら宣言済み */
  reuse_agreement: boolean;
  /** リユース宣言を行った日時。未宣言時は null */
  agreement_date: string | null;
  /** soilメンバー（スタッフ）。レポートをアップロードできる */
  is_staff: boolean;
  /** Soil Essence 契約者。tier=essence のレポートを閲覧できる */
  is_essence_member: boolean;
  /** Soil Essence 契約開始日。非会員時は null */
  essence_member_since: string | null;
  created_at: string;
  updated_at: string;
};

export type DonationPoolSummaryRow = {
  total_points: number;
  gift_count: number;
  contributor_count: number;
  last_contribution_at: string | null;
};

export type VideoRow = {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  points_for_watch: number;
  points_for_first_comment: number;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type VideoWatchRow = {
  id: string;
  user_id: string;
  video_id: string;
  points_awarded: number;
  watched_at: string;
};

export type VideoCommentRow = {
  id: string;
  user_id: string;
  video_id: string;
  body: string;
  points_awarded: number;
  created_at: string;
};

export type FeedMediaKind = "image" | "video";

export type FeedPostRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type FeedPostMediaRow = {
  id: string;
  post_id: string;
  storage_path: string;
  mime_type: string;
  kind: FeedMediaKind;
  display_order: number;
  created_at: string;
};

export type FeedReactionRow = {
  id: string;
  post_id: string;
  user_id: string;
  kind: string;
  created_at: string;
};

export type FeedCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      point_history: {
        Row: PointHistoryRow;
        Insert: Omit<PointHistoryRow, "id" | "created_at" | "metadata"> & {
          id?: string;
          created_at?: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<PointHistoryRow>;
      };
      reports: {
        Row: ReportRow;
        Insert: Omit<ReportRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ReportRow>;
      };
      report_analyses: {
        Row: ReportAnalysisRow;
        Insert: Omit<ReportAnalysisRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ReportAnalysisRow>;
      };
      gifts: {
        Row: GiftRow;
        Insert: Omit<GiftRow, "id" | "created_at" | "redeemed_at"> & {
          id?: string;
          created_at?: string;
          redeemed_at?: string | null;
        };
        Update: Partial<GiftRow>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ProfileRow>;
      };
      videos: {
        Row: VideoRow;
        Insert: Omit<VideoRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<VideoRow>;
      };
      video_watches: {
        Row: VideoWatchRow;
        Insert: Omit<VideoWatchRow, "id" | "watched_at"> & {
          id?: string;
          watched_at?: string;
        };
        Update: Partial<VideoWatchRow>;
      };
      video_comments: {
        Row: VideoCommentRow;
        Insert: Omit<VideoCommentRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VideoCommentRow>;
      };
      feed_posts: {
        Row: FeedPostRow;
        Insert: Omit<FeedPostRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FeedPostRow>;
      };
      feed_post_media: {
        Row: FeedPostMediaRow;
        Insert: Omit<FeedPostMediaRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FeedPostMediaRow>;
      };
      feed_reactions: {
        Row: FeedReactionRow;
        Insert: Omit<FeedReactionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FeedReactionRow>;
      };
      feed_comments: {
        Row: FeedCommentRow;
        Insert: Omit<FeedCommentRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FeedCommentRow>;
      };
    };
    Views: {
      user_point_summary: {
        Row: UserPointSummary;
      };
      donation_pool_summary: {
        Row: DonationPoolSummaryRow;
      };
    };
    Functions: {
      award_points: {
        Args: {
          p_amount: number;
          p_category: PointCategory;
          p_reason: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: PointHistoryRow;
      };
      send_moocal_ticket: {
        Args: {
          p_recipient_handle: string;
          p_message?: string | null;
        };
        Returns: GiftRow;
      };
      send_donation: {
        Args: {
          p_amount: number;
          p_message?: string | null;
        };
        Returns: GiftRow;
      };
      redeem_moocal_ticket: {
        Args: { p_gift_id: string };
        Returns: GiftRow;
      };
      moocal_ticket_cost: {
        Args: Record<string, never>;
        Returns: number;
      };
      declare_reuse: {
        Args: Record<string, never>;
        Returns: {
          granted_bonus: boolean;
          bonus_amount: number;
          agreement_date: string;
        };
      };
      record_video_watch: {
        Args: { p_video_id: string };
        Returns: {
          already_watched: boolean;
          points_awarded: number;
        };
      };
      post_video_comment: {
        Args: { p_video_id: string; p_body: string };
        Returns: {
          comment_id: string;
          points_awarded: number;
          first_comment: boolean;
        };
      };
    };
    Enums: {
      point_category: PointCategory;
      report_kind: ReportKind;
      report_tier: ReportTier;
      gift_kind: GiftKind;
    };
  };
};

// カテゴリの日本語ラベル（UI表示用）
export const POINT_CATEGORY_LABEL: Record<PointCategory, string> = {
  lab_attendance: "ラボ参加",
  report_post: "レポート投稿",
  community: "コミュニティ",
  redeem: "ポイント利用",
  bonus: "運営付与",
  other: "その他",
};
