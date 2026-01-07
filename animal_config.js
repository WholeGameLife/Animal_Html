// ============================================
// 电子盆栽 - 动物管理配置文件
// 包含所有游戏配置数据，与逻辑代码分离
// ============================================

// 等级和成长配置
const LEVEL_CONFIG = {
    baseExperience: 100,
    experienceMultiplier: 1.5,
    feedAmount: 20,
    potentialMultipliers: { 
        '平庸': { stamina: 1.0, combat: 1.0 }, 
        '超常': { stamina: 1.2, combat: 1.3 }, 
        '璀璨': { stamina: 1.5, combat: 1.8 } 
    },
    baseGrowth: { 
        stamina: 10, 
        attack: 3, 
        defense: 2, 
        agility: 2, 
        favorability: 5 
    }
};

// 操作持续时间配置
const ACTION_DURATION = 15000; // 15秒（繁殖/融合）

// 元素图标配置
const ELEMENT_ICONS = {
    '水': '💧',
    '火': '🔥',
    '土': '🌍',
    '风': '💨',
    '雷': '⚡️',
    '木': '🌳',
    '光': '☀️',
    '暗': '🌙',
    '默认': '❔'
};

// 元素颜色配置
const ELEMENT_COLORS = {
    '水': 'bg-blue-500',
    '火': 'bg-red-600',
    '土': 'bg-amber-700',
    '风': 'bg-teal-400 text-black',
    '雷': 'bg-yellow-400 text-black',
    '木': 'bg-green-600',
    '光': 'bg-yellow-200 text-black',
    '暗': 'bg-indigo-800',
    '默认': 'bg-gray-500'
};

// 动物名称列表
const ANIMAL_NAMES = [
    'Ami', 'Bao', 'Cai', 'Duo', 'Fei', 
    'Gui', 'Hao', 'Jing', 'Kai', 'Ling'
];

// 道具配置
const ITEMS = {
    'exp_potion_s': { 
        name: '小经验药水', 
        icon: '🧪', 
        type: 'exp', 
        value: 50, 
        desc: '增加50点经验' 
    },
    'exp_potion_l': { 
        name: '大经验药水', 
        icon: '⚗️', 
        type: 'exp', 
        value: 200, 
        desc: '增加200点经验' 
    },
    'stamina_potion': { 
        name: '体力药剂', 
        icon: '⚡', 
        type: 'stamina', 
        value: 50, 
        desc: '恢复50点体力' 
    },
    'mutation_serum': { 
        name: '变异血清', 
        icon: '💉', 
        type: 'material', 
        desc: '诱发动物基因突变的关键道具' 
    }
};

// 战斗技能配置
const COMBAT_SKILLS = {
    'POWER_STRIKE': { 
        name: '力量打击', 
        icon: '💥', 
        type: 'attack', 
        desc: '造成150%攻击力的伤害', 
        cooldown: 3 
    },
    'SHIELD_BASH': { 
        name: '盾击', 
        icon: '🛡️', 
        type: 'defense', 
        desc: '提升50%防御并反击', 
        cooldown: 4 
    },
    'QUICK_SLASH': { 
        name: '疾风斩', 
        icon: '⚡', 
        type: 'agility', 
        desc: '连续攻击2次，每次70%伤害', 
        cooldown: 2 
    },
    'BERSERKER': { 
        name: '狂暴', 
        icon: '😡', 
        type: 'buff', 
        desc: '攻击力提升30%，持续3回合', 
        cooldown: 5 
    },
    'IRON_WALL': { 
        name: '铁壁', 
        icon: '🏰', 
        type: 'defense', 
        desc: '防御力提升50%，持续2回合', 
        cooldown: 4 
    },
    'DODGE': { 
        name: '闪避', 
        icon: '💨', 
        type: 'agility', 
        desc: '下次攻击必定闪避', 
        cooldown: 3 
    },
    'CRITICAL_HIT': { 
        name: '致命一击', 
        icon: '🎯', 
        type: 'attack', 
        desc: '造成200%暴击伤害', 
        cooldown: 5 
    },
    'LIFE_STEAL': { 
        name: '生命汲取', 
        icon: '🩸', 
        type: 'attack', 
        desc: '攻击回复50%伤害的生命', 
        cooldown: 4 
    },
    'COUNTER': { 
        name: '反击', 
        icon: '↩️', 
        type: 'defense', 
        desc: '受到攻击时反击100%伤害', 
        cooldown: 3 
    },
    'SPEED_BOOST': { 
        name: '加速', 
        icon: '🚀', 
        type: 'agility', 
        desc: '敏捷提升40%，持续2回合', 
        cooldown: 3 
    }
};

// 变异系统配置
const MUTATION_CONFIG = {
    tier1: {
        basic: {
            '黑化': {
                icon: '🖤',
                rarity: 'basic',
                chain: 'dark',
                skills: [],  // 技能由技能设计器提供
                stats: { attack: 5 }
            },
            '白化': {
                icon: '🤍',
                rarity: 'basic',
                chain: 'light',
                skills: [],  // 技能由技能设计器提供
                stats: { stamina: 10 }
            },
            '晶化': {
                icon: '💎',
                rarity: 'basic',
                chain: 'crystal',
                skills: [],  // 技能由技能设计器提供
                stats: { defense: 5 }
            },
            '影化': {
                icon: '👤',
                rarity: 'basic',
                chain: 'thunder',
                skills: [],  // 技能由技能设计器提供
                stats: { agility: 5 }
            }
        },
        elite: {
            '暗蚀': {
                icon: '🌑',
                rarity: 'elite',
                chain: 'dark',
                skills: [],  // 技能由技能设计器提供
                stats: { attack: 10 }
            },
            '圣辉': {
                icon: '✨',
                rarity: 'elite',
                chain: 'light',
                skills: [],  // 技能由技能设计器提供
                stats: { stamina: 15, defense: 5 }
            },
            '异能': {
                icon: '🔮',
                rarity: 'elite',
                chain: 'crystal',
                skills: [],  // 技能由技能设计器提供
                stats: { attack: 6, defense: 6 }
            },
            '极电': {
                icon: '⚡',
                rarity: 'elite',
                chain: 'thunder',
                skills: [],  // 技能由技能设计器提供
                stats: { attack: 8, agility: 8 }
            }
        },
        legendary: {
            '永夜': {
                icon: '🌙',
                rarity: 'legendary',
                chain: 'dark',
                skills: [],  // 技能由技能设计器提供
                stats: { attack: 15, defense: 10 },
                mechanism: 'enemy_debuff'
            },
            '永耀': {
                icon: '☀️',
                rarity: 'legendary',
                chain: 'light',
                skills: [],  // 技能由技能设计器提供
                stats: { stamina: 20, defense: 10 },
                mechanism: 'team_buff'
            },
            '源晶': {
                icon: '💠',
                rarity: 'legendary',
                chain: 'crystal',
                skills: [],  // 技能由技能设计器提供
                stats: { defense: 15, stamina: 15 },
                mechanism: 'production'
            },
            '雷煌': {
                icon: '⚡',
                rarity: 'legendary',
                chain: 'thunder',
                skills: [],  // 技能由技能设计器提供
                stats: { attack: 15, agility: 15 },
                mechanism: 'speed_buff'
            }
        }
    },
    tier2: {
        '阴': { 
            icon: '☯️', 
            stats: { agility: 10, stamina: 15 } 
        },
        '阳': { 
            icon: '☀️', 
            stats: { attack: 10, defense: 10 } 
        },
        '玄': { 
            icon: '🔯', 
            stats: { attack: 5, defense: 5, agility: 5, stamina: 10 } 
        }
    }
};

// 亲和关系链定义
const AFFINITY_CHAINS = {
    dark: { 
        basic: '黑化', 
        elite: '暗蚀', 
        legendary: '永夜', 
        opposite: 'light' 
    },
    light: { 
        basic: '白化', 
        elite: '圣辉', 
        legendary: '永耀', 
        opposite: 'dark' 
    },
    crystal: { 
        basic: '晶化', 
        elite: '异能', 
        legendary: '源晶', 
        opposite: 'thunder' 
    },
    thunder: { 
        basic: '影化', 
        elite: '极电', 
        legendary: '雷煌', 
        opposite: 'crystal' 
    }
};

// 变异技能配置（已移除 - 完全由技能设计器管理）
// 所有变异技能通过技能设计器的 SKILL_POOL 来管理
// 该对象仅作为运行时容器，在游戏中动态填充
const MUTATION_SKILLS = {};

// 稀有度配置
const RARITY_CONFIG = {
    multipliers: {
        '普通': 1.0,
        '闪光': 1.25,
        '幻彩': 1.5,
        '星芒': 2.0
    },
    colors: {
        '普通': 'text-gray-400',
        '闪光': 'text-yellow-400',
        '幻彩': 'text-pink-400',
        '星芒': 'text-purple-500'
    },
    icons: {
        '普通': '',
        '闪光': '✨',
        '幻彩': '🌈',
        '星芒': '⭐'
    },
    levels: {
        '普通': 0, 
        '闪光': 1, 
        '幻彩': 2, 
        '星芒': 3
    },
    // 动物稀有度与变异稀有度的映射
    animalToMutation: {
        '闪光': 'basic', 
        '幻彩': 'elite', 
        '星芒': 'legendary'
    },
    mutationToAnimal: {
        'basic': '闪光', 
        'elite': '幻彩', 
        'legendary': '星芒'
    }
};

// 繁育稀有度概率表
const BREEDING_RARITY_PROBABILITY = {
    '普通 × 普通': { '普通': 95.0, '闪光': 4.5, '幻彩': 0.5, '星芒': 0 },
    '普通 × 闪光': { '普通': 70.0, '闪光': 25.0, '幻彩': 4.5, '星芒': 0.5 },
    '普通 × 幻彩': { '普通': 60.0, '闪光': 25.0, '幻彩': 13.0, '星芒': 2.0 },
    '普通 × 星芒': { '普通': 40.0, '闪光': 30.0, '幻彩': 20.0, '星芒': 10.0 },
    '闪光 × 闪光': { '普通': 50.0, '闪光': 40.0, '幻彩': 9.0, '星芒': 1.0 },
    '闪光 × 幻彩': { '普通': 35.0, '闪光': 40.0, '幻彩': 20.0, '星芒': 5.0 },
    '闪光 × 星芒': { '普通': 25.0, '闪光': 35.0, '幻彩': 25.0, '星芒': 15.0 },
    '幻彩 × 幻彩': { '普通': 20.0, '闪光': 30.0, '幻彩': 40.0, '星芒': 10.0 },
    '幻彩 × 星芒': { '普通': 10.0, '闪光': 25.0, '幻彩': 35.0, '星芒': 30.0 },
    '星芒 × 星芒': { '普通': 5.0, '闪光': 15.0, '幻彩': 30.0, '星芒': 50.0 }
};

// 变异等级配置
const MUTATION_RARITY_LEVELS = {
    'basic': 1, 
    'elite': 2, 
    'legendary': 3
};

// 技能继承解锁等级配置
const SKILL_UNLOCK_LEVELS = {
    'basic': 5, 
    'elite': 10, 
    'legendary': 15
};

// 变异概率配置
const MUTATION_PROBABILITY = {
    first_mutation: {
        basic: 80,      // 80% 基础级
        elite: 18,      // 18% 精英级
        legendary: 2    // 2% 传说级
    },
    // 已有基础级变异时的概率
    from_basic: {
        same_tier: 70,     // 70% 同级转换
        upgrade_elite: 28, // 28% 升级到精英
        upgrade_legendary: 2 // 2% 跨级到传说
    },
    // 已有精英级变异时的概率
    from_elite: {
        same_tier: 75,        // 75% 同级转换
        upgrade_legendary: 25 // 25% 升级到传说
    },
    // 亲和度概率（升级时）
    affinity: {
        to_elite: {
            affinity_chain: 71.4,  // 20/28 * 100
            opposite_chain: 3.6,   // 1/28 * 100
            neutral: 25.0          // 其余均分
        },
        to_legendary: {
            affinity_chain: 80,
            opposite_chain: 4,
            neutral: 16            // 其余均分
        }
    },
    // 同级转换时对立链概率
    same_tier_opposite: {
        basic: 15,
        elite: 10,
        legendary: 15
    },
    // 二级变异概率
    tier2: {
        success_rate: 60,  // 60% 成功率
        distribution: {
            '阴': 40,      // 40%
            '阳': 40,      // 40%
            '玄': 20       // 20%
        }
    }
};

// 繁育系统配置
const BREEDING_CONFIG = {
    cost: 100,  // 繁殖消耗食物
    // 技能继承规则的最大继承数量
    max_inherit: {
        basic: 1,
        elite: 2,
        legendary: 2
    }
};

// 融合系统配置
const FUSION_CONFIG = {
    cost: 50  // 融合消耗食物
};

// 变异系统成本配置
const MUTATION_COST = {
    tier1: {
        serum: 1  // 一级变异消耗1个血清
    },
    tier2: {
        serum: 1  // 二级变异消耗1个血清
    }
};

// 传说级机制描述
const LEGENDARY_MECHANISMS = {
    'production': '📦 生产加速：基建生产速度+50%',
    'team_buff': '💫 团队增益：出战背包全体生命+15%',
    'enemy_debuff': '🌑 敌方削弱：降低敌方全体10%攻击/命中',
    'speed_buff': '⚡ 疾速增益：队伍全体攻击速度/移动速度+25%'
};

// 技能类型图标映射
const SKILL_TYPE_ICONS = {
    'attack': '⚔️',
    'defense': '🛡️',
    'agility': '⚡',
    'buff': '💪',
    'debuff': '🔻',
    'heal': '💚'
};

// 技能类型显示名称
const SKILL_TYPE_NAMES = {
    'attack': '⚔️ 攻击型',
    'defense': '🛡️ 防御型',
    'agility': '⚡ 敏捷型',
    'buff': '💪 增益型',
    'debuff': '🔻 减益型',
    'heal': '💚 治疗型'
};

// 异常状态名称映射
const STATUS_NAMES = {
    'stun': '眩晕',
    'poison': '中毒',
    'bleed': '流血',
    'frostbite': '冻伤',
    'burn': '烧伤',
    'paralyze': '麻痹'
};

// 技能目标显示名称
const SKILL_TARGET_NAMES = {
    'self': '自身',
    'ally-single': '我方单体',
    'ally-all': '我方全体',
    'enemy-single': '敌方单体',
    'enemy-all': '敌方全体'
};

// 基础动物属性配置
const BASE_ANIMAL_STATS = {
    stamina: 70,
    maxStamina: 70,
    combat: {
        attack: 10,
        defense: 5,
        agility: 8
    }
};

// 技能数量限制配置
const SKILL_LIMITS = {
    mutation: {
        basic: 2,
        elite: 2,
        legendary: 2
    },
    equipped_slots: 4  // 装备槽数量
};

// 变异类型到技能池类别的映射
const MUTATION_TO_CATEGORY_MAP = {
    '黑化': 'mutation-dark',
    '白化': 'mutation-light',
    '晶化': 'mutation-crystal',
    '影化': 'mutation-shadow',
    '极电': 'mutation-thunder',
    '圣辉': 'mutation-holy',
    '异能': 'mutation-psychic',
    '暗蚀': 'mutation-chaos',
    '永夜': 'mutation-eternal-dark',
    '永耀': 'mutation-eternal-light',
    '源晶': 'mutation-source-crystal',
    '雷煌': 'mutation-thunder-lord'
};

// 导出所有配置（用于其他脚本引用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LEVEL_CONFIG,
        ACTION_DURATION,
        ELEMENT_ICONS,
        ELEMENT_COLORS,
        ANIMAL_NAMES,
        ITEMS,
        COMBAT_SKILLS,
        MUTATION_CONFIG,
        AFFINITY_CHAINS,
        MUTATION_SKILLS,
        RARITY_CONFIG,
        BREEDING_RARITY_PROBABILITY,
        MUTATION_RARITY_LEVELS,
        SKILL_UNLOCK_LEVELS,
        MUTATION_PROBABILITY,
        BREEDING_CONFIG,
        FUSION_CONFIG,
        MUTATION_COST,
        LEGENDARY_MECHANISMS,
        SKILL_TYPE_ICONS,
        SKILL_TYPE_NAMES,
        STATUS_NAMES,
        SKILL_TARGET_NAMES,
        BASE_ANIMAL_STATS,
        SKILL_LIMITS,
        MUTATION_TO_CATEGORY_MAP
    };
}