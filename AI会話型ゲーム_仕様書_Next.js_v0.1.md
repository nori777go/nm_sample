# AI会話型ゲーム 仕様書（Next.js版）v0.1
対象：ブラウザ（URL配布）／乙女ゲーム寄りアニメ調／自由入力で会話進行／恋愛は「甘め（匂わせまで）」／ログ保存あり／エンディング2種（Sweet/Bitter）  
最終更新：2026-02-17（JST）

---

## 1. ゴール（MVP）
- プレイヤーは暗闇のどこか（落とし穴／洞窟／地下施設のいずれか）に閉じ込められている。
- 姿の見えない男性と会話し、会話内容で **場所・相手の正体・関係性** が収束・変化する。
- ときどき「触れた」演出が入る（基本：UI揺れ＋SE＋演出ログ。可能環境のみ振動上乗せ）。
- 終盤で救出され、最後に **会話内容を踏まえた“相手の姿（1枚絵）”を画像生成**して表示する。
- エンディングは2種：**甘め（Sweet）**／**余韻（Bitter）**。どちらも「匂わせまで」。

---

## 2. 技術方針（Next.js）
### 2.1 推奨構成（最短でURL配布）
- Frontend：Next.js App Router（React）
- Backend：Next.js Route Handlers（/app/api/**/route.ts）
- DB：Supabase(Postgres) 推奨（Firestoreでも可）
- Storage：Supabase Storage / S3互換 / GCS（生成画像保存）
- LLM：会話LLM（JSON出力固定）
- Image：画像生成（乙女ゲーム寄りアニメ調）

> 重要：AIキーはクライアントに置かない。必ずサーバ（Route Handler）で呼び出す。

---

## 3. 非機能要件
- セッション：匿名（UUID）。URL配布で誰でも開始できる。
- ログ保存：会話・状態スナップショット・イベント・画像生成情報を保存する。
- 安全性：iOSでVibration APIが効かない/例外停止しうるため、振動は「安全呼び出し」で上乗せのみ。基本はUI揺れ＋SE＋演出ログで成立させる。
- 恋愛表現：露骨描写禁止。距離・間・呼吸・言いかけなどの「匂わせ」表現に限定。

---

## 4. 画面仕様（単一ページ）
### 4.1 UIレイアウト
- 背景：暗闇（黒〜濃紺）＋微粒子ノイズ
- ヘッダー：小さく Bell名（例：「暗闇」「輪郭」「救出」）
- 会話ログ：
  - NPC発話：左寄せ（名前なし／「声」扱いでも良い）
  - プレイヤー：右寄せ
  - 演出ログ：中央・薄字・括弧（例：「（指先が触れた気がした。）」）
- 入力：自由入力欄＋送信。送信中はローディング表示。

### 4.2 演出（touch_event）
- 共通：チャット枠だけ揺れ（基本）＋軽フラッシュ＋SE＋演出ログ追加
- 強演出：終盤のみ全体揺れ（screen_strong）
- 可能環境のみ：`navigator.vibrate?.(pattern)` を試す（失敗しても無視）

---

## 5. 状態設計（セッション state）
### 5.1 状態変数（Session State）
- `bell_id: number`（0〜5）
- `trust: number`（-100..100）
- `tension: number`（0..100）※甘さ/緊張
- `mystery: number`（0..100）※正体が割れる度合い
- `distance: "far"|"near"|"touch"`
- `setting_guess: "unknown"|"pit"|"cave"|"facility"`
- `identity_guess: "unknown"|"rescuer"|"pursuer"|"past_connection"`
- `ending_route: "sweet"|"bitter"|null`
- `cooldowns: { touch_turns: number }`（連続発火防止）
- `portrait_tokens: string[]`（外見・雰囲気伏線）

### 5.2 Bell構成（6章）
- Bell0：覚醒（暗闇、声だけ）
- Bell1：輪郭（呼び方/口調/距離感）
- Bell2：場所収束（pit/cave/facility）
- Bell3：関係性収束（rescuer/pursuer/past_connection）
- Bell4：脱出合意（接触増、エンディング分岐確定）
- Bell5：救出・顕現（画像生成→エンド）

---

## 6. データモデル（DB）
別紙 `AI会話型ゲーム_DBスキーマ_v0.1.sql` を参照。

保存対象（最低限）：
- sessions：開始/終了、端末ヒント、最終ルート、最終画像URL
- turns：全発話（user/npc）＋npcの生JSON（必要最小限でOK）
- state_snapshots：各ターンの状態
- events：touch_event / bell_advance / ending_decide / image_generated など

---

## 7. API仕様（Next.js Route Handlers）
別紙 `AI会話型ゲーム_OpenAPI_v0.1.yaml` を参照。

必須：
- `POST /api/session/start`
- `POST /api/chat`
- `POST /api/portrait/extract`
- `POST /api/image/generate`
- 任意：`POST /api/telemetry`（フロント演出側の実行ログ）

---

## 8. /api/chat の入出力（固定JSON）
### 8.1 Request
```json
{
  "user_text": "自由入力",
  "client": {
    "user_agent": "string",
    "platform": "pc|ios|android|unknown",
    "locale": "ja-JP"
  }
}
```

### 8.2 Response
```json
{
  "session_id": "uuid",
  "turn_index": 12,

  "npc_text": "……聞こえる？ そこにいるのか。",
  "npc_subtext": "声は近い。姿は見えない。",

  "directives": {
    "add_user_visible_log": "（演出ログ。空なら追加なし）",
    "bg_sfx": "none|drip|wind|machine",
    "ui_shake": "none|panel_weak|panel_strong|screen_strong",
    "flash": "none|weak|strong"
  },

  "touch_event": {
    "trigger": false,
    "reason": "",
    "strength": 0.0
  },

  "bell": {
    "id": 2,
    "advance": false,
    "advance_reason": ""
  },

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

---

## 9. LLM設計（JSON固定）
### 9.1 NPCの制約（プロンプトに明記）
- 姿の見えない男性。声だけ。
- プレイヤー性別は断定しない（「あなた」中心）。
- 恋愛は匂わせまで：間／呼吸／言いかけ／距離。露骨な描写は禁止。
- 場所と正体は候補から収束（自由暴走しない）。
- 出力は必ずJSON（スキーマ違反はリトライ最大2回）。

### 9.2 LLM出力JSON（サーバ内部フォーマット）
```json
{
  "npc_text": "string",
  "npc_subtext": "string",
  "state_update": {
    "trust_delta": -5,
    "tension_delta": 8,
    "mystery_delta": 6,
    "distance": "far|near|touch|keep",
    "setting_hint": "drip|wind|soil|metal|keep",
    "identity_hint": "rescuer|pursuer|past_connection|keep",
    "portrait_token_add": ["string", "string"]
  },
  "touch_event": {
    "trigger": true,
    "reason": "指先が触れたような描写",
    "strength": 0.7
  },
  "directives": {
    "add_user_visible_log": "（…）",
    "ui_shake": "panel_weak",
    "flash": "weak",
    "bg_sfx": "drip"
  }
}
```

---

## 10. サーバ側ロジック（擬似コード）
- stateをロード → userターン保存 → LLM呼び出し（JSON検証） → delta適用 → clamp → touchクールダウン → bell遷移 → Bell4でending_route確定 → npcターン保存 → snapshot保存 → events保存 → レスポンス返却。

Bell遷移のMVP例：
- 0→1：質問/助け要請が出た
- 1→2：相手の立場/名前に触れる＋mysteryが一定
- 2→3：setting_guessがunknown以外に収束
- 3→4：identity_guessがunknown以外＋trustまたはtensionが閾値
- 4→5：「掴んで」「助ける」等の合意＋ending_route確定

ending_route決定例：
- `trust >= 25 && tension >= 35` → sweet
- それ以外 → bitter

---

## 11. 画像生成（最終1枚）
### 11.1 抽出（/api/portrait/extract）
- 会話ログから `portrait_tokens`（髪/服/雰囲気/表情/年齢帯/色味）を箇条書き抽出して保存。

### 11.2 生成（/api/image/generate）
- 固定構図（救出の瞬間／暗闇から差す光／手を差し伸べる男性）
- `portrait_tokens` と `ending_route` で表情・色味を変える
- 乙女ゲーム寄りアニメ調に固定

---

## 12. 受け入れ基準（Acceptance）
- URLで開始→会話→Bellが進む→touch演出が複数回→Bell5で画像生成→画像表示→エンディング2種が再現
- ログがDBに残る（turns / snapshots / events / final image）

---

## 13. 推奨リポジトリ構成（Next.js）
```
app/
  page.tsx                        # ゲーム画面
  api/
    session/start/route.ts
    chat/route.ts
    portrait/extract/route.ts
    image/generate/route.ts
    telemetry/route.ts            # optional
lib/
  db.ts                           # DB client
  session.ts                      # state load/save
  llm.ts                          # LLM呼び出し
  image.ts                        # 画像生成呼び出し
  prompt.ts                       # プロンプト組み立て
  schema.ts                       # Zod等でJSON検証
  logic.ts                        # bell遷移・ending決定・touchルール
components/
  ChatLog.tsx
  ChatInput.tsx
  EffectsLayer.tsx                # shake/flash/se
styles/
  globals.css
```

---

## 14. Codex/他AIに渡す実装指示
別紙 `Codex_実装タスク指示_v0.1.txt` を参照。
