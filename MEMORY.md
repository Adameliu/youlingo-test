# Youlingo 友邻国 — 项目记忆

> 此文件记录了项目的核心结构、约定和开发信息。
> 重装系统后重新运行 `reasonix code D:\Youlingo_website_DEandGB` 即可恢复上下文。

---

## 📋 项目概况

| 项目 | 内容 |
|------|------|
| **项目名** | Youlingo 友邻国 |
| **线上地址** | [liuyu.at](https://liuyu.at) |
| **GitHub** | `github.com/Adameliu/youlingo-quiz` |
| **Git 远程** | _(需要重新配置 `git remote add origin ...`)_ |
| **技术栈** | 原生 HTML/CSS/JS + Firebase + Cloudflare R2 |
| **部署** | Vercel 自动部署 |
| **语言支持** | 🇩🇪 德语 (A1-B2, 24模块) + 🇬🇧 英语 |

---

## 🏗 架构设计

### 单页应用（SPA）
全部代码在 `study_app.html` 中内联（~6400+ 行），无构建工具、无框架、无 npm 依赖。

**页面状态机（3个屏幕）：**
```
登录页 → 模块选择页 → 小节选择页 → 学习页
         ↕ (语言切换)            ↕ (返回)
```

### 数据流
```
CSV 源文件 (youlingo_deutsch_karten*.csv)
    ↓ [Python 处理脚本]
modules/*.json (按模块组织的原始卡片)
    ↓ [编译合并]
study_data_compact.json (应用加载的最终数据)
    ↓
study_app.html 中 `langData` 变量加载
```

### Firebase 集成
- **Auth**: 邮箱密码登录 + Demo 模式（localStorage 仅本地）
- **Realtime Database**: 进度存储路径 `progress/{uid}`，每日统计 `daily_stats/{uid}`
- 实时同步：多设备间自动合并进度（以 `n` 字段大的为准）

### PWA
- Service Worker: 简单缓存策略（`service-worker.js`）
- 可安装到手机桌面，离线可加载已缓存资源

---

## 🧠 间隔重复算法（智能学习阶段）

```
【智能判断】答对且用时 < 15秒且之前没答错过？
  ✅ 是 → 跳过学习阶段，直接1天后进入复习
  ❌ 否 → 进入简化学习阶段

【简化学习阶段】（r=1~3，犹豫/答错的卡片）
  答对: 15min → 1h → 1d （仅2次同日回访）
  答错: 递增惩罚 1min → 2min → 5min → 15min，学习进度退一步

【复习阶段】（r>=4，SM-2 指数增长）
  答对: interval = prev_interval × EF，EF 每次 +0.1（上限 3.0）
  答错: interval = prev_interval × 0.5（间隔减半），EF -0.2（下限 1.3）
  上限: 365天

【特殊按钮】
  "太简单了": EF=2.5, interval=90d, mastered=true
  "42天后再问": interval=42d, EF不变
```

进度数据结构 (`prog`):
```json
{
  "{card_id}": {
    "r": 3,      // 答对次数 (r<=3:学习阶段, r>=4:复习阶段, r=5:快速正确跳过)
    "n": 123456, // 下次复习时间戳 (毫秒)
    "i": 2,      // 当前间隔 (学习阶段:小时, 复习阶段:小时=天×24)
    "e": 2.5,    // SM-2 易度因子 (EF), 答对+0.1, 答错-0.2, 范围[1.3, 3.0]
    "w": 0,      // 连续答错次数 (答对后归零, 用于递增惩罚)
    "m": false,  // 是否已掌握 (mastered, "太简单了" 标记)
    "done": true // 本节已完成标记
  }
}
```

---

## 🔤 卡片数据结构 (`study_data_compact.json`)

```typescript
interface Card {
  i: string;      // 卡片 ID (MongoDB ObjectId)
  q: string;      // 题目 (HTML，可能含内嵌音频)
  a: string;      // 答案 (多答案用 "或" 分隔)
  t: CardType;    // 题型
  au: string;     // 音频路径 (相对路径)
  opts: string[]; // 选择题选项
  fields?: Field[]; // 多字段 (动词变位表等)
  fa?: string[];  // 多字段答案
}

interface Section {
  name: string;   // 小节名
  id: string;     // 小节 ID
  cards: Card[];
}

interface Module {
  name: string;
  sections: Section[];
}
```

### 题型 (`CardType`) 列表
| 类型值 | 说明 |
|--------|------|
| `dictation` | 听写 - 听音频拼写 |
| `dictationChinese` | 中文默写 - 看中文写外语 |
| `meaningChinese` | 词义选择 |
| `word` | 选择题 - 四选一 |
| `multi` | 选择题 - 多选 |
| `gender` | 词性判断 - 名词阴阳中 |
| `plural` | 复数形式 |
| `feminine` | 阴性形式 |
| `pastParticiple` | 第二分词 / 过去分词 |
| `isSeparable` | 可分前缀判断 |
| `presentTenseConjugation` | 现在时变位 |
| `pastTenseConjugation` | 过去时变位 |
| `konjunktivII` | 第二虚拟式 |
| `imperativ` | 命令式 |
| `comparativ` | 比较级 |
| `superlativ` | 最高级 |
| `phrase` | 短语 |
| `custom` | 自定义 |
| `array` | 数组型答案 |
| `一般` | 通用 / 默认 |

### 多字段 (fields)
用于动词变位表等需要同时填多个空的题型。每个 field:
```json
{ "l": "ich", "v": "" }
```
用户在每个字段独立输入，分别判对错。

---

## 🔧 关键配置速查

| 配置 | 值 |
|------|-----|
| **Firebase API Key** | `AIzaSyAt62RyhvA6jOPxQKNfILis88f2N-KIAZ4` |
| **Firebase Project** | `youlingo-quiz` |
| **Database URL** | `https://youlingo-quiz-default-rtdb.europe-west1.firebasedatabase.app` |
| **R2 音频基础 URL** | `https://pub-1c1a3bd3f4554dc4afce6c91070cf22e2.r2.dev` |
| **Storage Key (进度)** | `youlingo_progress_v2` |
| **Storage Key (状态)** | `youlingo_state` |
| **Storage Key (统计)** | `y_stats` |
| **Storage Key (打卡)** | `y_streak` |
| **Vercel** | 空配置 `{"version":2}`，自动部署 |

---

## 📁 文件清单

| 文件 | 大小 | 说明 |
|------|------|------|
| `index.html` | ~1160行 | 主应用（全部代码内联，唯一入口） |
| `study_app.html` | — | 重定向到 index.html |
| `service-worker.js` | — | PWA Service Worker |
| `manifest.json` | — | PWA 配置 |
| `vercel.json` | — | Vercel 部署配置 |
| `study_data_compact.json` | ~14MB | 德语数据（编译后） |
| `english_data.json` | ~15MB | 英语数据 |
| `modules/` | 24个 JSON | 德语原始模块卡片 |
| `audio/` | 26,500+ 文件 | MP3 音频文件 |
| `*.csv` | 2个 CSV | 原始卡片数据 |
| `favicon.svg` / `icon-*.png` | — | 图标 |

---

## ⚠️ 注意事项

1. **音频文件** — 本地 `audio/` 目录和 Cloudflare R2 均有存储。`.gitignore` 忽略了 `audio/` 和 `modules/`，因为这些可以从数据文件重新生成。
2. **Firebase 配置** — 如果更换 Firebase 项目，需要更新 `study_app.html` 中的 `firebaseConfig` 对象。
3. **Demo 模式** — 仅用 localStorage，清除缓存会丢失进度。
4. **旧 Key 迁移** — 代码中自动将旧 `youlingo_progress_v2` 和旧 Firebase path `progress_v2` 迁移到新 key。
5. **运行方式** — 直接双击 `study_app.html` 即可运行（需联网加载 Bootstrap/Firebase CDN）。

---

## 📝 常用命令

```bash
# 本地运行
python -m http.server 8080

# Git 重新关联远程
git remote add origin https://github.com/Adameliu/youlingo-quiz.git

# 部署到 Vercel
# Vercel 已关联 GitHub，push 自动部署
```

---

_最后更新: 2026-06 重建_
_作者: Michael.Liu_
