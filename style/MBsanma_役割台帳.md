# MBsanma 役割台帳

作成日: 2026-04-05  
更新日: 2026-04-05

## この台帳の目的
- ファイル数増加による認識ズレを防ぐため、役割・責務・依存関係を論理整理する。
- 物理的なフォルダ整理より先に、どのファイルが何を担っているかを固定する。
- 今後はこの台帳を基準に、修正対象ファイルの当たりを付ける。

## 現時点の把握
- 確認済みHTML: 4件
- 確認済みJS: 38件
- 確認済みCSS: 7件
- 確認済みbridge関連: 4件
- 備考: 現在のJSフォルダ実数と `play.html` 読み込み数はともに38件で一致している。以後は38件を正とする。bridge関連ファイルはブラウザ本体とは別系統で管理する。

## HTMLファイル台帳
| ファイル名 | 区分 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|---|
| index.html | 公開入口 | 公開トップへ即リダイレクトする入口。実体ページではない。 | 無 | index_public.htmlへ転送専用 |
| index_public.html | 公開トップ/開始導線 | 体験版トップ。アカウント入力・発行・ゲスト開始を受け持ち、play.htmlへ送る。 | 無（セッション開始処理のみ） | Supabaseクライアント読込・session/localStorage管理あり |
| play.html | 公開プレイ本体HTML | 公開版の盤面DOM、オーバーレイ、結果画面、設定画面、JS/CSS束ね。 | 無（HTML殻） | 公開セッション確認あり。公開向けUI/成績系JSも読込 |
| index_internal.html | 内部プレイ本体HTML | 内部検証・直接起動用の盤面HTML。play.htmlに近いが公開導線なし。 | 無（HTML殻） | visitor/supabase系を持たない内部入口 |

## CSSファイル台帳
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| base.css | 共通変数、全体レイアウト、盤面ステージ、上部3ボタン、公開版IDバッジの土台。 | 無 | `:root` 変数と `.gameBoard` 基本寸法の中心。画面全体の基準CSS |
| center.css | 中央UIの見た目。局表示、供託、ドラ、山/王牌、3方向の点数/チップ表示。 | 無 | `render_center.js` が生成するDOMの表示先 |
| cpu.css | 左右CPUエリアの見た目。CPU手牌、CPUツモ牌、CPU河、CPU北、副露の配置。 | 無 | 左右CPUの位置・向き・サイズ調整の中心 |
| hand.css | 自分の手牌ゾーン、アクションボタン、受け入れ表示 `#stats`、選択牌/新牌表示。 | 無 | 手牌操作UIと行動ボタンの主担当CSS |
| overlay.css | ツモ/ロン/流局/結果確認オーバーレイ、カン/ポン/リーチ演出、drawOverlay、結果画面レスポンシブ。 | 無 | 各種演出と結果画面の見た目全般 |
| rightArea.css | 自分側の右下エリア表示。北表示 `#peis` と副露表示 `#melds` の見た目。 | 無 | 自分側の北/副露表示専用 |
| river.css | 自分の河の見た目。`#river` の牌サイズ、位置、リーチ宣言牌の回転。 | 無 | 自分河と点数位置微調整 |

### CSSファイルごとの補足
#### base.css
- 役割: 全体共通の土台
- 主内容:
  - `:root` の共通変数
  - 盤面全体 `.gameBoard` の寸法・背景
  - 上部3ボタン群 `.boardTopControls`
  - 公開版アカウントバッジ `.activeAccountBadge`
- 注意: レイアウト基準値が多いので、他CSSの前提になりやすい

#### center.css
- 役割: 中央ゾーンの見た目専用
- 主内容:
  - `#centerUi`
  - `#roundInfo`
  - `#kyotakuInfo`
  - `#doraIndicator`
  - `#wallInfo`
  - 3方向の `.scoreArea` / `.scoreBox` / `.scoreChipArea`
- 注意: 中央UIのDOM生成は `render_center.js` 側で、ここは見た目のみ

#### cpu.css
- 役割: 左右CPUエリアの見た目専用
- 主内容:
  - `.cpuSide`
  - `.cpuHand`
  - `.cpuDrawnSlot`
  - `.cpuRiver`
  - `.cpuPeiArea` / `.cpuMeldArea`
- 注意: CPU手牌の開閉状態そのものはJS側、ここは配置と見え方のみ

#### hand.css
- 役割: 自分の操作エリアの見た目専用
- 主内容:
  - `.hand-wrap`
  - `.actionbar` / `.actionBtn`
  - `#stats`
  - `#hand`
  - `.selectedTile` / `.newTile` / `.riichiPick`
- 注意: 操作ロジックではなく、見た目と視覚状態の表現担当

#### overlay.css
- 役割: 演出と結果画面の見た目専用
- 主内容:
  - `#tsumoOverlay` / `#ronOverlay` / `#ryukyokuOverlay` / `#resultOverlay`
  - カン/ポン/リーチ演出
  - `#drawOverlay`
  - 結果画面のPC/スマホレイアウト
- 注意: 結果画面の中身の描画ロジックは `result.js` 側。`overlay.css` は見た目担当

#### rightArea.css
- 役割: 自分側の北・副露エリアの見た目専用
- 主内容:
  - `.rightArea`
  - `#peis`
  - `#melds`
  - `.meld`
- 注意: 右下の表示専用で、CPU側には使わない

#### river.css
- 役割: 自分の河の見た目専用
- 主内容:
  - `.river-wrap`
  - `#river`
  - `#river img.riichiDeclare`
  - `#scoreLeft` / `#scoreRight` の微調整
- 注意: 自分河の位置・牌サイズ調整は基本ここを見る

## JSファイル台帳

### コア/共有状態
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| core.js | 牌定義・生成・DOM参照・グローバル基盤。山生成や画像生成などの共通土台。 | 基盤 | 状態変数の基礎置き場。各ファイルの前提 |
| core2.js | CPU追加状態の保管庫。CPUリーチ/ツモ牌/副露/北/表示補助をまとめる。 | 有 | CPU系状態参照APIが集約 |

### 局進行/プレイヤー行動
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| main.js | 起動・イベント紐付け・局開始/次局進行・終局後フローの司令塔。 | 有 | startNewKyoku/startNextKyoku系 |
| turn.js | 通常ターン進行の司令塔。誰の番か、捨て牌フェーズか、各種タイマー制御。 | 有 | 局中の主進行 |
| turn2.js | turn.jsへ後乗せする進行パッチ。CPUロン・リーチ成立・アガリ結果キュー対応。 | 有（パッチ） | 既存を壊さず差し込む設計 |
| actions.js | 共通アクション処理。ツモ/ロン/流局オーバーレイ、アガリ演出位置、卓→結果→次局の橋渡し。 | 有 | 演出進行の中核 |
| call.js | 自分の鳴き判定/UI/実行（ロン・ポン・明槓・スキップ）。 | 有 | プレイヤー鳴きの状態変更担当 |
| kan.js | 自分手番中の暗槓・加槓実行。明槓はcall.js側。 | 有 | カン演出も持つ |
| pei.js | 自分の北抜き実行。drawn/hand13/peis/王牌補充を扱う。 | 有 | リーチ中例外も含む |
| riichi.js | リーチ選択→成立→自動ツモ切り停止などを担当。 | 有 | リーチ演出あり |
| furiten.js | 既存ロジックへ後付けでフリテン管理を差し込む。河フリテン・見逃しフリテン・表示。 | 有（ラップ） | 他ファイル無改造で導入 |

### 描画/UI
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| render.js | 描画/UIの司令塔。ボタン表示条件や描画API呼び分け。 | 無 | render系の入口。状態変更禁止が明記 |
| render_center.js | 中央UI描画。局表示、供託、ドラ、山/王牌、中央点数DOM生成と更新。 | 無 | 供託表示もここ |
| render_cpu.js | 左右CPUの手牌/河/公開表示の描画。終局時の手牌公開も扱う。 | 無 | CPUツモ牌の表示位置も担当 |
| render_right.js | 右エリアの北/副露描画。副露表示の詰めや向きも制御。 | 無 | 自分側の北/副露表示 |
| render_stats.js | 受け入れ/待ち/シャンテン表示の描画。 | 無 | stats欄のみ |
| result.js | 結果確認画面(resultOverlay)の表示専用。open/close API、スマホ用ズーム防止も含む。 | 無 | 点数計算はしない |

### 手牌解析/役/点数/精算
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| shanten.js | 一般手・七対子・国士を含むシャンテン/受け入れ計算の基盤。 | 無 | 牌種並び変更に強い作り |
| yaku.js | 通常役判定とドラ/赤/北など打点素材の集約。 | 無 | 純関数中心 |
| yakuman.js | 役満判定を通常役から分離。yaku.js側の共通土台を利用。 | 無 | yaku.jsから利用前提 |
| fu.js | 符計算専用。七対子固定25符、平和ツモ20符などを扱う。 | 無 | 点数計算から独立 |
| tensukeisan.js | 三麻点数表のlookup。結果画面や将来の持ち点増減用の点数返却。 | 無 | ツモa/bやオール表を保持 |
| seisan.js | 点数移動・供託・流局テンパイ料・飛び・オーラス終局判定。 | 有 | score変更はapplyPendingRoundSettlementへ集約 |

### CPU本番行動
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| cpai.js | CPU打牌判断の本体。旧来ロジックの候補生成/比較や改善牌枚数計算。 | 無（判断） | 選択器本体 |
| cpu_actions.js | CPU特殊行動。北抜き連続処理、暗槓候補収集など。 | 有 | CPU行動実行側 |
| cpu_calls.js | CPU副露実行。ポン/明槓の候補席・副露生成・副露後打牌選択補助。 | 有 | CPU鳴き実行側 |
| cpu_call_policy.js | CPU副露判断の静的ポリシー値。許可条件/待ち条件など。 | 無 | 実行はしない |

### CPU評価/プロファイル/ログ
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| cpu_open_profiles.js | CPU副露判断プロファイル定義。守備/速度/打点/前のめり等の重み集合。 | 無 | 席ごとの副露エンジン種別も保持 |
| cpu_open_eval.js | CPU副露評価器。snapshotを採点し、内部AIなら何を選ぶか返す影武者。 | 無 | render/state非依存 |
| cpu_snapshot.js | CPU副露候補時点の局面snapshot土台。履歴や意思決定ログの共通基盤。 | 無 | 外部判断向け形式 |
| cpu_discard_profiles.js | CPU打牌評価プロファイル定義。internal/external/legacy切替も保持。 | 無 | 重みセットライブラリ |
| cpu_discard_eval.js | CPU打牌評価器。snapshot候補を採点し、内部AIの選択を返す。 | 無 | 旧来ロジックを拡張 |
| cpu_discard_snapshot.js | CPU打牌snapshot/decision log。比較検証用の候補記録土台。 | 無 | ログ蓄積あり |
| cpu_api_bridge.js | ブラウザ→ローカルAPI橋渡し。外部AI呼び出しhookとフォールバック窓口。 | 無 | APIキーは持たない |

### 公開版/保存/デバッグ/パッチ
| ファイル名 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|
| supabase_client.js | Supabase RPC呼び出しまとめ。体験版アカウント発行/読込/保存。 | 無 | 未設定時は安全無効化 |
| visitor_play_ui.js | 店外用プレイ画面UI。上部3ボタン差し替え、ルール/成績オーバーレイ、履歴保存。 | 局状態は触らない/保存状態は触る | 公開体験版向け後付けUI |
| debug.js | シナリオデバッグオーバーレイ。局設定・手牌・ドラ・王牌・山先頭・巡目指定UI。 | 無（UI側） | 実際の状態変更本体はmain.js |
| doubleRonOverlayPatch.js | ダブロン演出/結果順番表示パッチ。ロン演出と結果画面を順番表示。 | 補助 | actions/main/turn2/resultを壊さず差し込む |


## bridge / ローカルAPI連携ファイル台帳
| ファイル名 | 区分 | 主な役割 | 状態変更 | 備考 |
|---|---|---|---|---|
| README.txt | 説明書 | bridge同梱ファイル一覧と目的の要約。 | 無 | CPU打牌external連携基盤パッチの概要メモ |
| server.js | Node.js ローカル橋渡しサーバー | ブラウザから送られたCPU副露/打牌snapshotを受け、OpenAI Responses APIへ問い合わせ、判定結果を返す。 | 有（サーバー側状態/履歴） | `/cpu/open-call-decision` と `/cpu/discard-decision`、`/health`、`/debug/*` を提供 |
| start_bridge_server.bat | 起動補助 | カレントディレクトリを移して `node server.js` を起動する。 | 無 | ローカルbridgeの簡易起動用 |
| start_bridge_server_openai.bat | 起動補助 | `OPENAI_API_KEY` と Node.js の有無を確認してから `node server.js` を起動する。 | 無 | OpenAI連携前提の起動用バッチ |

### bridgeファイルごとの補足

#### `README.txt`
- 役割：bridgeパッチ同梱物の簡易説明
- 主内容：
  - 同梱ファイル一覧
  - CPU打牌external連携の概要
  - `discard` endpoint 追加
  - `cpu_snapshot.js` 同梱理由
- 注意：実行ファイルではなく説明用

#### `server.js`
- 役割：ローカル橋渡しAPI本体
- 主内容：
  - `POST /cpu/open-call-decision`
  - `POST /cpu/discard-decision`
  - `GET /health`
  - `GET /debug/config`
  - `GET /debug/last-open-call`
  - `GET /debug/open-call-history`
  - `GET /debug/last-discard`
  - `GET /debug/discard-history`
- 特徴：
  - OpenAI Responses API を使用
  - `OPENAI_API_KEY`、`OPENAI_MODEL`、`OPENAI_TIMEOUT_MS` などを環境変数から読む
  - OpenAI失敗時は `auto` を返してブラウザ側内部AIへフォールバック
  - open-call と discard の履歴をサーバー側で保持
- 注意：
  - ブラウザ本体の `play.html` が直接読むJSではない
  - `cpu_api_bridge.js` から呼ばれる外部サーバー側実装

#### `start_bridge_server.bat`
- 役割：bridgeの最小起動バッチ
- 主内容：
  - バッチ配置フォルダへ移動
  - `node server.js`
  - 終了後 `pause`
- 注意：APIキー確認はしない

#### `start_bridge_server_openai.bat`
- 役割：OpenAI連携前提の起動バッチ
- 主内容：
  - `OPENAI_API_KEY` 未設定チェック
  - Node.js 存在チェック
  - `node server.js`
  - 終了後 `pause`
- 注意：
  - OpenAIキー未設定なら起動前に止める
  - echo文面は `D2`、`server.js` 本体ログは `D3` 表記で少しズレがある


## 運用メモ
- render系は描画専用として扱う。
- main.js / turn.js / actions.js / call.js / kan.js / pei.js / riichi.js / seisan.js は局進行・状態変更の主担当。
- turn2.js / furiten.js / doubleRonOverlayPatch.js は既存処理へ後付けで差し込むパッチ層。
- visitor_play_ui.js と supabase_client.js は公開体験版の保存/表示導線。内部版の入口とは責務を分ける。
- CPU系は「本番行動」と「評価/ログ/プロファイル」に分けて見ると追いやすい。
