// ============================================================
// 《恐龙远徙之谜》游戏引擎 v0.1
// ============================================================

var Game = {
    canvas: null, ctx: null,
    state: "start", // start | story | playing | dialog | puzzle | battle | result
    currentChapter: 0,

    player: {
        x: 200, y: 280, w: 32, h: 40,
        hp: 100, maxHp: 100, mp: 50, maxMp: 50,
        gold: 100, wood: 50, stone: 20, crystals: 0,
        speed: 3, facing: "down", animFrame: 0, animTimer: 0, isMoving: false
    },

    explored: 0, exploredIds: new Set(),
    puzzlesSolved: 0, enemiesDefeated: 0, itemsCollected: 0, buildingsBuilt: 0,
    buildings: [], enemies: [], projectiles: [], particles: [],
    camera: { x: 0, y: 0 },
    map: { w: 800, h: 400 },
    objects: [],
    chapterCompleted: false,

    dialog: { active: false, current: null, charIndex: 0, charTimer: 0, currentNpc: null, queue: [] },
    battle: { active: false, waveIndex: 0, waveTimer: 0, waveSpawned: false },
    story: { active: false, queue: [], current: 0, storyIdx: 0 },
    ui: { mode: "explore", selectedBuild: null, placingBuild: false, showingHint: false, hintTimer: 0 },

    keys: {}, mouse: { x: 0, y: 0 }, touchStart: null,
    camW: 960, camH: 600,
    joystick: { active: false, dx: 0, dy: 0 },
    isMobile: false,

    // ============================================================
    // 启动
    // ============================================================
    start() {
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.loadChapter(0);
        this.loop();
    },

    // ============================================================
    // 加载章节
    // ============================================================
    loadChapter(id) {
        const ch = GameData.chapters[id];
        if (!ch) return;
        this.currentChapter = id;
        this.map.w = ch.mapWidth;
        this.map.h = ch.mapHeight;
        Object.assign(this.player, {
            x: 150, y: Math.floor(ch.mapHeight / 2),
            gold: GameData.initGold, wood: GameData.initWood, stone: GameData.initStone,
            hp: 100, maxHp: 100, mp: 50, maxMp: 50, crystals: 0
        });
        this.camera.x = Math.max(0, this.player.x - this.camW/2);
        this.camera.y = Math.max(0, this.player.y - this.camH/2 + 50);
        this.objects = JSON.parse(JSON.stringify(ch.objects));
        this.buildings = []; this.enemies = []; this.projectiles = []; this.particles = [];
        this.exploredIds = new Set(); this.explored = 0;
        this.puzzlesSolved = 0; this.enemiesDefeated = 0; this.itemsCollected = 0; this.buildingsBuilt = 0;
        this.chapterCompleted = false;
        this.battle = { active: false, waveIndex: 0, waveTimer: 0, waveSpawned: false };
        this.ui.mode = "explore"; this.ui.selectedBuild = null; this.ui.placingBuild = false; this.ui.showingHint = false; this.ui.hintTimer = 0;

        document.getElementById("ui-chapter-info").textContent = `📜 ${ch.name}`;
        document.getElementById("chapter-title").textContent = ch.subtitle;
        document.getElementById("start-screen").style.display = "none";
        document.getElementById("status-bar").style.display = "flex";
        document.getElementById("toolbar").style.display = "flex";
        document.getElementById("battle-hud").style.display = "none";
        document.getElementById("build-menu").style.display = "none";
        document.getElementById("dialog-box").style.display = "none";
        document.getElementById("result-overlay").style.display = "none";
        this.updateUI();
        this.state = "story";
        this.story = { active: true, queue: [{ title: ch.name, text: ch.subtitle, isIntro: true }], current: 0 };
        this.showStoryOverlay(true);
    },

    // ============================================================
    // 事件绑定
    // ============================================================
    bindEvents() {
        window.addEventListener("keydown", e => { this.keys[e.key] = true; if (e.key === "Escape") this.closeAllUI(); });
        window.addEventListener("keyup", e => { this.keys[e.key] = false; });
        document.getElementById("btn-start")?.addEventListener("click", () => Game.start());
        document.getElementById("btn-explore")?.addEventListener("click", () => Game.ui.selectMode('explore'));
        document.getElementById("btn-build")?.addEventListener("click", () => Game.ui.selectMode('build'));
        document.getElementById("btn-battle")?.addEventListener("click", () => Game.ui.selectMode('battle'));
        document.getElementById("btn-story")?.addEventListener("click", () => Game.ui.showStory());
        document.getElementById("btn-map")?.addEventListener("click", () => Game.ui.toggleMap());
        document.getElementById("story-btn")?.addEventListener("click", () => Game.storyNext());
        document.getElementById("result-btn")?.addEventListener("click", () => Game.nextChapter());
        document.getElementById("btn-interact")?.addEventListener("click", () => Game.mobileInteract());

        // 虚拟摇杆
        this.setupJoystick();

        // 检测移动端
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        this.canvas.addEventListener("mousemove", e => {
            const r = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
        });
        this.canvas.addEventListener("click", e => this.handleClick(e));
        this.canvas.addEventListener("touchstart", e => {
            const r = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this.touchStart = { x: t.clientX - r.left, y: t.clientY - r.top };
            this.mouse.x = t.clientX - r.left; this.mouse.y = t.clientY - r.top;
        }, { passive: true });
        this.canvas.addEventListener("touchmove", e => {
            e.preventDefault();
            const r = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this.mouse.x = t.clientX - r.left; this.mouse.y = t.clientY - r.top;
        });
        this.canvas.addEventListener("touchend", e => {
            if (!this.touchStart) return;
            const r = this.canvas.getBoundingClientRect();
            // 模拟 click：基于 touchstart 位置触发 handleClick
            const fakeEvent = { clientX: r.left + this.touchStart.x, clientY: r.top + this.touchStart.y };
            this.handleClick(fakeEvent);
            this.touchStart = null;
        });

        document.getElementById("build-grid").addEventListener("click", e => {
            const item = e.target.closest(".build-item");
            if (item && !item.classList.contains("disabled")) {
                this.ui.selectedBuild = item.dataset.id;
                this.ui.placingBuild = true;
                document.getElementById("build-menu").style.display = "none";
            }
        });

        document.getElementById("dialog-box").addEventListener("click", () => {
            if (this.state !== "dialog") return;
            const d = this.dialog;
            if (d.charIndex < d.current.text.length) { d.charIndex = d.current.text.length; }
            else if (d.queue.length > 0) { d.current = d.queue.shift(); d.charIndex = 0; }
            else { this.closeDialog(); }
        });

    },

    // ============================================================
    // 主循环
    // ============================================================
    loop() { this.update(); this.render(); requestAnimationFrame(() => this.loop()); },

    // ============================================================
    // 虚拟摇杆（触屏支持）
    // ============================================================
    setupJoystick() {
        const base = document.getElementById("joystick-base");
        const thumb = document.getElementById("joystick-thumb");
        const zone = document.getElementById("joystick-zone");
        if (!base || !thumb) return;
        const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isMobile && zone) zone.style.display = "block";

        const maxDist = 38;
        let touchId = null;

        base.addEventListener("touchstart", e => {
            e.preventDefault();
            const t = e.changedTouches[0];
            touchId = t.identifier;
            this.updateJoystick(t, base, thumb, maxDist);
        }, { passive: false });

        base.addEventListener("touchmove", e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    this.updateJoystick(e.changedTouches[i], base, thumb, maxDist);
                    break;
                }
            }
        }, { passive: false });

        const resetJoystick = () => {
            touchId = null;
            this.joystick.active = false;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
            thumb.style.transform = "translate(-50%, -50%)";
        };

        base.addEventListener("touchend", e => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) { resetJoystick(); break; }
            }
        });
        base.addEventListener("touchcancel", resetJoystick);
    },

    updateJoystick(touch, base, thumb, maxDist) {
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > maxDist) { dx = dx/dist*maxDist; dy = dy/dist*maxDist; }
        thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.joystick.active = true;
        this.joystick.dx = dx / maxDist;
        this.joystick.dy = dy / maxDist;
    },

    // ============================================================
    // 触屏互动
    // ============================================================
    mobileInteract() {
        if (this.state === "dialog") {
            document.getElementById("dialog-box").click();
            return;
        }
        if (this.state !== "playing" && this.state !== "battle") return;
        if (this.ui.placingBuild) return;

        if (this.ui.mode === "battle") {
            // 触屏战斗：向当前朝向发射技能
            const dirs = { right: [1,0], left: [-1,0], up: [0,-1], down: [0,1] };
            const d = dirs[this.player.facing] || [0,0];
            const wx = this.player.x + d[0]*100;
            const wy = this.player.y + d[1]*100;
            this.castSkill(wx, wy);
            return;
        }

        // 触屏探索：点击最近的物件
        let closest = null, closestDist = Infinity;
        const px = this.player.x + this.player.w/2, py = this.player.y + this.player.h/2;
        for (const obj of this.objects) {
            if (!obj) continue;
            const ox = obj.x + obj.w/2, oy = obj.y + obj.h/2;
            const dist = Math.sqrt((px-ox)**2 + (py-oy)**2);
            if (dist < closestDist && dist < 120) { closestDist = dist; closest = obj; }
        }
        if (closest) {
            if (closest.type === "npc") this.startDialog(closest);
            else if (closest.isPuzzle) this.startPuzzle(closest.puzzleId, closest);
            else if (closest.collected === false) {
                closest.collected = true; this.itemsCollected++;
                this.spawnParticle(closest.x+closest.w/2, closest.y, closest.icon, "#00bfff");
                if (closest.collectDialogue) this.showDialog(closest.collectDialogue);
                this.showHint("发现了：" + closest.name + "！"); this.updateUI();
            } else if (closest.locked) {
                this.showDialog(closest.lockDialogue || { speaker:"小公主", text:"这扇门被封印了……" });
            } else if (closest.studiedDialogue) {
                this.showDialog(closest.studiedDialogue);
            } else if (closest.description) {
                this.showDialog({ speaker:"小公主", text: closest.description });
            }
        } else {
            this.showHint("靠近后点击✨互动");
        }
    },

    update() {
        if (this.state === "start") return;
        const dt = 1/60;

        // 对话打字效果
        if (this.state === "dialog" && this.dialog.current) {
            if (this.dialog.charIndex < this.dialog.current.text.length) {
                this.dialog.charTimer += dt;
                if (this.dialog.charTimer > 0.022) {
                    this.dialog.charTimer = 0;
                    this.dialog.charIndex++;
                    const el = document.getElementById("dialog-text");
                    if (el) el.textContent = this.dialog.current.text.substring(0, this.dialog.charIndex);
                }
            } else {
                this.renderDialogOptions();
            }
        }

        if (this.state === "playing" || this.state === "battle") {
            this.updatePlayer(dt);
            this.updateCamera();
        }

        if (this.state === "battle") this.updateBattle(dt);

        // 粒子
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.life -= dt; p.vy += (p.gravity || 0) * dt;
            return p.life > 0;
        });

        // 弹射物
        this.projectiles = this.projectiles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.life -= dt;
            if (p.life <= 0) return false;
            for (const en of this.enemies) {
                if (en.dead) continue;
                const dx = en.x - p.x, dy = en.y - p.y;
                if (Math.sqrt(dx*dx+dy*dy) < en.size) {
                    en.hp -= p.damage; p.life = 0;
                    this.spawnParticle(en.x, en.y - 20, "💥", "#e74c3c");
                    if (en.hp <= 0) {
                        en.dead = true; this.enemiesDefeated++;
                        this.player.gold += en.reward?.gold || 10;
                        this.spawnParticle(en.x, en.y, "+" + (en.reward?.gold || 10), "#ffd700");
                        this.showHint("获得 " + (en.reward?.gold || 10) + " 💰");
                        this.updateUI();
                    }
                    break;
                }
            }
            return true;
        });
        this.enemies = this.enemies.filter(e => !e.dead);

        // 提示自动消失
        if (this.ui.showingHint) {
            this.ui.hintTimer -= dt;
            if (this.ui.hintTimer <= 0) {
                this.ui.showingHint = false;
                const hb = document.getElementById("hint-bubble");
                if (hb) hb.style.display = "none";
            }
        }

        // 波次检查
        if (this.state === "battle") {
            const ch = GameData.chapters[this.currentChapter];
            const waves = ch.waves || [];
            if (!this.battle.waveSpawned) {
                this.battle.waveTimer -= dt;
                if (this.battle.waveTimer <= 0) this.spawnWave();
            }
            if (this.battle.waveSpawned && this.enemies.length === 0) {
                this.battle.waveSpawned = false;
                this.battle.waveIndex++;
                if (this.battle.waveIndex < waves.length) {
                    this.battle.waveTimer = 3.0;
                    this.showWaveHint("第 " + (this.battle.waveIndex + 1) + " 波来袭！⚔️");
                } else {
                    this.endBattle();
                }
            }
        }

        this.checkObjectives();
    },

    // ============================================================
    // 玩家移动
    // ============================================================
    updatePlayer(dt) {
        const p = this.player;
        let dx = 0, dy = 0;
        if (this.keys["ArrowLeft"] || this.keys["a"]) dx = -1;
        if (this.keys["ArrowRight"] || this.keys["d"]) dx = 1;
        if (this.keys["ArrowUp"] || this.keys["w"]) dy = -1;
        if (this.keys["ArrowDown"] || this.keys["s"]) dy = 1;

        // 触屏摇杆输入（优先于键盘）
        if (this.joystick.active && (Math.abs(this.joystick.dx) > 0.2 || Math.abs(this.joystick.dy) > 0.2)) {
            dx = this.joystick.dx;
            dy = this.joystick.dy;
        }

        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        p.isMoving = dx !== 0 || dy !== 0;
        if (dx > 0) p.facing = "right"; else if (dx < 0) p.facing = "left";
        else if (dy > 0) p.facing = "down"; else if (dy < 0) p.facing = "up";
        p.x = Math.max(0, Math.min(this.map.w - p.w, p.x + dx * p.speed));
        p.y = Math.max(0, Math.min(this.map.h - p.h, p.y + dy * p.speed));
        if (p.isMoving) {
            p.animTimer += dt;
            if (p.animTimer > 0.15) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 4; }
        } else { p.animFrame = 0; }
        if (this.state === "playing" && this.ui.mode === "explore") this.checkExploration();
    },

    updateCamera() {
        const tx = this.player.x - this.camW/2;
        const ty = this.player.y - this.camH/2 + 50;
        this.camera.x += (tx - this.camera.x) * 0.1;
        this.camera.y += (ty - this.camera.y) * 0.1;
        this.camera.x = Math.max(0, Math.min(this.map.w - this.camW, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.map.h - this.camH, this.camera.y));
    },

    // ============================================================
    // 探索检测
    // ============================================================
    checkExploration() {
        const p = this.player;
        this.objects.forEach(obj => {
            if (!obj || this.exploredIds.has(obj.id)) return;
            const dx = p.x - (obj.x + obj.w/2), dy = p.y - (obj.y + obj.h/2);
            if (Math.sqrt(dx*dx+dy*dy) < 55) {
                this.exploredIds.add(obj.id);
                this.explored++;
                this.spawnParticle(obj.x + obj.w/2, obj.y, "✨", "#ffd700");
                this.updateUI();
            }
        });
    },

    // ============================================================
    // 战斗
    // ============================================================
    updateBattle(dt) {
        for (const en of this.enemies) {
            if (en.dead) continue;
            const dx = this.player.x - en.x, dy = this.player.y - en.y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist > en.size + 20) {
                en.x += (dx/dist) * en.speed;
                en.y += (dy/dist) * en.speed;
            } else {
                en.attackTimer -= dt;
                if (en.attackTimer <= 0) {
                    this.player.hp -= en.damage;
                    en.attackTimer = 1.0;
                    this.spawnParticle(this.player.x, this.player.y - 20, "💥", "#e74c3c");
                    this.updateBattleUI();
                    if (this.player.hp <= 0) { this.player.hp = 0; this.onBattleDefeat(); }
                }
            }
            en.hpBarTimer = 1.5;
        }
    },

    spawnWave() {
        const ch = GameData.chapters[this.currentChapter];
        const wave = ch.waves?.[this.battle.waveIndex];
        if (!wave) return;
        wave.enemies.forEach(e => {
            const et = GameData.enemies[e.type];
            if (!et) return;
            this.enemies.push({
                ...et, hp: et.hp,
                x: e.x || (50 + Math.random()*100),
                y: e.y || (this.player.y + Math.random()*200 - 100),
                attackTimer: 0, hpBarTimer: 0, dead: false
            });
        });
        this.battle.waveSpawned = true;
    },

    endBattle() {
        this.state = "playing"; this.ui.mode = "explore";
        document.getElementById("battle-hud").style.display = "none";
        this.showHint("战斗胜利！🎉");
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
        this.updateUI();
    },

    onBattleDefeat() {
        this.state = "playing"; this.ui.mode = "explore";
        this.player.hp = Math.floor(this.player.maxHp * 0.5);
        this.enemies = []; this.projectiles = [];
        this.battle = { active: false, waveIndex: 0, waveTimer: 0, waveSpawned: false };
        document.getElementById("battle-hud").style.display = "none";
        this.showHint("休息后继续吧……💤");
        this.updateUI();
    },

    castSkill(wx, wy) {
        const p = this.player;
        if (p.mp < 15) { this.showHint("MP不足！"); return; }
        const skills = [
            { id: "fireball", icon: "🔥", mpCost: 10, damage: 25 },
            { id: "heal", icon: "✨", mpCost: 20, heal: 30 },
            { id: "shield", icon: "🛡️", mpCost: 15, shield: true }
        ];
        const skill = skills[1]; // 默认治愈
        if (p.mp < skill.mpCost) { this.showHint("MP不足！"); return; }
        p.mp -= skill.mpCost;
        this.spawnParticle(p.x + p.w/2, p.y, skill.icon, "#3498db");
        if (skill.damage) {
            // 火球：向点击方向发射
            const dx = wx - p.x, dy = wy - p.y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            this.projectiles.push({
                x: p.x + p.w/2, y: p.y,
                vx: (dx/dist)*6, vy: (dy/dist)*6,
                damage: skill.damage, life: 3, icon: skill.icon, color: "#e74c3c"
            });
        } else if (skill.heal) {
            p.hp = Math.min(p.maxHp, p.hp + skill.heal);
            this.showHint("+" + skill.heal + " HP！");
        } else if (skill.shield) {
            p.hp = Math.min(p.maxHp, p.hp + 10);
            this.showHint("护盾！+" + 10 + " HP");
        }
        this.updateBattleUI();
    },

    // ============================================================
    // 检查过关
    // ============================================================
    checkObjectives() {
        if (this.state !== "playing") return;
        const ch = GameData.chapters[this.currentChapter];
        const o = ch.objectives || {};
        if (o.explore && this.explored < o.explore) return;
        if (o.puzzle && this.puzzlesSolved < o.puzzle) return;
        if (o.build && this.buildingsBuilt < o.build) return;
        if (o.defeat && this.enemiesDefeated < o.defeat) return;
        if (o.collect && this.itemsCollected < o.collect) return;
        if (!this.chapterCompleted) {
            this.chapterCompleted = true;
            setTimeout(() => this.showChapterComplete(), 600);
        }
    },

    showChapterComplete() {
        const ch = GameData.chapters[this.currentChapter];
        this.state = "result";
        const overlay = document.getElementById("result-overlay");
        overlay.style.display = "flex";
        document.getElementById("result-icon").textContent = "🏆";
        document.getElementById("result-title").textContent = ch.completionStory.title;
        document.getElementById("result-text").textContent = ch.completionStory.text;
        const btn = document.getElementById("result-btn");
        if (ch.completionStory.isEnding) {
            btn.textContent = "🔄 重新开始"; btn.onclick = () => location.reload();
        } else {
            btn.textContent = "📖 进入下一章"; btn.onclick = () => this.nextChapter();
        }
    },

    nextChapter() {
        document.getElementById("result-overlay").style.display = "none";
        this.chapterCompleted = false;
        const nextId = this.currentChapter + 1;
        if (nextId < GameData.chapters.length) this.loadChapter(nextId);
    },

    // ============================================================
    // 渲染
    // ============================================================
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
        this.buildings.forEach(b => this.renderBuilding(ctx, b));
        this.objects.forEach(obj => { if(obj) this.renderObject(ctx, obj); });
        this.enemies.forEach(en => this.renderEnemy(ctx, en));
        this.renderPrincess(ctx);
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.font = (p.size || 18) + "px serif";
            ctx.textAlign = "center";
            ctx.fillStyle = p.color || "#fff";
            ctx.fillText(p.icon, p.x, p.y);
        });
        ctx.globalAlpha = 1;
        this.projectiles.forEach(p => {
            ctx.font = "18px serif"; ctx.textAlign = "center";
            ctx.fillText(p.icon, p.x, p.y);
        });
        ctx.restore();
        if (this.ui.placingBuild) this.renderBuildPreview(ctx);
    },

    renderMap(ctx) {
        const tileSize = 32;
        const ch = GameData.chapters[this.currentChapter];
        const sx = Math.floor(this.camera.x / tileSize) * tileSize;
        const sy = Math.floor(this.camera.y / tileSize) * tileSize;
        const ex = this.camera.x + 960 + tileSize;
        const ey = this.camera.y + 600 + tileSize;
        for (let x = sx; x < ex; x += tileSize) {
            for (let y = sy; y < ey; y += tileSize) {
                if (x < 0 || y < 0 || x >= ch.mapWidth || y >= ch.mapHeight) continue;
                let color = this.getTileColor(x, y, ch);
                ctx.fillStyle = color;
                ctx.fillRect(x, y, tileSize, tileSize);
                if (color === "#3a7d3a" && (Math.floor(x/tileSize) + Math.floor(y/tileSize)) % 3 === 0) {
                    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(x, y, tileSize, tileSize);
                }
                if (this.isRoad(x, y, ch)) {
                    ctx.fillStyle = "#7a6348"; ctx.fillRect(x, y, tileSize, tileSize);
                    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(x+3, y+3, tileSize-6, tileSize-6);
                }
            }
        }
    },

    getTileColor(x, y, ch) {
        const n = Math.sin(x*0.03)*Math.cos(y*0.02);
        if (ch.id === 0) {
            if (y > 340) return "#2d6a2d";
            if (this.isRoad(x, y, ch)) return "#7a6348";
            return n > 0.4 ? "#4a9a4a" : "#3a7d3a";
        }
        if (ch.id === 1) {
            if (x > 680 && y > 100) return "#1a1a3a";
            if (x < 280 && y > 200) return "#1d4d1d";
            return n > 0.3 ? "#2a5a2a" : "#1a3a2a";
        }
        return n > 0.3 ? "#2a2a4a" : "#1a1a3a";
    },

    isRoad(x, y, ch) {
        if (ch.id === 0) return y > 275 && y < 315 && x < 680;
        if (ch.id === 1) return (y > 240 && y < 280 && x < 700) || (x > 380 && x < 420 && y < 350);
        if (ch.id === 2) return (x > 350 && x < 390 && y < 400) || (y > 300 && y < 340);
        return false;
    },

    renderBuilding(ctx, b) {
        ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(b.x - 2, b.y + b.h - 4, b.w + 4, 6);
        ctx.fillStyle = b.color || "#8B4513"; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(b.icon, b.x + b.w/2, b.y + b.h/2); ctx.textBaseline = "alphabetic";
    },

    renderObject(ctx, obj) {
        if (!obj) return;
        const x = obj.x, y = obj.y, w = obj.w, h = obj.h;
        const dx = this.player.x - (x + w/2), dy = this.player.y - (y + h/2);
        const dist = Math.sqrt(dx*dx+dy*dy);
        const isNear = dist < 60;
        if (isNear && this.ui.mode === "explore") {
            ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]); ctx.strokeRect(x - 6, y - 6, w + 12, h + 12); ctx.setLineDash([]);
        }
        if (obj.type === "npc") {
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x + w/2, y + h, w/2+6, 6, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.font = (obj.type === "npc" ? "30px" : "26px") + " serif"; ctx.textAlign = "center";
        ctx.textBaseline = obj.type === "npc" ? "alphabetic" : "middle";
        ctx.fillText(obj.icon, x + w/2, y + h - (obj.type === "npc" ? 6 : h/2));
        if (isNear) {
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(x + w/2 - 36, y - 22, 72, 18);
            ctx.fillStyle = "#ffd700"; ctx.font = "11px sans-serif";
            ctx.fillText(obj.name || "", x + w/2, y - 9);
        }
        ctx.textBaseline = "alphabetic";
    },

    renderPrincess(ctx) {
        const p = this.player;
        const bob = p.isMoving ? Math.sin(p.animFrame * Math.PI/2) * 2 : 0;
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(p.x+p.w/2, p.y+p.h, p.w/2+2, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#e91e63"; ctx.beginPath(); ctx.ellipse(p.x+p.w/2, p.y+p.h/2+bob, p.w/2, p.h/2.2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fde8c8"; ctx.beginPath(); ctx.arc(p.x+p.w/2, p.y+8+bob, 11, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#5d3a1a"; ctx.beginPath(); ctx.arc(p.x+p.w/2, p.y+4+bob, 8, Math.PI, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.moveTo(p.x+p.w/2-10, p.y+6+bob); ctx.lineTo(p.x+p.w/2-6, p.y-2+bob); ctx.lineTo(p.x+p.w/2, p.y+4+bob); ctx.lineTo(p.x+p.w/2+6, p.y-2+bob); ctx.lineTo(p.x+p.w/2+10, p.y+6+bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(p.x+p.w/2-3, p.y+8+bob, 1.5, 0, Math.PI*2); ctx.arc(p.x+p.w/2+3, p.y+8+bob, 1.5, 0, Math.PI*2); ctx.fill();
    },

    renderEnemy(ctx, en) {
        const bob = Math.sin(Date.now()*0.004)*2;
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(en.x, en.y+en.size/2, en.size/2+3, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = en.color; ctx.beginPath(); ctx.arc(en.x, en.y+bob, en.size/2, 0, Math.PI*2); ctx.fill();
        ctx.font = en.size + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(en.icon, en.x, en.y+bob); ctx.textBaseline = "alphabetic";
        if (en.hpBarTimer > 0) {
            en.hpBarTimer -= 1/60;
            const maxHp = GameData.enemies[en.icon==="🟢"?"slime":en.icon==="🐺"?"wolf":"golem"]?.hp||100;
            const bw = 36, bh = 4;
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(en.x-bw/2, en.y-en.size/2-10, bw, bh);
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(en.x-bw/2, en.y-en.size/2-10, bw*Math.max(0,en.hp/maxHp), bh);
        }
    },

    renderBuildPreview(ctx) {
        const wx = this.mouse.x + this.camera.x, wy = this.mouse.y + this.camera.y;
        const g = 32, bx = Math.floor(wx/g)*g, by = Math.floor(wy/g)*g;
        ctx.globalAlpha = 0.5; ctx.fillStyle = "#ffd700"; ctx.fillRect(bx, by, g, g);
        ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, g, g); ctx.globalAlpha = 1;
        const bdata = GameData.chapters[this.currentChapter]?.buildings.find(b => b.id === this.ui.selectedBuild);
        if (bdata) { ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText(bdata.icon, bx+g/2, by+g/2+7); }
    },

    // ============================================================
    // 点击处理
    // ============================================================
    handleClick(e) {
        if (this.state !== "playing" && this.state !== "battle") return;
        const r = this.canvas.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        const wx = mx + this.camera.x, wy = my + this.camera.y;
        if (this.ui.placingBuild) { this.placeBuild(wx, wy); return; }
        if (this.ui.mode === "battle") { this.castSkill(wx, wy); return; }
        if (this.ui.mode === "explore") { this.checkInteraction(wx, wy); }
    },

    checkInteraction(wx, wy) {
        for (const obj of this.objects) {
            if (!obj) continue;
            const dx = wx - (obj.x + obj.w/2), dy = wy - (obj.y + obj.h/2);
            if (Math.sqrt(dx*dx+dy*dy) < 60) {
                if (obj.type === "npc") { this.startDialog(obj); return; }
                else if (obj.isPuzzle) { this.startPuzzle(obj.puzzleId, obj); return; }
                else if (obj.collected === false) {
                    obj.collected = true; this.itemsCollected++;
                    this.spawnParticle(obj.x+obj.w/2, obj.y, obj.icon, "#00bfff");
                    if (obj.collectDialogue) this.showDialog(obj.collectDialogue);
                    this.showHint("发现了：" + obj.name + "！"); this.updateUI(); return;
                }
                else if (obj.locked) {
                    this.showDialog(obj.lockDialogue || { speaker: "小公主", text: "这扇门被封印了……需要找到更多线索。" });
                    return;
                }
                else if (obj.interactions?.includes("study") && !obj.studied) {
                    obj.studied = true; this.puzzlesSolved++;
                    if (obj.studiedDialogue) this.showDialog(obj.studiedDialogue);
                    this.updateUI(); return;
                }
                else if (obj.studiedDialogue) { this.showDialog(obj.studiedDialogue); return; }
                else if (obj.description) { this.showDialog({ speaker: "小公主", text: obj.description }); return; }
            }
        }
    },

    // ============================================================
    // 对话系统
    // ============================================================
    startDialog(npc) {
        if (!npc || !npc.dialogues) return;
        const firstKey = Object.keys(npc.dialogues)[0];
        const dlg = npc.dialogues[firstKey];
        if (!dlg) return;
        this.dialog = { active: true, current: dlg, queue: [], charIndex: 0, charTimer: 0, currentNpc: npc };
        npc.visited = true;
        this.showDialogUI(dlg); this.state = "dialog";
    },

    showDialog(dlg) {
        this.dialog = { active: true, current: dlg, queue: [], charIndex: 0, charTimer: 0, currentNpc: null };
        this.showDialogUI(dlg); this.state = "dialog";
    },

    showDialogUI(dlg) {
        document.getElementById("dialog-speaker").textContent = dlg.speaker || "???";
        document.getElementById("dialog-text").textContent = "";
        document.getElementById("dialog-options").innerHTML = "";
        document.getElementById("dialog-next").style.display = "none";
        document.getElementById("dialog-box").style.display = "block";
    },

    renderDialogOptions() {
        const dlg = this.dialog.current;
        if (!dlg) return;
        const el = document.getElementById("dialog-text");
        if (el) el.textContent = dlg.text;
        const optContainer = document.getElementById("dialog-options");
        optContainer.innerHTML = "";
        if (dlg.options && dlg.options.length > 0) {
            dlg.options.forEach(opt => {
                const btn = document.createElement("button");
                btn.className = "dialog-opt"; btn.textContent = opt.text;
                btn.onclick = () => this.selectDialogOption(opt);
                optContainer.appendChild(btn);
            });
        } else {
            document.getElementById("dialog-next").style.display = "block";
        }
    },

    selectDialogOption(opt) {
        if (!opt || !opt.next) { this.closeDialog(); return; }
        const npc = this.dialog.currentNpc;
        if (npc && npc.dialogues && npc.dialogues[opt.next]) {
            this.dialog.current = npc.dialog
            this.dialog.current = npc.dialogues[opt.next];
            this.dialog.charIndex = 0;
            this.showDialogUI(this.dialog.current);
        } else { this.closeDialog(); }
    },

    closeDialog() {
        document.getElementById("dialog-box").style.display = "none";
        this.dialog.active = false;
        this.state = "playing";
        this.showHint("操作：WASD/方向键移动，鼠标点击互动");
    },

    // ============================================================
    // 谜题
    // ============================================================
    startPuzzle(puzzleId, obj) {
        const puzzle = GameData.chapters[this.currentChapter].puzzles[puzzleId];
        if (!puzzle) return;
        this.puzzle = { active: true, id: puzzleId, data: puzzle, obj: obj };
        this.state = "puzzle";
        const box = document.getElementById("dialog-box");
        document.getElementById("dialog-speaker").textContent = "🔮 " + puzzle.name;
        document.getElementById("dialog-text").textContent = puzzle.description + (puzzle.hint ? "\n\n💡 " + puzzle.hint : "");
        const optContainer = document.getElementById("dialog-options");
        optContainer.innerHTML = "";
        const solveBtn = document.createElement("button");
        solveBtn.className = "dialog-opt";
        solveBtn.textContent = "✨ 我已解开！";
        solveBtn.onclick = () => this.solvePuzzle();
        optContainer.appendChild(solveBtn);
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "dialog-opt";
        cancelBtn.textContent = "再想想……";
        cancelBtn.onclick = () => this.closePuzzle();
        optContainer.appendChild(cancelBtn);
        document.getElementById("dialog-next").style.display = "none";
        box.style.display = "block";
    },

    solvePuzzle() {
        const obj = this.puzzle.obj, puzzle = this.puzzle.data;
        this.puzzlesSolved++;
        if (obj) obj.isPuzzle = false;
        document.getElementById("dialog-box").style.display = "none";
        this.puzzle.active = false;
        this.state = "playing";
        if (puzzle.afterSolve?.dialogue) {
            setTimeout(() => this.showDialog(puzzle.afterSolve.dialogue), 300);
        } else {
            this.showHint("谜题解开！✨");
        }
        this.updateUI();
    },

    closePuzzle() {
        document.getElementById("dialog-box").style.display = "none";
        this.puzzle.active = false;
        this.state = "playing";
    },

    // ============================================================
    // 建造
    // ============================================================
    showBuildMenu() {
        const ch = GameData.chapters[this.currentChapter];
        const grid = document.getElementById("build-grid");
        grid.innerHTML = "";
        ch.buildings.forEach(b => {
            const can = this.canAfford(b.cost);
            const item = document.createElement("div");
            item.className = "build-item" + (can ? "" : " disabled");
            item.dataset.id = b.id;
            item.innerHTML = '<div class="b-icon">' + b.icon + '</div><div class="b-name">' + b.name + '</div><div class="b-cost">💰' + (b.cost.gold||0) + ' 🪵' + (b.cost.wood||0) + '</div>';
            grid.appendChild(item);
        });
        document.getElementById("build-menu").style.display = "block";
    },

    canAfford(cost) {
        if (!cost) return true;
        if (cost.gold && this.player.gold < cost.gold) return false;
        if (cost.wood && this.player.wood < cost.wood) return false;
        if (cost.stone && this.player.stone < cost.stone) return false;
        if (cost.crystal && this.player.crystals < cost.crystal) return false;
        return true;
    },

    placeBuild(wx, wy) {
        const g = 32, bx = Math.floor(wx/g)*g, by = Math.floor(wy/g)*g;
        const bdata = GameData.chapters[this.currentChapter]?.buildings.find(b => b.id === this.ui.selectedBuild);
        if (!bdata || !this.canAfford(bdata.cost)) { this.showHint("资源不足！"); }
        else {
            if (bdata.cost.gold) this.player.gold -= bdata.cost.gold;
            if (bdata.cost.wood) this.player.wood -= bdata.cost.wood;
            if (bdata.cost.stone) this.player.stone -= bdata.cost.stone;
            if (bdata.cost.crystal) this.player.crystals -= bdata.cost.crystal;
            const colors = { house:"#8B4513", farm:"#2d6a2d", tower:"#4a4a6a", workshop:"#cd853f", barracks:"#8b0000", signal_tower:"#1a5276" };
            this.buildings.push({ x: bx, y: by, w: g, h: g, icon: bdata.icon, name: bdata.name, color: colors[bdata.id] || "#666" });
            this.buildingsBuilt++;
            this.spawnParticle(bx+g/2, by, bdata.icon, "#ffd700");
            this.showHint("建造了：" + bdata.name);
            this.updateUI();
        }
        this.ui.placingBuild = false; this.ui.selectedBuild = null;
    },

    // ============================================================
    // 剧情
    // ============================================================
    showStoryOverlay(init) {
        const s = this.story;
        if (!s.queue || s.queue.length === 0) {
            document.getElementById("story-overlay").style.display = "none";
            this.state = "playing"; return;
        }
        const item = s.queue[s.current];
        if (!item) { document.getElementById("story-overlay").style.display = "none"; this.state = "playing"; return; }
        const overlay = document.getElementById("story-overlay");
        overlay.style.display = "flex";
        document.getElementById("story-title").textContent = item.title || "";
        document.getElementById("story-text").textContent = item.text || "";
        const btn = document.getElementById("story-btn");
        // init=true 表示首次显示序章封面，按钮为"开始冒险"
        // init=false 或非首次，显示"继续"
        btn.textContent = (init && item.isIntro) ? "开始冒险 ▶" : "继续 ▶";
        // 确保触屏设备也能正常点击按钮
        btn.onpointerup = function(e) {
            e.preventDefault();
            Game.storyNext();
        };
    },

    storyNext() {
        const s = this.story;
        s.current++;
        if (s.current < s.queue.length) {
            this.showStoryOverlay(false);
        } else {
            document.getElementById("story-overlay").style.display = "none";
            this.state = "playing";
            this.showHint("📍 探索：WASD/方向键移动，鼠标/触屏点击互动");
        }
    },

    // ============================================================
    // UI工具
    // ============================================================
    updateUI() {
        document.getElementById("ui-gold").textContent = "💰 " + this.player.gold;
        const ch = GameData.chapters[this.currentChapter];
        const o = ch.objectives || {};
        const exploreTarget = o.explore || 1;
        const puzzleTarget = o.puzzle || 1;
        const buildTarget = o.build || 1;
        const defeatTarget = o.defeat || 0;
        const collectTarget = o.collect || 0;
        document.getElementById("ui-star").textContent = "探索 " + this.explored + "/" + exploreTarget + " | 谜题 " + this.puzzlesSolved + "/" + puzzleTarget + " | 建造 " + this.buildingsBuilt + "/" + buildTarget;
    },

    updateBattleUI() {
        const p = this.player;
        document.getElementById("princess-hp").style.width = (p.hp / p.maxHp * 100) + "%";
        document.getElementById("princess-hp-text").textContent = p.hp;
        document.getElementById("princess-mp").style.width = (p.mp / p.maxMp * 100) + "%";
        document.getElementById("princess-mp-text").textContent = p.mp;
    },

    spawnParticle(x, y, icon, color, size) {
        this.particles.push({ x, y, icon, color, size: size||18, vx: (Math.random()-0.5)*2, vy: -3-Math.random()*2, life: 1.0, maxLife: 1.0, gravity: 4 });
    },

    showHint(text) {
        const hb = document.getElementById("hint-bubble");
        hb.textContent = text; hb.style.display = "block";
        this.ui.showingHint = true; this.ui.hintTimer = 3.0;
    },

    showWaveHint(text) {
        const el = document.getElementById("wave-hint");
        el.textContent = text; el.style.display = "block";
        el.style.animation = "none"; el.offsetHeight; el.style.animation = "fadeInOut 2s forwards";
        setTimeout(() => { el.style.display = "none"; }, 2000);
    },

    closeAllUI() {
        if (this.ui.placingBuild) { this.ui.placingBuild = false; this.ui.selectedBuild = null; }
        if (document.getElementById("build-menu").style.display !== "none") { document.getElementById("build-menu").style.display = "none"; }
    },

    // ============================================================
    // UI切换
    // ============================================================
    ui: {
        mode: "explore", selectedBuild: null, placingBuild: false, showingHint: false, hintTimer: 0,
        selectMode(mode) {
            if (this.placingBuild) { this.placingBuild = false; this.selectedBuild = null; }
            document.getElementById("build-menu").style.display = "none";
            if (mode === "build") {
                Game.showBuildMenu(); document.getElementById("battle-hud").style.display = "none";
            } else if (mode === "battle") {
                const ch = GameData.chapters[Game.currentChapter];
                if (ch.waves && ch.waves.length > 0) {
                    Game.state = "battle"; Game.ui.mode = "battle";
                    Game.battle = { active: true, waveIndex: 0, waveTimer: 2.0, waveSpawned: false };
                    document.getElementById("battle-hud").style.display = "block";
                    Game.updateBattleUI();
                    Game.showWaveHint("⚔️ 战斗开始！");
                } else { Game.showHint("暂无战斗！"); }
            } else {
                document.getElementById("battle-hud").style.display = "none";
                Game.ui.mode = "explore";
                if (Game.state === "battle") Game.state = "playing";
            }
            document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
            document.getElementById("btn-" + mode)?.classList.add("active");
        },
        toggleMap() { Game.showHint("地图功能开发中…🗺️"); },
        showStory() { if (Game.story.queue && Game.story.queue.length > 0) { Game.showStoryOverlay(true); } }
    }
};

// 页面加载时立即绑定事件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Game.bindEvents());
} else {
    Game.bindEvents();
}
