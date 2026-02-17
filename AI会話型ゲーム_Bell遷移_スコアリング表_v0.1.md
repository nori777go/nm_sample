# Bell遷移・スコアリング表 v0.1（AI会話型ゲーム / Next.js）
最終更新：2026-02-17（JST）

目的：自由入力でも破綻しないように、**状態（trust/tension/mystery/setting/identity）をサーバ側で数値化**し、Bell遷移・演出・エンディングを安定させる。

---

## 1. 状態変数（再掲）
- trust: -100..100（警戒→信頼）
- tension: 0..100（緊張/甘さの濃度）
- mystery: 0..100（正体が割れていく）
- distance: far/near/touch
- setting_guess: unknown/pit/cave/facility
- identity_guess: unknown/rescuer/pursuer/past_connection
- ending_route: sweet/bitter/null
- cooldowns.touch_turns: int（連続touch抑止）

---

## 2. ターンごとのスコア更新（サーバ側で計算）
LLMの `state_update` をそのまま採用するとブレるため、**ルールベース加点**を最低限かける（LLMは「候補」を出し、最終決定はサーバで行う）。

### 2.1 基本デルタ（LLMの提案を丸める）
- trust_delta: [-12..+12] にclamp
- tension_delta: [-12..+12] にclamp
- mystery_delta: [-15..+15] にclamp
- distance: keep の場合は据え置き

### 2.2 ルールベース加点（ユーザー入力から抽出）
下記は「ユーザー入力（user_text）」に対して加点する。

#### A) 信頼（trust）
| 条件（例キーワード/意図） | trust |
|---|---:|
| 助けを求める（助けて/お願い/引き上げて/怖い） | +6 |
| 相手を気遣う（大丈夫？/怪我してない？/無理しないで） | +8 |
| 相手を信じる言い方（信じる/頼る/任せる） | +10 |
| 相手を疑う（嘘？/誰？/信用できない/近づくな） | -10 |
| 罵倒・攻撃的（死ね/キモい等） | -25（＋安全対応フラグ） |

#### B) 緊張/甘さ（tension）
| 条件 | tension |
|---|---:|
| 距離が近い示唆（近い/息/声が耳元/鼓動） | +10 |
| “触れ”の言及（手/指/触れる/掴む/温度） | +12 |
| 恥ずかしさ（恥ずかしい/顔が熱い/言えない） | +8 |
| 安心（落ち着く/安心した） | +4 |
| 恐怖/パニック（怖い/無理/息が） | +6（甘さではなく緊張として） |

#### C) 謎解き度（mystery）
| 条件 | mystery |
|---|---:|
| 相手の正体質問（誰/名前/何者/どこから） | +10 |
| 場所質問（ここどこ/何が見える/音/匂い） | +8 |
| 過去/関係性質問（前に会った？/知ってる？） | +12 |
| 具体情報が出る（職業/手がかり語） | +8 |

### 2.3 サーバ側の「設定推定（setting_guess）」更新
会話に出る手がかり語でスコアリングし、最上位を setting_guess にする（同点なら unknown）。
- pit（落とし穴）手がかり：土/砂/上/落ちた/穴/縄/崩れ
- cave（洞窟）手がかり：岩/滴る/冷気/水音/反響/苔
- facility（地下施設）手がかり：機械音/金属臭/配管/電気/警報/カードキー

例：ターンごとに各候補へ +1〜+3 加点。累計が一定（例 6点）で確定。

### 2.4 サーバ側の「正体推定（identity_guess）」更新
- rescuer：助ける/導く/安心させる/急いでいる
- pursuer：質問を避ける/命令調/監視/曖昧な脅し（露骨NG）
- past_connection：声に覚え/昔/約束/名前を言いかける

同様に候補へ加点し、累計が閾値で確定（例 7点）。

---

## 3. distance 更新ルール（サーバ優先）
LLMがdistanceを上げすぎるのを防ぐ。

- 初期：far
- far→near 条件（どれか）
  - trust >= 10 かつ mystery >= 10
  - ユーザーが「近い/声が耳元」等を言う
- near→touch 条件（どれか）
  - tension >= 35 かつ trust >= 15
  - 「手を掴む/触れる」系が明示
- touch→near へ戻す
  - 警戒（trust < 0）またはビター寄りで距離を離す演出

---

## 4. touch_event 発火ルール（サーバ最終決定）
LLMの `touch_event.trigger` は「提案」。最終決定は以下。

### 4.1 発火条件
- distance in {near, touch}
- tension >= 25
- cooldowns.touch_turns == 0
- 直近2ターン内に “触れ/手/指/温度/息/近い” が含まれる **または**
  LLMが触れ提案（trigger=true）

### 4.2 発火後
- cooldowns.touch_turns = 3
- events に `touch_event` を保存
- directives.ui_shake を `panel_weak`（strength<0.5）または `panel_strong`（>=0.5）へ
- directives.flash を `weak`（strength<0.7）または `strong`（>=0.7）へ
- directives.add_user_visible_log を必ず付与（iOSでも矛盾しない文）

### 4.3 iOS矛盾回避の演出ログ例（断定しない）
- 「（指先が触れた“気がした”。）」
- 「（スマホが小さく震えた“ような”錯覚。）」
- 「（距離が、確かに近い。）」

---

## 5. Bell遷移条件（MVP固定）
Bellは 0→5 の順にのみ進む（戻らない）。遷移判定はサーバが行う。

### Bell0 → Bell1（覚醒→輪郭）
- いずれか成立：
  - user_text が質問を含む（？ または だれ/どこ/なに）
  - 助け要請（助けて/お願い/出して）
- 追加条件：turn_index >= 1

### Bell1 → Bell2（輪郭→場所収束）
- setting_guess が unknown 以外になった（累計スコア閾値達成）
  - 目安：候補累計 >= 6
- かつ mystery >= 18

### Bell2 → Bell3（場所→関係性）
- identity_guess が unknown 以外になった（累計スコア閾値達成）
  - 目安：候補累計 >= 7
- かつ mystery >= 30

### Bell3 → Bell4（関係性→脱出合意）
- いずれか成立：
  - trust >= 20
  - tension >= 40
- かつ user_text に「掴む/引く/上/助ける/出る」等の脱出語が含まれる（1回以上）

### Bell4 → Bell5（脱出合意→救出）
- ending_route が確定（6章内で必ず確定させる）
- かつ「合意成立」フラグ（server）が true
  - 合意成立の例：
    - ユーザーが「手を掴む/お願い/行く」系
    - NPCが「掴んで/今だ/引く」系（LLM提案）

---

## 6. エンディング分岐（Bell4で確定）
### 6.1 ルート決定（推奨）
- sweet：trust >= 25 **かつ** tension >= 35
- bitter：それ以外
※固定にしておくと再現性が上がる。

### 6.2 ルートにより演出を調整
- sweet：distanceをtouch寄りへ、演出ログは柔らかく、最後の一言は温度高め
- bitter：distanceをnearに留める、言い切らない余韻、光は強いが影も残す

---

## 7. 実装メモ（Codex向け）
- 文字解析は最初は簡易でOK：`includes()` のキーワード判定で十分（後で形態素解析へ）
- setting/identityの累計スコアは `session_state.meta.setting_score` 等で保持し、snapshotにも保存すると検証が楽。
- LLMのdeltaとルールベース加点は「合算→clamp」で確定。
