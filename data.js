// ============================================================
// 游戏数据：章节、NPC、谜题、道具、战斗
// ============================================================

const GameData = {

    // 资源初始值
    initGold: 100,
    initWood: 50,
    initStone: 20,

    // ============================================================
    // 章节定义
    // ============================================================
    chapters: [
        // ---------- 序章 ----------
        {
            id: 0,
            name: "序章",
            subtitle: "踏上封地",
            mapWidth: 800,
            mapHeight: 400,
            bgColor: "#2d5a1b",
            // 地形贴片类型: 0=草地, 1=泥土路, 2=石地, 3=水面, 4=树林
            tiles: "generate_prologue",
            // 可互动的物件/人物
            objects: [
                {
                    id: "ruins_entrance",
                    type: "ruins",
                    x: 600, y: 180,
                    w: 64, h: 64,
                    icon: "🏛️",
                    name: "遗迹入口",
                    description: "古老的石门，上面刻满了奇怪的符号……",
                    interactions: ["observe","study"],
                    studied: false,
                    studiedDialogue: {
                        speaker: "小公主",
                        text: "这些符号好奇怪……像是在记录什么重要的事情。也许我应该找懂得解读的人来看看。"
                    }
                },
                {
                    id: "old_tree",
                    type: "object",
                    x: 200, y: 220,
                    w: 48, h: 48,
                    icon: "🌳",
                    name: "老橡树",
                    description: "一棵巨大的老树，树干上刻着奇怪的图案。",
                    interactions: ["look"],
                    lookDialogue: {
                        speaker: "小公主",
                        text: "这棵树好老啊……树干上刻着一个符号，和遗迹门上的好像！"
                    }
                },
                {
                    id: "stone_tablet",
                    type: "tablet",
                    x: 420, y: 280,
                    w: 56, h: 40,
                    icon: "📜",
                    name: "古石碑",
                    description: "一块布满尘埃的石碑，上面有三种颜色的符号排列。",
                    isPuzzle: true,
                    puzzleId: "symbol_order",
                    afterSolve: {
                        dialogue: {
                            speaker: "神秘的声音",
                            text: "好奇心是智慧的开始……你已经迈出了第一步。继续探索，真相就在脚下。"
                        }
                    }
                },
                {
                    id: "npc_elder",
                    type: "npc",
                    x: 350, y: 160,
                    w: 48, h: 64,
                    icon: "👴",
                    name: "老守护者·赫尔蒙",
                    role: "keeper",
                    color: "#8B4513",
                    dialogues: {
                        first: {
                            speaker: "赫尔蒙",
                            text: "公主殿下，欢迎来到您的封地。我是赫尔蒙，世代守护这片土地的老园丁。这里的每一棵树、每一块石头，都有着古老的故事。",
                            options: [
                                { text: "这片土地有什么秘密？", next: "secret1" },
                                { text: "你在这里多久了？", next: "time1" },
                                { text: "我想自己探索", next: "exit" }
                            ]
                        },
                        secret1: {
                            speaker: "赫尔蒙",
                            text: "秘密？呵呵……这片土地的地下，沉睡着远古的守护者留下的遗产。不过，要找到它，需要先解开那些古老的谜题。",
                            options: [
                                { text: "远古的守护者？", next: "secret2" },
                                { text: "我明白了", next: "exit" }
                            ]
                        },
                        secret2: {
                            speaker: "赫尔蒙",
                            text: "很久很久以前，这里住着一种神奇的生物……它们拥有远超人类的智慧，却选择了离开这片土地。临走前，它们把文明的种子埋在了地下。",
                            options: [
                                { text: "它们是谁？", next: "secret3" },
                                { text: "我知道了", next: "exit" }
                            ]
                        },
                        secret3: {
                            speaker: "赫尔蒙",
                            text: "如果你想找到答案，就去遗迹看看吧。那里有一道被封印的门……也许，能解答你心中的疑惑。但要小心，公主殿下。那扇门的背后，藏着改变世界的真相。",
                            options: [
                                { text: "我一定会去看看的！", next: "exit" }
                            ]
                        },
                        time1: {
                            speaker: "赫尔蒙",
                            text: "我啊……从我爷爷的爷爷那辈开始，就在这里守护了。我已经老得记不清多少年了。但我记得我爷爷说的话——总有一天，会有人来完成我们的使命。",
                            options: [
                                { text: "什么使命？", next: "secret1" },
                                { text: "明白了", next: "exit" }
                            ]
                        },
                        exit: {
                            speaker: "赫尔蒙",
                            text: "去吧，公主殿下。愿先祖的智慧指引你。",
                            options: []
                        }
                    },
                    visited: false,
                    clueGiven: false
                }
            ],
            // 建造系统 - 可建造的建筑
            buildings: [
                {
                    id: "house",
                    name: "小屋",
                    icon: "🏠",
                    cost: { gold: 30, wood: 20 },
                    desc: "居民居住的地方，增加人口上限"
                },
                {
                    id: "farm",
                    name: "农田",
                    icon: "🌾",
                    cost: { gold: 20, wood: 10 },
                    desc: "生产食物，每回合产出金币"
                },
                {
                    id: "tower",
                    name: "瞭望塔",
                    icon: "🗼",
                    cost: { gold: 50, stone: 20 },
                    desc: "侦察周围，发现隐藏区域"
                },
                {
                    id: "workshop",
                    name: "工坊",
                    icon: "⚒️",
                    cost: { gold: 40, wood: 30, stone: 10 },
                    desc: "制作工具，解锁高级谜题"
                }
            ],
            // 谜题定义
            puzzles: {
                symbol_order: {
                    id: "symbol_order",
                    name: "符号排序",
                    type: "order",
                    hint: "石碑上有三种颜色，代表红、蓝、绿……",
                    symbols: [
                        { color: "#e74c3c", shape: "triangle", meaning: "火" },
                        { color: "#3498db", shape: "circle", meaning: "水" },
                        { color: "#2ecc71", shape: "square", meaning: "木" }
                    ],
                    correctOrder: [0, 1, 2], // 火 > 水 > 木
                    reward: { gold: 50, clue: "古语的秘密" },
                    description: "石碑上的符号需要按正确顺序排列：火把水蒸发，水滋养木，木生成火……这是远古的轮回之道。"
                }
            },
            // 战斗波次
            waves: [],
            // 过关条件
            objectives: {
                explore: 3,   // 探索3个地点
                puzzle: 1,    // 解开1个谜题
                build: 1      // 建造1个建筑
            },
            // 过关后的剧情
            completionStory: {
                title: "🌟 序章完成",
                text: "小公主在封地上扎下了根基。通过探索和思考，她发现了这片土地的不寻常之处——古老的遗迹、神秘的老守护者，还有那块刻着奇怪符号的石碑……\n\n一切才刚刚开始。\n\n「真相就在脚下。」——神秘的声音"
            }
        },

        // ---------- 第一章 ----------
        {
            id: 1,
            name: "第一章",
            subtitle: "地底的秘密",
            mapWidth: 900,
            mapHeight: 450,
            bgColor: "#1a3a2a",
            tiles: "generate_chapter1",
            objects: [
                {
                    id: "ruins_deep",
                    type: "ruins",
                    x: 700, y: 200,
                    w: 72, h: 72,
                    icon: "🚪",
                    name: "封印之门",
                    description: "一道刻满符号的石门，散发着幽幽的蓝光……",
                    locked: true,
                    lockDialogue: {
                        speaker: "小公主",
                        text: "这扇门被封印了，需要某种特殊的力量才能打开。也许我应该找到更多线索。"
                    },
                    interactions: ["observe", "open"],
                    opened: false
                },
                {
                    id: "crystal_shard",
                    type: "collectible",
                    x: 300, y: 300,
                    w: 40, h: 40,
                    icon: "💎",
                    name: "蓝色水晶碎片",
                    description: "一块发出淡蓝色光芒的水晶碎片，触手冰凉。",
                    collected: false,
                    collectDialogue: {
                        speaker: "小公主",
                        text: "这块水晶……和封印之门上的图案一模一样！这是打开那扇门的关键吗？"
                    }
                },
                {
                    id: "sketch_scroll",
                    type: "tablet",
                    x: 150, y: 150,
                    w: 56, h: 40,
                    icon: "📜",
                    name: "古老草图",
                    description: "一张泛黄的草图，画着某种机械装置的构造。",
                    isPuzzle: true,
                    puzzleId: "mechanism",
                    afterSolve: {
                        dialogue: {
                            speaker: "小公主",
                            text: "原来如此！这张草图上画的是远古守护者留下的动力装置……如果能修复它，也许就能打开那扇封印之门！"
                        }
                    }
                },
                {
                    id: "fossil_1",
                    type: "fossil",
                    x: 500, y: 100,
                    w: 56, h: 40,
                    icon: "🦴",
                    name: "远古化石",
                    description: "一块嵌在岩石中的巨型骨骼化石。",
                    studied: false,
                    studyDialogue: {
                        speaker: "小公主",
                        text: "这块骨骼……不像任何已知动物的骨头。它太大了，一定是某种……远古巨兽。"
                    }
                },
                {
                    id: "npc_scholar",
                    type: "npc",
                    x: 400, y: 250,
                    w: 48, h: 64,
                    icon: "📚",
                    name: "考古学者·凌薇",
                    role: "keeper",
                    color: "#6a5acd",
                    dialogues: {
                        first: {
                            speaker: "凌薇",
                            text: "公主殿下！我是一名考古学者，专门研究这片土地的远古历史。我知道一些关于封印之门的事情……",
                            options: [
                                { text: "那扇门背后是什么？", next: "door_secret" },
                                { text: "你能帮我解读符号吗？", next: "symbols" },
                                { text: "我再想想", next: "exit" }
                            ]
                        },
                        door_secret: {
                            speaker: "凌薇",
                            text: "传说中，那扇门后面是远古守护者留下的「知识殿堂」。里面保存着它们全部的智慧和历史。但门被特殊的力量封印了，需要找到三把钥匙才能打开。",
                            options: [
                                { text: "三把钥匙在哪里？", next: "keys" },
                                { text: "我去找找看", next: "exit" }
                            ]
                        },
                        keys: {
                            speaker: "凌薇",
                            text: "第一把钥匙是「记忆之石」，藏在化石旁边。第二把是「力量之种」，在森林深处。第三把……是「勇气之心」，只有证明自己实力的领主才能获得。",
                            options: [
                                { text: "明白了！", next: "exit" }
                            ]
                        },
                        symbols: {
                            speaker: "凌薇",
                            text: "这些符号……我研究过。它们是一种古老的文字，记录着远古守护者的历史。但要完全解读，需要工坊里的研究设备。",
                            options: [
                                { text: "我去建一个工坊", next: "exit" }
                            ]
                        },
                        exit: {
                            speaker: "凌薇",
                            text: "祝你好运，公主殿下！记得收集足够的资源来建造工坊，那里能帮你解读更多符号。",
                            options: []
                        }
                    },
                    visited: false
                },
                {
                    id: "npc_warrior",
                    type: "npc",
                    x: 600, y: 350,
                    w: 48, h: 64,
                    icon: "⚔️",
                    name: "守卫·石岩",
                    role: "keeper",
                    color: "#cd5c5c",
                    dialogues: {
                        first: {
                            speaker: "石岩",
                            text: "哼！又来了一个领主？想要通过我的考验，就拿出点真本事来！先在战斗中证明你的实力！",
                            options: [
                                { text: "接受挑战！", next: "battle_intro" },
                                { text: "我现在还不够强", next: "exit" }
                            ]
                        },
                        battle_intro: {
                            speaker: "石岩",
                            text: "好！我给你三天时间准备。建造防御设施，训练你的战士。等你准备好了，来找我！",
                            options: [
                                { text: "我不会让你失望的！", next: "exit" }
                            ]
                        },
                        exit: {
                            speaker: "石岩",
                            text: "哼，别让我等太久！",
                            options: []
                        }
                    },
                    visited: false
                }
            ],
            buildings: [
                { id: "house", name: "小屋", icon: "🏠", cost: { gold: 30, wood: 20 }, desc: "居民居住" },
                { id: "farm", name: "农田", icon: "🌾", cost: { gold: 20, wood: 10 }, desc: "生产食物" },
                { id: "tower", name: "瞭望塔", icon: "🗼", cost: { gold: 50, stone: 20 }, desc: "发现隐藏区域" },
                { id: "workshop", name: "工坊", icon: "⚒️", cost: { gold: 40, wood: 30, stone: 10 }, desc: "解读符号" },
                { id: "barracks", name: "兵营", icon: "🏰", cost: { gold: 60, stone: 30, wood: 20 }, desc: "训练战士" }
            ],
            puzzles: {
                mechanism: {
                    id: "mechanism",
                    name: "远古机关",
                    type: "mechanism",
                    hint: "草图上有三个齿轮，它们需要按正确的顺序连接……",
                    correctSolution: "triangle_circle_square",
                    reward: { gold: 80, key: "memory_stone" },
                    description: "古老的机械装置需要正确组装三个部件：三角形齿轮、圆形齿轮、方形齿轮。"
                }
            },
            waves: [
                { enemies: [{ type: "slime", x: 100, y: 300 }], spawnDelay: 1000 }
            ],
            objectives: {
                explore: 5,
                puzzle: 1,
                build: 2,
                defeat: 1,
                collect: 1
            },
            completionStory: {
                title: "🌟 第一章完成",
                text: "小公主解开了远古机关，获得了第一把钥匙「记忆之石」的力量。\n\n封印之门的封印正在松动……\n\n「你们走到了这一步。」——一个来自远古的声音\n\n第二章：守护者的秘密，即将解锁。"
            }
        },

        // ---------- 第二章 ----------
        {
            id: 2,
            name: "第二章",
            subtitle: "守护者的秘密",
            mapWidth: 1000,
            mapHeight: 480,
            bgColor: "#1a1a3a",
            tiles: "generate_chapter2",
            objects: [
                {
                    id: "seal_door_final",
                    type: "ruins",
                    x: 800, y: 200,
                    w: 80, h: 80,
                    icon: "🚪",
                    name: "知识殿堂之门",
                    description: "那扇传说中的门终于打开了……门后是一片幽蓝的光海。",
                    locked: false,
                    opened: false,
                    interactions: ["observe", "enter"],
                    enterDialogue: {
                        speaker: "小公主",
                        text: "这就是……远古知识殿堂！我感觉到一种无比强大的力量从门后涌来……"
                    }
                },
                {
                    id: "altar",
                    type: "altar",
                    x: 400, y: 200,
                    w: 64, h: 64,
                    icon: "⛩️",
                    name: "星语者祭坛",
                    description: "祭坛上刻着一段话：「吾乃星语者，恐龙文明最后的记录者。」",
                    isPuzzle: true,
                    puzzleId: "starseeker_puzzle",
                    afterSolve: {
                        dialogue: {
                            speaker: "星语者的幻影",
                            text: "……你终于来了。\n\n我是星语者。6500万年前，我是恐龙迁徙计划的总设计师。当那颗 killer 星体的轨迹被计算出来时，我知道我们的时间不多了……\n\n我送走了三千万同胞，让他们去远方寻找新的家园。而我，选择留下，记录这一切。\n\n如果有一天，地球的新生命找到了这些……\n\n请告诉它们：\n\n我们没有灭绝。\n\n我们只是……去了远方。\n\n而你们，就是我们等待的那个人。\n\n去吧，孩子。去联系我们遥远的孩子。告诉它们——家，还记得它们。"
                        }
                    }
                },
                {
                    id: "star_map",
                    type: "starmap",
                    x: 200, y: 300,
                    w: 72, h: 56,
                    icon: "🌌",
                    name: "星图",
                    description: "一张记录着遥远星系的星图，最亮的点标注着Kepler-442b。",
                    collected: false,
                    collectDialogue: {
                        speaker: "小公主",
                        text: "Kepler-442b……就是这里！远古守护者迁徙的目的地！"
                    }
                },
                {
                    id: "guardian_ghost",
                    type: "npc",
                    x: 500, y: 150,
                    w: 48, h: 64,
                    icon: "👻",
                    name: "星语者的残影",
                    role: "guardian",
                    color: "#00bfff",
                    dialogues: {
                        first: {
                            speaker: "星语者残影",
                            text: "……孩子，你终于解开了我留下的最后一个谜题。我已经等待了很久很久。\n\n我叫星语者。是恐龙文明最后一个留守的人。\n\n6500万年前，我目送三千万同胞登上飞船，飞向遥远的新家园。而我，留在这里，记下了一切。\n\n我一直在等。等地球上的新生命觉醒，等有人能读懂我们的故事。",
                            options: [
                                { text: "你们去了哪里？", next: "where" },
                                { text: "为什么要离开地球？", next: "why" },
                                { text: "我愿意继承你的使命", next: "mission" }
                            ]
                        },
                        where: {
                            speaker: "星语者残影",
                            text: "我们去了Kepler-442b。一颗距离地球112光年的蓝色星球。我们的先祖在那里建立了新的文明。\n\n但112光年的距离，即使以我们最快的飞船，也需要一万五千年。\n\n那是6500万年前的事了……我不知道它们现在是否还活着，是否还在等待。",
                            options: [
                                { text: "为什么要告诉我这些？", next: "mission" },
                                { text: "我明白了", next: "exit" }
                            ]
                        },
                        why: {
                            speaker: "星语者残影",
                            text: "因为那颗星体来了。\n\n它不只是一次撞击。它带来的核冬天，会持续千年。我们计算过——地球会死。所有生命都会消失。\n\n唯一的出路，是离开。",
                            options: [
                                { text: "你们成功了吗？", next: "where" },
                                { text: "我明白了", next: "exit" }
                            ]
                        },
                        mission: {
                            speaker: "星语者残影",
                            text: "孩子，我把我所有的知识都留在了知识殿堂里。你已经证明了自己的勇气和智慧。\n\n现在，你有资格做出选择：\n\n——寻找我们的后裔，向112光年外的Kepler-442b发射信号，重建两个文明的联系。\n——或者，继承这份知识，成为这片土地真正的主人。\n\n无论你选择什么……\n\n请记住：我们没有灭绝。我们只是去了远方。而远方，也终将成为另一个家。",
                            options: [
                                { text: "我选择……重建联系（双结局A）", next: "ending_link" },
                                { text: "我选择……继承使命（双结局B）", next: "ending_inherit" },
                                { text: "让我再想想……", next: "exit" }
                            ]
                        },
                        ending_link: {
                            speaker: "星语者残影",
                            text: "你的选择……很好。\n\n去吧，孩子。向远方发射信号。告诉它们——地球还记得它们。地球的孩子们，继承了它们的意志。\n\n也许，它们还活着。也许，它们也在等一个信号。\n\n一万五千年……对宇宙来说，不过是一瞬。\n\n去吧。宇宙很大，而你们，将成为连接两个文明的桥梁。",
                            options: []
                        },
                        ending_inherit: {
                            speaker: "星语者残影",
                            text: "你的选择……也很好。\n\n成为守护者吧，孩子。像我一样，把知识和希望传承下去。总有一天，当人类的技术足够发达，你们会找到它们的。\n\n而到那时，你就是这段历史的守护者。\n\n我把所有的希望，都托付给你了。\n\n谢谢你，找到我。谢谢你，读完了这个故事。\n\n——星语者，于地球，最后的记录。",
                            options: []
                        },
                        exit: {
                            speaker: "星语者残影",
                            text: "慢慢来，孩子。这个选择，需要时间。",
                            options: []
                        }
                    },
                    visited: false
                },
                {
                    id: "npc_elder_ch2",
                    type: "npc",
                    x: 150, y: 400,
                    w: 48, h: 64,
                    icon: "👴",
                    name: "赫尔蒙",
                    role: "keeper",
                    color: "#8B4513",
                    dialogues: {
                        first: {
                            speaker: "赫尔蒙",
                            text: "公主殿下……您已经走到了这一步。我们的家族守护了这片土地几千年，就是为了等待这一天。\n\n我的祖辈传下一句话：「当龙之国的公主解开星语的秘密，世界将再次见证远古的智慧。」\n\n那个预言……就要实现了。",
                            options: [
                                { text: "什么预言？", next: "prophecy" },
                                { text: "谢谢你一直守护这里", next: "exit" }
                            ]
                        },
                        prophecy: {
                            speaker: "赫尔蒙",
                            text: "传说，在恐龙文明消失之后，它们的守护者并没有离开。他们变成了普通的人类，守护着遗迹，等待真正的继承者出现。\n\n我就是那些守护者的后裔。\n\n而您——被龙守护者选中的公主——就是我们等待的人。",
                            options: [
                                { text: "我会完成使命的！", next: "exit" }
                            ]
                        },
                        exit: {
                            speaker: "赫尔蒙",
                            text: "去吧，公主殿下。远方在等着你们。",
                            options: []
                        }
                    },
                    visited: false
                }
            ],
            buildings: [
                { id: "house", name: "小屋", icon: "🏠", cost: { gold: 30, wood: 20 }, desc: "居民居住" },
                { id: "farm", name: "农田", icon: "🌾", cost: { gold: 20, wood: 10 }, desc: "生产食物" },
                { id: "tower", name: "瞭望塔", icon: "🗼", cost: { gold: 50, stone: 20 }, desc: "发现隐藏区域" },
                { id: "workshop", name: "工坊", icon: "⚒️", cost: { gold: 40, wood: 30, stone: 10 }, desc: "解读符号" },
                { id: "barracks", name: "兵营", icon: "🏰", cost: { gold: 60, stone: 30, wood: 20 }, desc: "训练战士" },
                { id: "signal_tower", name: "信号塔", icon: "📡", cost: { gold: 100, stone: 50, crystal: 1 }, desc: "发射星际信号" }
            ],
            puzzles: {
                starseeker_puzzle: {
                    id: "starseeker_puzzle",
                    name: "星语者试炼",
                    type: "memory",
                    hint: "记住星图上星星闪烁的顺序……",
                    sequence: [0, 2, 1, 3], // 星星闪亮顺序
                    reward: { gold: 200, truth: "恐龙迁徙的全部真相" },
                    description: "祭坛上出现了四颗星星，按照正确的顺序触碰它们……"
                }
            },
            waves: [
                { enemies: [{ type: "slime", x: 100, y: 250 }, { type: "slime", x: 80, y: 300 }], spawnDelay: 1000 },
                { enemies: [{ type: "wolf", x: 150, y: 200 }, { type: "slime", x: 100, y: 350 }], spawnDelay: 2000 }
            ],
            objectives: {
                explore: 6,
                puzzle: 1,
                build: 3,
                defeat: 2,
                collect: 1
            },
            completionStory: {
                title: "🌟🌟 游戏通关！",
                text: "小公主完成了星语者的试炼，了解了恐龙文明迁徙的全部真相。\n\n6500万年前，恐龙没有灭绝。它们带着希望，飞向了远方。\n\n而今天，继承者终于找到了守护者留下的遗产。\n\n故事还在继续——\n\n远方，新的文明是否还在等待？\n\n而你，就是连接两个世界的桥梁。\n\n🦕 感谢游玩《恐龙远徙之谜》",
                isEnding: true
            }
        }
    ],

    // 敌人类型
    enemies: {
        slime: {
            name: "史莱姆",
            icon: "🟢",
            hp: 30,
            damage: 5,
            speed: 0.5,
            color: "#2ecc71",
            size: 24,
            reward: { gold: 10 }
        },
        wolf: {
            name: "暗影狼",
            icon: "🐺",
            hp: 60,
            damage: 12,
            speed: 1.0,
            color: "#9b59b6",
            size: 28,
            reward: { gold: 20 }
        },
        golem: {
            name: "石魔像",
            icon: "🗿",
            hp: 120,
            damage: 20,
            speed: 0.3,
            color: "#7f8c8d",
            size: 36,
            reward: { gold: 40 }
        }
    },

    // 公主技能
    skills: [
        { id: "fireball", name: "火球术", icon: "🔥", mpCost: 10, damage: 25, desc: "发射一个火球" },
        { id: "shield", name: "守护之盾", icon: "🛡️", mpCost: 15, cooldown: 3, desc: "抵挡一次攻击" },
        { id: "heal", name: "治愈之光", icon: "✨", mpCost: 20, heal: 30, desc: "恢复生命值" }
    ]
};
