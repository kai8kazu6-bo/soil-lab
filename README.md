# soilラボ — 土壌分析コミュニティアプリ

土と向き合うすべての人へ。
Next.js (App Router) + TypeScript + Tailwind CSS で構築されたモバイルファーストのフロントエンドです。

## 🎨 デザイントークン

| 用途 | 色 | コード |
| ---- | ---- | ---- |
| 背景 | 温かみのあるベージュ | `#F5F2ED` |
| メインテキスト・ボタン | 深いブラウン | `#4E342E` |
| アクセント | 深い森のような緑 | `#2D5A27` |

角丸は `rounded-organic` (1.25rem) を基本とし、全体的にオーガニックで信頼感のあるトーンに調整しています。

## 📁 ファイル構成

```
soil-lab/
├── app/
│   ├── globals.css       # Tailwind + ブランド変数 + .card / .btn-* 共通スタイル
│   ├── layout.tsx        # ルートレイアウト（最大幅 max-w-md のモバイル想定）
│   └── page.tsx          # ダッシュボード画面
├── components/
│   ├── Header.tsx        # ロゴ + ユーザー挨拶 + 通知ベル
│   ├── PointsCard.tsx    # 現在のポイント
│   ├── NextLabCard.tsx   # 次回ラボの日程
│   ├── TrendsCard.tsx    # 最新の分析トレンド
│   └── BottomNav.tsx     # ホーム / 動画 / フィード / マイレポート
├── lib/
│   ├── points.ts                  # ダッシュボード用のデータ取得（Supabaseフォールバック付き）
│   └── supabase/
│       ├── client.ts              # ブラウザ向けクライアント
│       ├── server.ts              # Server Component / Action 向けクライアント
│       └── types.ts               # Database 型定義 + カテゴリラベル
├── supabase/
│   └── migrations/
│       └── 20260507000001_point_history.sql   # テーブル / RLS / ビュー / RPC
├── .env.local.example
├── tailwind.config.ts    # ブランドカラー・boxShadow・rounded-organic
├── postcss.config.js
├── next.config.js
├── tsconfig.json
└── package.json
```

## 🚀 セットアップ

```bash
cd soil-lab
npm install
cp .env.local.example .env.local   # Supabaseのキーを設定
npm run dev
# http://localhost:3000 で確認できます
```

## 🗄️ Supabase（ポイント履歴）

ユーザーごとのポイント獲得・利用履歴を保存し、ダッシュボードに反映させます。

### マイグレーションを適用

```bash
# Supabase CLI を使う場合
supabase db push

# または Studio の SQL Editor で直接実行
# ファイル: supabase/migrations/20260507000001_point_history.sql
```

### 作成されるオブジェクト

| 種別 | 名前 | 役割 |
| ---- | ---- | ---- |
| Table | `point_history` | 1件 = 1ポイントイベント（付与は正の値、利用は負の値） |
| Enum | `point_category` | `lab_attendance` / `report_post` / `community` / `redeem` / `bonus` / `other` |
| View | `user_point_summary` | 現在ポイント・週次変動・累計を返す集計ビュー |
| RPC | `award_points(amount, category, reason, metadata)` | サーバー/クライアントから安全に履歴を追加するヘルパー |

### セキュリティ

- `point_history` は RLS 有効。**自分のレコードしか SELECT/INSERT/UPDATE できません**。
- `user_point_summary` は `security_invoker = true` で、呼び出し元のRLSがそのまま適用されます。
- 履歴の `DELETE` ポリシーはデフォルトで無効（不正な改ざん防止）。

### ダッシュボードからの利用

`app/page.tsx` は Server Component から `lib/points.ts#getDashboardPointData` を呼び、

1. `auth.getUser()` でログインユーザーを取得
2. `user_point_summary` から現在ポイントと週次変動を取得し `PointsCard` に流し込み
3. `point_history` 直近10件を `PointHistoryList` に表示

`.env.local` が未設定の場合は自動でモックデータにフォールバックするので、Supabase を立ち上げる前でもUIプレビューが動きます。

### ポイント付与の例

```ts
// クライアント or Server Action から
import { awardPoints } from "@/app/actions";

await awardPoints({
  amount: 200,
  category: "lab_attendance",
  reason: "春のpH測定ラボに参加",
});
```

## 📁 マイレポート（Supabase Storage 連携）

ユーザーが PDF や画像で土壌分析レポートをアップロードし、`/reports` 画面で閲覧・削除できる機能です。

### 追加されるオブジェクト

| 種別 | 名前 | 役割 |
| ---- | ---- | ---- |
| Storage Bucket | `reports`（非公開） | レポートPDF・画像の保管。1ファイル20MBまで |
| Table | `reports` | タイトル・メモ・測定日などの表示用メタデータ |
| Enum | `report_kind` | `pdf` / `image` |
| Trigger | `reports_touch_updated_at` | `updated_at` の自動更新 |

### セキュリティモデル

- バケットは **非公開**。閲覧は Server Component から発行する **30分有効な signed URL** 経由のみ
- Storage RLS により `reports/{auth.uid()}/...` 配下にしか読み書きできない
- `reports` テーブルにも RLS。`storage_path` が `auth.uid()/...` で始まることを `INSERT` ポリシーで強制し、メタとファイル本体の所有者を一致させる

### マイグレーションの適用

```bash
supabase db push
# または Studio の SQL Editor で
# supabase/migrations/20260507000002_reports_storage.sql を実行
```

### 画面とフロー

1. `/reports` の `ReportUploadForm`（Client Component）でファイル選択
2. `app/actions.ts#uploadReport` (Server Action) が `auth.uid()` を確認
3. `reports/{user_id}/YYYY-MM/{timestamp}_{filename}` に Storage 保存
4. 成功したら `reports` テーブルに INSERT、失敗時は Storage をロールバック
5. `revalidatePath("/reports")` で一覧を再生成
6. 一覧側は `lib/reports.ts#listReports` が signed URL を付けて返却し、`ReportCard` から「ファイルを開く」「削除」が可能

### ファイル構成（追加分）

```
soil-lab/
├── app/
│   ├── reports/
│   │   └── page.tsx                    # マイレポート画面（Server Component）
│   └── actions.ts                      # uploadReport / deleteReport を追加
├── components/
│   ├── ReportUploadForm.tsx            # ドラッグ&ドロップ対応のアップロードUI
│   ├── ReportCard.tsx                  # 1件分の表示＋削除
│   └── EmptyReports.tsx
├── lib/
│   └── reports.ts                      # listReports / signed URL 生成
└── supabase/migrations/
    └── 20260507000002_reports_storage.sql
```

## 🎁 ポイント消費（プレゼント／寄付プール）

ユーザーが貯めたポイントを「MOOCAL-700 発送チケットのプレゼント」または「コミュニティ寄付プールへの送付」に使える機能です。`/redeem` 画面に集約しました。

### 追加されるオブジェクト

| 種別 | 名前 | 役割 |
| ---- | ---- | ---- |
| Table | `profiles` | 受取人を指名するためのハンドル（`@a-z0-9_`、3〜20字） |
| Enum | `gift_kind` | `moocal_700_shipping` / `donation` |
| Table | `gifts` | 1件 = 1プレゼント or 1寄付 |
| RPC | `send_moocal_ticket(handle, message?)` | 残高チェック→ポイント消費→ギフト作成を1トランザクション |
| RPC | `send_donation(amount, message?)` | 最少100pt、寄付プールへ送る |
| RPC | `redeem_moocal_ticket(gift_id)` | 受領者がチケットを利用済みにする |
| View | `donation_pool_summary` | 合計pt・件数・貢献者数 |
| Function | `moocal_ticket_cost()` | チケットの定価 700pt を返す |

### セキュリティモデル

- `gifts` の SELECT は「自分が送った／受け取った」または「kind=donation（公開）」のみ
- `INSERT` ポリシーは設けず、RPC（`security invoker`）経由でのみ作成可能。残高チェック・point_history への記帳・gifts への挿入が同一トランザクションで行われる
- チェック制約 `gifts_recipient_check` で「ticketには受領者必須／donationには受領者不可」を強制
- 受領者だけがチケットの `redeemed_at` を更新できる UPDATE ポリシー

### UI と画面遷移

`PointsCard` の「ポイントを使う」ボタンが `/redeem` へリンク。`/redeem` には以下3カード：

1. **GiftTicketCard** — ハンドル指定の「MOOCAL-700 発送チケット (700pt)」プレゼント
2. **DonationCard** — `[100/300/500/1000]` プリセット＋カスタム入力で寄付プールへ送付
3. **GiftInbox** — 自分が受け取ったチケット（未利用は「チケットを使う」ボタンで `redeem_moocal_ticket` 実行）と、自分が送った履歴

## 🌿 土壌回復ボーナス（マイレポート）

マイレポートで分析数値を入力すると、前回値と比較して「理想値」に近づいた指標があれば自動でボーナスポイントが付与されます。

### 追加されるオブジェクト

| 種別 | 名前 | 役割 |
| ---- | ---- | ---- |
| Table | `report_analyses` | `reports` に1対1で紐づく構造化された分析値（pH / CEC / 腐植 / N / P / K / 微生物） |

### 計算ロジック（`lib/analyses.ts`）

- 各指標に「理想値」を定義（pH=6.5、CEC=25、腐植=6%、N=20、P=10、K=20、微生物=80）
- 前回値と今回値で `|value - ideal|` を比較し、距離が縮まった指標を抽出
- 改善幅の割合に応じて 1指標あたり最大 30pt のボーナス
- 全体上限 300pt を超える場合は比例配分でクリップ

### フロー（`uploadReport` Server Action 内）

1. Storage にファイル保存 → `reports` に INSERT
2. `analysis_*` フィールドが1つでも入力されていれば、`report_analyses` に INSERT する前に直近の前回値を取得
3. 新しい分析値を INSERT
4. `computeRecoveryBonus(prev, next)` で改善指標と合計ボーナスを計算
5. ボーナスが正なら `award_points(amount, 'bonus', '土壌回復ボーナス：…')` を実行
6. 結果は `UploadReportResult.recovery` として呼び出し側に返却し、`ReportUploadForm` で「+XXpt 獲得バナー」を表示

### UIの追加

`ReportUploadForm` に折りたたみ式の「分析データを入力（任意）」セクションを追加。各指標を numeric input で入力でき、アップロード完了時にボーナス結果がフォーム内のグリーンバナーで表示されます。

## 🍃 リユース宣言（20L容器の再利用）

ユーザーが「20L容器の再利用に協力する」と意思表示すると、`profiles.reuse_agreement` が true になり、初回のみ「理念共鳴ポイント 50pt」が付与されます。宣言済みユーザーはアプリ全体で名前の横に緑のリユースバッジが表示されます。

### スキーマ追加（`supabase/migrations/20260507000005_reuse_agreement.sql`）

| カラム | 型 | 役割 |
| ---- | ---- | ---- |
| `profiles.reuse_agreement` | boolean (default false) | 宣言フラグ |
| `profiles.agreement_date` | timestamptz | 宣言日時 |

CHECK 制約 `profiles_agreement_date_check` で「reuse_agreement と agreement_date は同時に成立または同時に未成立」を強制しています。

### RPC：`declare_reuse()`

1. `auth.uid()` を確認、未認証ならエラー
2. `profiles` 行が無ければ `user_<id短縮>` のハンドルで自動作成
3. 既に宣言済みでなければ `reuse_agreement=true` ・ `agreement_date=now()` に更新
4. 初回宣言時のみ `award_points(50, 'bonus', '理念共鳴ポイント：リユース宣言')` を内部で呼び出し
5. 戻り値 `{ granted_bonus, bonus_amount, agreement_date }` で、UIに「+50pt 獲得」を表示するかどうかを判断

冪等：2回目以降の宣言呼び出しでは状態が変わらず、ボーナスも追加付与されません。

### UI コンポーネント

- **`ReuseDeclarationCard`**（ダッシュボードに表示）— ブラウンの境界線（`1.5px solid rgba(78,52,46,0.45)`）と薄ベージュのグラデーション背景（`#F8F1E0 → #F2E9D2`）で構成されたオーガニックなカード。
  - 宣言前：見出し「20L容器の再利用に協力し、自然に寄り添う循環を作ります」＋同意チェックボックス＋「宣言して活動を始める」ボタン（フォレストグリーン）
  - 宣言後：「ありがとうございます！あなたの意思が土を豊かにします。」＋宣言日＋「+50pt 獲得」バナー＋現在表示中のリユースバッジ
  - Supabase 未接続時は `mockMode` プロップでローカル状態のみ切り替えてデモ動作（実DBには触らない）
- **`ReuseBadge`**（緑の葉っぱ＋リサイクル循環を1つのSVGで表現）— `Header.tsx` のユーザー名横と、`GiftInbox.tsx` で送付者・受領者の名前横に、`reuse_agreement` が true のときだけ表示。サイズは `xs`/`sm`/`md` で切り替え可能。

### 反映ポイント

- `app/page.tsx`、`app/reports/page.tsx`、`app/redeem/page.tsx` がそれぞれ `getCurrentProfile()` で現在ユーザーのプロフィールを取得し、`Header` の `reuseAgreement` プロップへ渡す
- `lib/gifts.ts` のプロフィール JOIN に `reuse_agreement` を含めるよう拡張、`GiftWithProfile` 型で `sender_reuse` / `recipient_reuse` を持つ
- 今後、フィードや動画コメントなど新しい画面でも `ReuseBadge` を name の横に置くだけで一貫表示できる

## 🧪 即時プレビュー（Next.js なし）

`soil-lab-preview.html` は Tailwind CDN を使った単一ファイルのプレビューです。
ダブルクリックでブラウザに表示できるので、デザインのレビュー用に使えます。

## 🧱 含まれるダッシュボード要素

1. **ポイントカード（成長ビジュアル付き）** — ステージ判定（種 / 発芽 / 双葉 / 若葉 / 成長 / 開花）に応じて芽がSVGでぐんぐん育ち、カードの背景もクリームから深いアンバー寄りへ徐々にリッチに変化。次のステージまでの進捗バー付き。
2. **次回ラボの日程カード** — タイトル・日付・時間・場所、詳細 / リマインドボタン
3. **土壌バランスカード（円形チャート）** — pH / 窒素 / リン / カリウム / 有機物 / 微生物 の6軸レーダーで、破線の正六角形（理想）と現在の形を重ね描き。バランス点数と、最も不足している軸からの自動ヒント文付き。
4. **ポイント履歴 / マイレポート / ボトムナビゲーション**

### 🌱 成長ビジュアル（Growth Visualization）

- `components/GrowthVisual.tsx` がSVGで描画。`getGrowthStage(points)` がステージを返し、ステージ毎にレイヤを差し替え（種→子葉→本葉ペア×3→花）。
- ステージ閾値は `[0, 100, 500, 1000, 2000, 5000]` ポイント。
- 背景は `radialGradient` で土の色をステージごとに変化（クリーム→深いアンバー）。`PointsCard` 自体のカード背景もステージ依存の `linear-gradient` で連動して豊かさが増す。
- `getNextStageInfo(points)` で次のステージまでの残pt・進捗率を返し、進捗バー表示に使用。

### 🎯 円形チャート（土壌バランス）

- `components/SoilBalanceChart.tsx` が純粋なSVGで描画（外部チャートライブラリ不要）。
- 入力は `BalanceAxis[]`（`{ key, label, value: 0..1, ideal: 0..1, display? }`）。`lib/balance.ts` の `getLatestBalance()` から取得。
- 「破線の正多角形＝理想」「塗り多角形＝現在」を重ねるので、対称に近いほどバランスが良いことが直感的に分かる。
- `balanceScore(axes)` は理想からの平均偏差を 0–100 のスコアに変換、`pickHint(axes)` が最も不足している軸から日本語ヒント文を生成して `SoilBalanceCard` で表示。

## 🎯 拡張のヒント

- `components/` に `VideoListItem`, `FeedPostCard`, `ReportCard` を追加して各タブを実装
- `app/(tabs)/videos/page.tsx` のようにルートを切ると BottomNav と自然につながります
- 実データ連携時は `app/api/` または Server Components の `fetch` で対応可能
