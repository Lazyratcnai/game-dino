# 《恐龙远徙之谜》 Codex Review 请求

## 游戏目标
浏览器 RPG：玩家扮演小公主，探索封地、解谜、建设城镇、塔防战斗，揭开6500万年前恐龙集体迁徙的真相。

## 技术栈
- 纯 HTML + Canvas 2D + Vanilla JS，无依赖
- 单文件 index.html（含CSS）、data.js（数据）、game.js（引擎）
- 部署地址：https://3834c30f593a9819-175-24-47-130.serveousercontent.com

## 当前已知问题（需修复）

### 🔴 P0 - 阻碍问题
1. **点击开始后白屏** — 点击"开始"按钮后屏幕变白，看不到故事封面。loadChapter(0)被调用，state设为"story"，但story-overlay似乎没有正确显示。
2. **故事流程bug** — storyNext()每点击一次就前进一步，但queue可能只有1条，导致点击按钮后直接进入playing状态，用户看不到完整故事。

### 🟡 P1 - 功能缺失
3. **castSkill** — 技能总是用默认的治愈技能（skills[1]），没有让玩家选择
4. **updateBattle** — 敌人攻击公主的逻辑可能不完整
5. **checkObjectives** — 过关检测可能不触发showChapterComplete

### 🟢 P2 - 体验问题
6. **移动端** — 故事界面（story-overlay）没有触屏操作方式，mobileInteract在story状态下直接return
7. **空白地图** — 序章mapWidth=800, mapHeight=400，但地图渲染可能没有内容

## 状态机（当前设计）
```
start → (点击btn-start) → story → (点击story-btn) → playing
                                               ↕ (遇到NPC)     ↕ (进入战斗)
                                              dialog          battle
                                                                   ↕
                                                            result → nextChapter
```

## 关键代码片段

### 游戏初始化（game.js 第1-40行）
```javascript
var Game = {
    state: "start",
    player: { x: 200, y: 280, w: 32, h: 40, hp:100, maxHp:100, mp:50, maxMp:50, gold:100, wood:50, stone:20, crystals:0, speed:3, facing:"down" },
    story: { active: false, queue: [], current: 0, storyIdx: 0 },
    ui: { mode: "explore", selectedBuild: null, placingBuild: false },
    ...
}
```

### start() 函数
```javascript
start() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.loadChapter(0);
    this.loop();
},
```

### loadChapter() 末尾
```javascript
this.state = "story";
this.story = { active: true, queue: [{ title: ch.name, text: ch.subtitle, isIntro: true }], current: 0 };
this.showStoryOverlay(true);
```

### showStoryOverlay()
```javascript
showStoryOverlay(init) {
    const s = this.story;
    if (!s.queue || s.queue.length === 0) {
        document.getElementById("story-overlay").style.display = "none";
        this.state = "playing"; return;
    }
    const item = s.queue[s.current];
    if (!item) { document.getElementById("story-overlay").style.display = "none"; this.state = "playing"; return; }
    document.getElementById("story-overlay").style.display = "flex";
    document.getElementById("story-title").textContent = item.title || "";
    document.getElementById("story-text").textContent = item.text || "";
    const btn = document.getElementById("story-btn");
    btn.textContent = item.isIntro ? "开始冒险 ▶" : "继续 ▶";
}
```

### storyNext()
```javascript
storyNext() {
    const s = this.story;
    s.current++;
    if (s.current < s.queue.length) {
        this.showStoryOverlay(false);
    } else {
        document.getElementById("story-overlay").style.display = "none";
        this.state = "playing";
    }
}
```

### render()
```javascript
render() {
    if (this.state === "start") return;
    const ctx = this.ctx;
    const ch = GameData.chapters[this.currentChapter];
    if (!ch) return;
    ctx.fillStyle = ch.bgColor || "#1a1a2e";
    ctx.fillRect(0, 0, 960, 600);
    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    this.renderMap(ctx);
    // ... renders buildings, objects, enemies, princess
    ctx.restore();
    if (this.ui.placingBuild) this.renderBuildPreview(ctx);
}
```

### update() 关键行
```javascript
update() {
    if (this.state === "start") return;
    const dt = 1/60;
    // dialog typing effect...
    if (this.state === "playing" || this.state === "battle") {
        this.updatePlayer(dt);
        this.updateCamera();
    }
    if (this.state === "battle") this.updateBattle(dt);
    // particles, projectiles...
}
```

## 序章数据（data.js）
```javascript
chapters: [
    {
        id: 0,
        name: "序章",
        subtitle: "踏上封地",
        mapWidth: 800,
        mapHeight: 400,
        bgColor: "#2d5a1b",
        tiles: "generate_prologue",
        objects: [ /* 6个物件 */ ],
        // 无waves定义
    }
]
```

## 需要 Codex 回答的问题

1. **白屏根因** — 为什么点击开始后story-overlay没有显示？是我的理解有误还是代码有bug？
2. **修复方案** — 具体要改哪几行？
3. **整体代码质量** — 有没有其他隐藏的bug或架构问题？
4. **移动端适配** — 故事界面如何支持触屏点击"开始冒险"按钮？

## 交付要求
1. 诊断白屏bug，给出修复方案
2. 检查代码质量，列出其他潜在bug
3. 提出架构改进建议（如果有）
4. 确保移动端触屏可以完整走完"开始→故事→游戏"流程
