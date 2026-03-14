# AI会話型ゲーム 提案仕様書（Next.js）v0.2
対象: ブラウザURL配布 / 乙女ゲーム寄りアニメ調 / 自由入力会話 / 2エンディング
作成日: 2026-03-14

## 1. 目的
- 暗闇の閉鎖空間で「姿の見えない男性」と会話しながら脱出する、短編の会話型体験を提供する。
- 会話の積み重ねで「場所」「相手の正体」「関係性」を収束させる。
- 終盤で救出演出と1枚絵を表示し、Sweet/Bitterの2ルートで余韻を残す。

## 2. 体験要件（MVP）
- セッション開始からエンディングまで 10〜20ターンで到達できる。
- プレイヤーは自由入力で会話し、各ターンで状態が更新される。
- touch_event を複数回発火し、UI揺れ/フラッシュ/SE/演出ログを表示する。
- Bell5 到達時に立ち絵を生成して表示する。
- エンディング分岐:
  - Sweet: trust >= 25 かつ tension >= 35
  - Bitter: 上記以外

## 3. 技術構成
- Frontend: Next.js (App Router, TypeScript)
- Backend: Route Handlers (`app/api/**/route.ts`)
- DB: Supabase Postgres
- Storage: Supabase Storage
- LLM: JSON固定出力
- Image API: anime調の人物1枚絵生成

> セキュリティ原則: APIキーはサーバのみで保持し、クライアントへ露出しない。

## 4. 画面仕様
### 4.1 単一ページ構成
- 背景: 黒〜濃紺グラデーション + ノイズ
- ヘッダー: Bell名（覚醒/輪郭/収束/救出）
- 会話ログ:
  - NPC: 左寄せ
  - Player: 右寄せ
  - 演出ログ: 中央・薄字
- 入力欄: テキスト + 送信ボタン（送信中ロック）

### 4.2 演出仕様
- 基本演出: `panel_weak` 揺れ + `weak` フラッシュ + SE + 演出ログ
- 強演出: 終盤のみ `screen_strong`
- 振動: `navigator.vibrate?.()` を安全呼び出し（失敗時は無視）

## 5. 状態モデル
```ts
type SessionState = {
  bell_id: 0 | 1 | 2 | 3 | 4 | 5;
  trust: number;      // -100..100
  tension: number;    // 0..100
  mystery: number;    // 0..100
  distance: 'far' | 'near' | 'touch';
  setting_guess: 'unknown' | 'pit' | 'cave' | 'facility';
  identity_guess: 'unknown' | 'rescuer' | 'pursuer' | 'past_connection';
  ending_route: 'sweet' | 'bitter' | null;
  cooldowns: { touch_turns: number };
  portrait_tokens: string[];
};
```

## 6. Bell進行
- Bell0: 覚醒（声のみ）
- Bell1: 輪郭（距離感と言葉の癖）
- Bell2: 場所収束
- Bell3: 関係性収束
- Bell4: 脱出合意（分岐確定）
- Bell5: 救出・顕現（画像表示）

遷移条件（MVP）:
- 0→1: 助け要請 or 質問の成立
- 1→2: mystery 閾値 + 相手への踏み込み
- 2→3: setting_guess が unknown 以外
- 3→4: identity_guess が unknown 以外 かつ trust/tension閾値
- 4→5: 「掴む/助ける」合意

## 7. API提案
- `POST /api/session/start`
  - セッション初期化（UUID発行、初期state保存）
- `POST /api/chat`
  - user入力保存→LLM→state反映→レスポンス
- `POST /api/portrait/extract`
  - ログから portrait_tokens 抽出
- `POST /api/image/generate`
  - token + route で最終画像生成
- `POST /api/telemetry`（任意）
  - フロント演出の実行ログを収集

## 8. /api/chat レスポンス仕様（固定）
```json
{
  "session_id": "uuid",
  "turn_index": 12,
  "npc_text": "……聞こえる？",
  "npc_subtext": "声は近い。",
  "directives": {
    "add_user_visible_log": "（指先が触れた気がした）",
    "bg_sfx": "drip",
    "ui_shake": "panel_weak",
    "flash": "weak"
  },
  "touch_event": { "trigger": true, "reason": "接触演出", "strength": 0.6 },
  "bell": { "id": 2, "advance": false, "advance_reason": "" },
  "state": {
    "setting_guess": "cave",
    "identity_guess": "rescuer",
    "trust": 18,
    "tension": 22,
    "mystery": 35,
    "distance": "near",
    "ending_route": null
  }
}
```

## 9. データ保存（最低限）
- sessions: 開始/終了、最終route、最終画像URL
- turns: user/npc発話、LLM raw JSON（必要最小）
- state_snapshots: 各ターンstate
- events: touch/bell_advance/ending_decide/image_generated

## 10. 品質要件
- 95パーセンタイル応答: 3.5秒以内（LLM除く）
- JSON検証失敗時: 最大2回リトライ
- 障害時: 前回stateを破壊しない
- 監視: API失敗率、Bell5到達率、離脱ターンを計測

## 11. 受け入れ基準
- URLアクセスで開始できる
- 会話でBellが0→5まで進む
- touch演出が複数回発生する
- Sweet/Bitterが条件どおり分岐する
- 最終画像が表示され、ログがDBに残る

## 12. 実装優先度
1. APIと状態遷移の確立（/session/start, /chat）
2. UIチャットと演出
3. portrait抽出と画像生成
4. テレメトリ/分析

## 13. 将来拡張
- BellごとのBGM遷移
- ルート別の追加一枚絵
- マルチ言語化（ja/en）
- プレイ再読（リプレイ）モード
