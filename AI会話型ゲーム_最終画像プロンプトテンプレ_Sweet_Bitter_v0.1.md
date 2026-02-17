# 最終画像プロンプトテンプレ（Sweet / Bitter）v0.1
最終更新：2026-02-17（JST）

目的：Bell5（救出・顕現）で、会話ログから抽出した `portrait_tokens` と `ending_route` を使って
**乙女ゲーム寄りアニメ調の“相手が見える1枚”**を安定して生成する。

---

## 1. 入力データ
- `portrait_tokens: string[]`（/api/portrait/extract で抽出）
- `setting_guess: pit|cave|facility`（背景ディテールに反映）
- `ending_route: sweet|bitter`
- 任意：`color_mood`（会話から：暖色/寒色/中間）
- 任意：`age_range`（例：20代後半〜30代前半）※推測しすぎない

---

## 2. 固定構図（ブレ防止の必須固定要素）
- シーン：暗闇から救い上げる瞬間（初めて顔が見える）
- カメラ：胸上〜バストアップ（相手が手を差し伸べる）
- 光：上方から差す柔らかい光（救いの演出）
- 背景：暗く、setting_guessに沿う（洞窟：滴/岩／穴：土/縁／施設：配管/薄い警告灯）
- スタイル：乙女ゲーム寄りアニメ調、線は綺麗、肌は自然、目の情報量多め、髪の質感丁寧

---

## 3. 変動要素（portrait_tokensの反映ルール）
`portrait_tokens` を以下カテゴリに分類してプロンプトへ挿入する（抽出側の出力は箇条書き想定）

- 髪：色／長さ／前髪／質感
- 服：シャツ/ジャケット/コート/作業服（施設ならやや実用寄り）
- 雰囲気：落ち着き/不器用/優しい/影
- 表情：安心/照れ/余韻/言い切れない
- 小物：手袋/懐中電灯/ロープ/IDカード 等（会話に出た場合のみ）

---

## 4. Sweet用テンプレ（匂わせ・温度高め）
### 4.1 Prompt（JP）
以下をそのまま使い、`{...}` を埋める。

- スタイル：乙女ゲーム寄りアニメ調、繊細な線、上品、恋愛は匂わせまで  
- シーン：暗闇から救い上げる瞬間。男性が手を差し伸べ、初めて顔が見える。  
- 表情：安心させる優しい目、少し照れた微笑み、近い距離感。  
- ライティング：上方から柔らかい光が差し、輪郭にハイライト。背景は暗い。  
- 背景ディテール：{setting_detail}  
- 外見：{portrait_tokens_joined}  
- 構図：バストアップ、手が画面手前に伸びている、視線はあなたへ。  
- NG：露骨な性的描写、過度な肌の露出、グロ、暴力、年齢が幼く見える表現。

**{setting_detail} の例**
- cave：湿った岩肌、細い水滴、反響する暗い洞窟の入口
- pit：土と砂の縁、上から差す細い光、ロープの影
- facility：薄い警告灯、配管、金属の壁面、微かな蒸気

**{portrait_tokens_joined}**
- `portrait_tokens` を「、」で連結して挿入

### 4.2 Prompt（EN）
- Style: otome-game anime illustration, clean elegant linework, premium romance vibe, subtle insinuation only  
- Scene: the moment of rescue from darkness; the man reaches out his hand; his face is revealed for the first time  
- Expression: gentle reassuring eyes, slight shy smile, close distance  
- Lighting: soft overhead light with rim highlights; background stays dark  
- Background: {setting_detail_en}  
- Appearance: {portrait_tokens_joined_en}  
- Composition: bust-up, hand reaching toward camera, gaze toward viewer  
- Negative: explicit sexual content, excessive skin exposure, gore, violence, childlike appearance

---

## 5. Bitter用テンプレ（余韻・影）
### 5.1 Prompt（JP）
- スタイル：乙女ゲーム寄りアニメ調、繊細な線、上品、恋愛は匂わせまで  
- シーン：救出の瞬間。男性が手を差し伸べ、初めて顔が見える。  
- 表情：安堵があるが、どこか影のある目。言い切れない余韻。微笑みは控えめ。  
- ライティング：上方の光はあるが、頬や目元に薄い影が残る。背景は暗い。  
- 背景ディテール：{setting_detail}  
- 外見：{portrait_tokens_joined}  
- 構図：バストアップ、手は伸びているが距離は少しだけ遠い。  
- NG：露骨な性的描写、過度な肌の露出、グロ、暴力、年齢が幼く見える表現。

### 5.2 Prompt（EN）
- Style: otome-game anime illustration, refined linework, bittersweet romance tone, insinuation only  
- Scene: rescue from darkness; his hand is offered; face revealed for the first time  
- Expression: relief with a faint shadow in the eyes; restrained smile; lingering aftertaste  
- Lighting: overhead light with subtle shadows left on face; dark background  
- Background: {setting_detail_en}  
- Appearance: {portrait_tokens_joined_en}  
- Composition: bust-up, hand offered but with slightly more distance  
- Negative: explicit sexual content, excessive skin exposure, gore, violence, childlike appearance

---

## 6. ルート別の「差分パラメータ」（実装用）
サーバで `ending_route` に応じて以下を差し替える。

- sweet:
  - expression: gentle + shy smile
  - distance: close
  - shadow: minimal
  - color_mood: slightly warm (optional)
- bitter:
  - expression: restrained + shadow in eyes
  - distance: a bit farther
  - shadow: present
  - color_mood: neutral/cool (optional)

---

## 7. 実装メモ（/api/image/generate）
1) DBから最新 snapshot を取得（setting_guess / identity_guess / ending_route / portrait_tokens）
2) setting_guess→setting_detail をマッピング
3) portrait_tokens を連結（日本語なら "、"）
4) ルート別テンプレを選択し prompt 組み立て
5) 画像生成→ストレージ保存→image_url返却
6) sessions.final_image_url を更新し events に image_generated を保存

---

## 8. 例（組み立て例：Sweet）
- setting_guess = cave  
- portrait_tokens = ["黒髪寄り、柔らかい前髪", "清潔感のあるシャツとジャケット", "落ち着いた雰囲気", "安心させるような目"]  

→ promptの外見に上記を「、」で連結して挿入
