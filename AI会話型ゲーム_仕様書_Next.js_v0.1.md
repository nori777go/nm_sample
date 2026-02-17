# AI会話型ゲーム 仕様書（Next.js v0.1）

## 構成
- Next.js App Router（フロント + API）
- Supabase(Postgres + Storage)

## ゲーム進行
- 自由入力チャット
- Bell 1〜5で章管理
- Bell4で ending_route を sweet / bitter に確定

## touch演出
- /api/chat の directives/touch_event に応じて
  - UI shake
  - flash
  - SE
  - 演出ログ
- iOS考慮として `navigator.vibrate?.(...)` を安全呼び出し

## 保存対象
- turns: ユーザー/NPC会話、最小限raw_llm_json
- state_snapshots: 状態履歴
- events: touch/bell/ending/image/telemetry

## 画像生成
- portrait_tokens + ending_route から prompt 組み立て
- otome_anime 固定構図
- 生成後 URL を sessions.final_image_url に保存
