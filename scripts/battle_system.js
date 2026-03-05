// ========== 全局战斗逻辑函数（供skill_designer和battle_system共用） ==========

// 计算属性克制倍率
function getElementAdvantageMultiplier(attackerElement, defenderElement) {
    // 普通系不参与克制关系
    if (attackerElement === 'normal' || defenderElement === 'normal') {
        return 1.0; // 普通系：始终1倍伤害，无克制关系
    }
    
    // 克制关系：水→火→金→草→土→风→水
    const advantages = {
        'water': 'fire',    // 水克火
        'fire': 'metal',    // 火克金
        'metal': 'grass',   // 金克草
        'grass': 'earth',   // 草克土
        'earth': 'wind',    // 土克风
        'wind': 'water'     // 风克水
    };
    
    // 检查是否克制
    if (advantages[attackerElement] === defenderElement) {
        return 1.5; // 克制：1.5倍伤害
    }
    
    // 检查是否被克制
    if (advantages[defenderElement] === attackerElement) {
        return 0.5; // 被克制：0.5倍伤害
    }
    
    return 1.0; // 无克制关系：1倍伤害
}

// 重置属性到基础值
function resetAttributesToBase(battleState) {
    // 我方
    battleState.self.attack = battleState.self.baseAttack;
    battleState.self.defense = battleState.self.baseDefense;
    battleState.self.agility = battleState.self.baseAgility;
    
    // 保存基础系别（如果还没有保存）
    if (!battleState.self.baseElement) {
        battleState.self.baseElement = battleState.self.element;
    }
    // 恢复系别到基础系别
    battleState.self.element = battleState.self.baseElement;
    
    // 清除临时标记
    battleState.self.damageBonus = 0;
    battleState.self.damageReduce = 0;
    battleState.self.ignoreDefense = 0;
    battleState.self.elementBonus = 0;
    battleState.self.elementAdvantage = 1;
    battleState.self.cannotAct = false;
    battleState.self.cannotAttack = false;
    battleState.self.cannotDefend = false;
    battleState.self.firstStrike = false;
    battleState.self.doubleAction = false;
    battleState.self.cooldownReset = false;
    
    // 敌方
    battleState.enemy.attack = battleState.enemy.baseAttack;
    battleState.enemy.defense = battleState.enemy.baseDefense;
    battleState.enemy.agility = battleState.enemy.baseAgility;
    
    // 保存基础系别（如果还没有保存）
    if (!battleState.enemy.baseElement) {
        battleState.enemy.baseElement = battleState.enemy.element;
    }
    // 恢复系别到基础系别
    battleState.enemy.element = battleState.enemy.baseElement;
    
    // 清除临时标记
    battleState.enemy.damageBonus = 0;
    battleState.enemy.damageReduce = 0;
    battleState.enemy.ignoreDefense = 0;
    battleState.enemy.elementBonus = 0;
    battleState.enemy.elementAdvantage = 1;
    battleState.enemy.cannotAct = false;
    battleState.enemy.cannotAttack = false;
    battleState.enemy.cannotDefend = false;
    battleState.enemy.firstStrike = false;
    battleState.enemy.doubleAction = false;
    battleState.enemy.cooldownReset = false;
}

// 递减状态持续时间
function decreaseStatusDurations(target, battleState, addLog) {
    const unit = battleState[target];
    if (unit.statuses.length === 0) return;
    
    addLog(`━ ${target === 'self' ? '我方' : '敌方'}状态时间递减`, 'gray');
    
    unit.statuses.forEach(status => {
        const statusName = status.data ? status.data.name : status.key;
        const isPermanent = status.data?.isPermanent;
        const isStackPermanent = status.data?.isStackPermanent;
        const hasStacks = status.data?.hasStacks !== false;
        
        // 判断持续时间模式
        if (isPermanent && !isStackPermanent) {
            // 每层独立计时模式：状态永久，只递减层数时间
            if (hasStacks && status.stackDurations) {
                const before = status.stackDurations.join(',');
                status.stackDurations = status.stackDurations.map(d => d - 1);
                const after = status.stackDurations.join(',');
                addLog(`→ ${statusName} 各层: [${before}] → [${after}]`, 'gray');
            }
        } else if (!isPermanent && isStackPermanent) {
            // 状态整体持续模式：层数永久，只递减状态时间
            if (status.statusDuration !== undefined && status.statusDuration > 0) {
                const before = status.statusDuration;
                status.statusDuration = status.statusDuration - 1;
                addLog(`→ ${statusName} 状态: ${before} → ${status.statusDuration}回合`, 'gray');
            }
        } else if (!isPermanent && !isStackPermanent) {
            // 双重计时模式（兼容旧数据）：同时递减
            if (status.statusDuration !== undefined && status.statusDuration > 0) {
                const before = status.statusDuration;
                status.statusDuration = status.statusDuration - 1;
                addLog(`→ ${statusName} 状态: ${before} → ${status.statusDuration}回合`, 'gray');
            }
            if (hasStacks && status.stackDurations) {
                const before = status.stackDurations.join(',');
                status.stackDurations = status.stackDurations.map(d => d - 1);
                const after = status.stackDurations.join(',');
                addLog(`→ ${statusName} 各层: [${before}] → [${after}]`, 'gray');
            }
        }
        // 双永久模式（isPermanent && isStackPermanent）：什么都不递减
    });
}

// 处理状态效果
function processStatuses(target, battleState, addLog, applyStatusEffectFn) {
    const unit = battleState[target];
    if (unit.statuses.length === 0) return;
    
    addLog(`━ 处理${target === 'self' ? '我方' : '敌方'}状态`, 'cyan');
    
    // 处理每个状态：先自增长，再移除过期层
    unit.statuses.forEach(status => {
        // 兼容性处理
        if (!status.stackDurations && status.duration !== undefined) {
            const duration = status.duration === -1 ? 999 : status.duration;
            const stacks = status.stacks || 1;
            status.stackDurations = Array(stacks).fill(duration);
        }
        if (status.statusDuration === undefined) {
            status.statusDuration = status.data?.isPermanent ? 999 : (status.data?.statusDuration || 999);
        }
        
        const statusData = status.data;
        const statusName = statusData ? statusData.name : status.key;
        const hasStacks = statusData?.hasStacks !== false;
        
        if (hasStacks) {
            // 自增长判断：只要层数不是永久的，且状态还在生效，就可以自增长
            if (statusData?.autoGrow && !statusData?.isStackPermanent && status.statusDuration > 0) {
                const growRate = statusData.growRate || 1;
                const maxStacks = statusData.maxStacks || 99;
                const currentStacks = status.stackDurations ? status.stackDurations.length : 0;
                const canAdd = Math.min(maxStacks - currentStacks, growRate);
                
                if (canAdd > 0) {
                    const durationPerStack = statusData.durationPerStack || 3;
                    if (!status.stackDurations) status.stackDurations = [];
                    
                    for (let i = 0; i < canAdd; i++) {
                        status.stackDurations.push(durationPerStack);
                    }
                    addLog(`[${statusName}] 层数自增长: ${currentStacks}→${status.stackDurations.length}层 (新层各${durationPerStack}回合)`, 'cyan');
                }
            }
            
            // 移除过期层
            if (status.stackDurations) {
                const beforeStacks = status.stackDurations.length;
                status.stackDurations = status.stackDurations.filter(d => d > 0);
                const afterStacks = status.stackDurations.length;
                
                if (beforeStacks > afterStacks) {
                    addLog(`[${statusName}] 移除${beforeStacks - afterStacks}个过期层`, 'gray');
                }
            }
        }
    });
    
    // 移除过期状态
    const beforeCount = unit.statuses.length;
    unit.statuses = unit.statuses.filter(status => {
        if (status.data?.isPermanent) return true;
        
        const statusDuration = status.statusDuration !== undefined ? status.statusDuration : 999;
        if (statusDuration <= 0) {
            const statusName = status.data ? status.data.name : status.key;
            addLog(`× ${statusName} 状态持续时间结束`, 'gray');
            return false;
        }
        return true;
    });
    
    if (beforeCount !== unit.statuses.length) {
        addLog(`移除${beforeCount - unit.statuses.length}个过期状态`, 'gray');
    }
    
    // 触发状态效果
    unit.statuses.forEach(status => {
        const statusData = status.data;
        const statusName = statusData ? statusData.name : status.key;
        const hasStacks = statusData?.hasStacks !== false;
        const isPermanent = statusData?.isPermanent;
        const isStackPermanent = statusData?.isStackPermanent;
        
        if (hasStacks) {
            const stacks = status.stackDurations?.length || 0;
            if (stacks === 0) return;
            
            // 根据模式只显示对应的持续时间
            let durationInfo = '';
            if (isPermanent && !isStackPermanent) {
                // 每层独立计时模式
                durationInfo = `×${stacks}层 回合:[${status.stackDurations.join(',')}]`;
            } else if (!isPermanent && isStackPermanent) {
                // 状态整体持续模式
                durationInfo = `状态${status.statusDuration}回合 ×${stacks}层`;
            } else if (isPermanent && isStackPermanent) {
                // 双永久
                durationInfo = `永久 ×${stacks}层`;
            } else {
                // 双重计时（兼容旧数据）
                durationInfo = `状态${status.statusDuration}回合 ×${stacks}层 回合:[${status.stackDurations.join(',')}]`;
            }
            
            addLog(`[${statusName}] ${durationInfo}`, 'yellow');
        } else {
            const statusDurationText = isPermanent ? '永久' : `状态${status.statusDuration}回合`;
            addLog(`[${statusName}] ${statusDurationText}`, 'yellow');
        }
        
        // 触发状态效果
        if (statusData && statusData.effects) {
            statusData.effects.forEach(effectKey => {
                applyStatusEffectFn(target, status, effectKey, battleState, addLog);
            });
        }
    });
}

// 应用状态效果
function applyStatusEffect(target, status, effectKey, battleState, addLog) {
    const unit = battleState[target];
    const otherUnit = battleState[target === 'self' ? 'enemy' : 'self'];
    const statusData = status.data;
    const effectConfig = statusData?.effectConfigs?.[effectKey];
    if (!effectConfig) return;
    
    const hasStacks = statusData?.hasStacks !== false;
    const stacks = hasStacks ? (statusData?.uniqueEffect ? 1 : (status.stackDurations?.length || 0)) : 1;
    
    if (stacks === 0) return;
    
    const getSourceValue = (source) => {
        const mapping = {
            'caster-current-attack': otherUnit.attack,
            'caster-base-attack': otherUnit.baseAttack,
            'caster-current-defense': otherUnit.defense,
            'caster-base-defense': otherUnit.baseDefense,
            'caster-current-agility': otherUnit.agility,
            'caster-base-agility': otherUnit.baseAgility,
            'caster-max-hp': otherUnit.maxHp,
            'target-current-attack': unit.attack,
            'target-base-attack': unit.baseAttack,
            'target-current-defense': unit.defense,
            'target-base-defense': unit.baseDefense,
            'target-current-agility': unit.agility,
            'target-base-agility': unit.baseAgility,
            'target-max-hp': unit.maxHp,
            'target-current-hp': unit.hp,
            'target-lost-hp': unit.maxHp - unit.hp
        };
        return mapping[source] || 0;
    };
    
    const statusName = statusData.name;
    
    switch(effectKey) {
        case 'dot-damage': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.05;
            const damage = Math.round(sourceValue * value * stacks);
            unit.hp = Math.max(0, unit.hp - damage);
            addLog(`→ ${statusName}: 造成 ${damage} 点伤害 (${stacks}层)`, 'red');
            break;
        }
        case 'hot-heal': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.03;
            const heal = Math.round(sourceValue * value * stacks);
            unit.hp = Math.min(unit.maxHp, unit.hp + heal);
            addLog(`→ ${statusName}: 恢复 ${heal} 生命 (${stacks}层)`, 'green');
            break;
        }
        case 'boost-attack': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const increase = Math.round(sourceValue * value * stacks);
            unit.attack += increase;
            addLog(`→ ${statusName}: 攻击力 +${increase} (${stacks}层)`, 'green');
            break;
        }
        case 'boost-defense': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const increase = Math.round(sourceValue * value * stacks);
            unit.defense += increase;
            addLog(`→ ${statusName}: 防御力 +${increase} (${stacks}层)`, 'green');
            break;
        }
        case 'boost-speed': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const increase = Math.round(sourceValue * value * stacks);
            unit.agility += increase;
            addLog(`→ ${statusName}: 敏捷 +${increase} (${stacks}层)`, 'green');
            break;
        }
        case 'boost-damage': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const bonus = value * stacks;
            if (!unit.damageBonus) unit.damageBonus = 0;
            unit.damageBonus += bonus;
            addLog(`→ ${statusName}: 伤害提升 ${Math.round(bonus * 100)}% (${stacks}层)`, 'green');
            break;
        }
        case 'reduce-attack': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const decrease = Math.round(sourceValue * value * stacks);
            unit.attack = Math.max(0, unit.attack - decrease);
            addLog(`→ ${statusName}: 攻击力 -${decrease} (${stacks}层)`, 'purple');
            break;
        }
        case 'reduce-defense': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const decrease = Math.round(sourceValue * value * stacks);
            unit.defense = Math.max(0, unit.defense - decrease);
            addLog(`→ ${statusName}: 防御力 -${decrease} (${stacks}层)`, 'purple');
            break;
        }
        case 'reduce-agility': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const decrease = Math.round(sourceValue * value * stacks);
            unit.agility = Math.max(0, unit.agility - decrease);
            addLog(`→ ${statusName}: 敏捷 -${decrease} (${stacks}层)`, 'purple');
            break;
        }
        case 'reduce-damage': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.1;
            const reduce = value * stacks;
            if (!unit.damageReduce) unit.damageReduce = 0;
            unit.damageReduce += reduce;
            addLog(`→ ${statusName}: 伤害降低 ${Math.round(reduce * 100)}% (${stacks}层)`, 'purple');
            break;
        }
        case 'ignore-defense': {
            const value = effectConfig.value || 0.1;
            const percent = Math.min(1, value * stacks);
            if (!unit.ignoreDefense) unit.ignoreDefense = 0;
            unit.ignoreDefense += percent;
            addLog(`→ ${statusName}: 无视 ${Math.round(percent * 100)}% 防御 (${stacks}层)`, 'green');
            break;
        }
        case 'element-bonus': {
            const sourceValue = getSourceValue(effectConfig.source);
            const value = effectConfig.value || 0.2;
            const bonus = value * stacks;
            if (!unit.elementBonus) unit.elementBonus = 0;
            unit.elementBonus += bonus;
            addLog(`→ ${statusName}: 属性增伤 ${Math.round(bonus * 100)}% (${stacks}层)`, 'green');
            break;
        }
        case 'element-advantage': {
            const value = effectConfig.value || 1.5;
            const multiplier = Math.pow(value, stacks);
            if (!unit.elementAdvantage) unit.elementAdvantage = 1;
            unit.elementAdvantage *= multiplier;
            addLog(`→ ${statusName}: 克制倍率 ×${multiplier.toFixed(2)} (${stacks}层)`, 'green');
            break;
        }
        case 'cannot-act': {
            unit.cannotAct = true;
            addLog(`→ ${statusName}: 无法行动`, 'purple');
            break;
        }
        case 'cannot-attack': {
            unit.cannotAttack = true;
            addLog(`→ ${statusName}: 无法攻击`, 'purple');
            break;
        }
        case 'cannot-defend': {
            unit.cannotDefend = true;
            addLog(`→ ${statusName}: 无法防御`, 'purple');
            break;
        }
        case 'first-strike': {
            unit.firstStrike = true;
            addLog(`→ ${statusName}: 先手行动`, 'green');
            break;
        }
        case 'double-action': {
            unit.doubleAction = true;
            addLog(`→ ${statusName}: 可行动两次`, 'green');
            break;
        }
        case 'reverse-stats': {
            const tempAtk = unit.attack;
            unit.attack = unit.defense;
            unit.defense = tempAtk;
            addLog(`→ ${statusName}: 攻防反转 (攻:${unit.attack} 防:${unit.defense})`, 'purple');
            break;
        }
        case 'reverse-element': {
            // 保存基础系别（如果还没有保存）
            if (!unit.baseElement) {
                unit.baseElement = unit.element;
            }
            if (!otherUnit.baseElement) {
                otherUnit.baseElement = otherUnit.element;
            }
            
            // 交换双方的系别
            const tempElement = unit.element;
            unit.element = otherUnit.element;
            otherUnit.element = tempElement;
            
            // 获取系别名称
            const getElementName = (element) => {
                const names = {
                    'water': '水', 'fire': '火', 'grass': '草',
                    'wind': '风', 'electric': '电', 'earth': '土'
                };
                return names[element] || element;
            };
            
            addLog(`→ ${statusName}: 系别反转 (我方:${getElementName(unit.element)} 敌方:${getElementName(otherUnit.element)})`, 'purple');
            break;
        }
        case 'reset-cooldown': {
            unit.cooldownReset = true;
            addLog(`→ ${statusName}: 技能冷却已重置`, 'green');
            break;
        }
    }
}

// 获取状态显示信息
function getStatusDisplay(statusKey) {
    const statusPool = JSON.parse(localStorage.getItem('STATUS_POOL') || '[]');
    const status = statusPool.find(s => s.key === statusKey);
    
    if (status) {
        // 从状态key中提取ID（如 status_1 -> 1）
        const statusIdMatch = status.key.match(/status_(\d+)/);
        if (statusIdMatch) {
            const statusId = statusIdMatch[1];
            const paddedNum = String(statusId).padStart(4, '0');
            // 自动检测当前路径
            const currentPath = window.location.pathname;
            let imageFolder = '../images/Status/'; // 默认从子文件夹访问
            if (!currentPath.includes('/pages/') && !currentPath.includes('/designers/')) {
                imageFolder = 'images/Status/'; // 从根目录访问
            }
            const iconPath = `${imageFolder}${paddedNum}.png`;
            return `<img src="${iconPath}" class="w-5 h-5 inline-block object-contain" title="${status.name}" onerror="this.outerHTML='${status.name}'">`;
        }
        // 兼容旧数据（base64图片）
        if (status.iconImage) {
            return `<img src="${status.iconImage}" class="w-5 h-5 inline-block object-contain" title="${status.name}">`;
        }
        return status.name;
    }
    
    const builtInNames = {
        'stun': '😵 眩晕',
        'poison': '🤢 中毒',
        'bleed': '🩸 流血',
        'frostbite': '❄️ 冻伤',
        'burn': '🔥 灼烧',
        'paralyze': '⚡ 麻痹',
        'no-heal': '🚫 禁疗',
        'heal-reduce': '📉 减疗'
    };
    return builtInNames[statusKey] || statusKey;
}

// ========== 技能配置 ==========

// 效果参数配置（从skill_designer同步）
const EFFECT_PARAMS_CONFIG = {
    'direct_attack': { name: '直接攻击', params: ['effect-source', 'bonus'] },
    'multi_attack': { name: '多段攻击', params: ['effect-source', 'multi-bonus'] },
    'dot_damage': { name: '附加伤害', params: ['effect-source', 'bonus'] },
    'percent_damage': { name: '百分比伤害', params: ['effect-source', 'percent'] },
    'direct_defense': { name: '直接防御', params: ['effect-source', 'bonus'] },
    'continuous_defense': { name: '持续防御', params: ['effect-source', 'bonus'] },
    'defense_counter': { name: '防御反击', params: ['effect-source', 'defense-bonus', 'counter-effect-source', 'counter-bonus'] },
    'direct_speed': { name: '直接增速', params: ['effect-source', 'bonus'] },
    'continuous_speed': { name: '持续增速', params: ['effect-source', 'bonus'] },
    'buff_attack': { name: '增攻', params: ['effect-source', 'target', 'bonus'] },
    'buff_defense': { name: '增防', params: ['effect-source', 'target', 'bonus'] },
    'buff_speed': { name: '增速', params: ['effect-source', 'target', 'bonus'] },
    'buff_status_enemy': { name: '为敌方附加异常', params: ['status-type', 'status-chance', 'status-stacks'] },
    'buff_purify': { name: '净化', params: ['target', 'purify-type', 'purify-count'] },
    'buff_heal_amp': { name: '增加治疗量', params: ['effect-source', 'target', 'bonus'] },
    'buff_element_damage': { name: '属性增伤', params: ['target', 'element-type', 'damage-bonus'] },
    'debuff_attack': { name: '减攻', params: ['effect-source', 'target', 'bonus'] },
    'debuff_defense': { name: '减防', params: ['effect-source', 'target', 'bonus'] },
    'debuff_speed': { name: '减速', params: ['effect-source', 'target', 'bonus'] },
    'debuff_status_self': { name: '为自身附加异常', params: ['status-type', 'status-chance', 'status-stacks'] },
    'debuff_no_heal': { name: '禁疗', params: ['target'] },
    'debuff_heal_reduce': { name: '减疗', params: ['effect-source', 'target', 'bonus'] },
    'debuff_element_damage': { name: '属性减伤', params: ['target', 'element-type', 'damage-reduce'] },
    'debuff_hp_cost': { name: '扣血', params: ['effect-source', 'bonus', 'target'] },
    'heal_direct': { name: '直接恢复', params: ['effect-source', 'target', 'bonus'] },
    'heal_continuous': { name: '持续恢复', params: ['effect-source', 'target', 'bonus'] },
    'heal_percent': { name: '百分比恢复', params: ['effect-source', 'target', 'percent'] },
    'heal_rebirth': { name: '重生', params: ['effect-source', 'target', 'percent', 'rebirth-condition'] },
    'heal_lifesteal': { name: '生命汲取', params: ['effect-source', 'bonus'] }
};



// 战斗技能配置（空对象，所有技能从 SKILL_POOL 获取）
const COMBAT_SKILLS = {};

// 变异技能配置（空对象，所有技能从 SKILL_POOL 获取）
const MUTATION_SKILLS = {};

// 战斗系统类
class BattleSystem {
    constructor(playerData, opponentData) {
        this.playerData = playerData;
        this.opponentData = opponentData;
        
        // 初始化战斗状态
        this.playerCurrentHealth = playerData.stamina;
        this.opponentCurrentHealth = opponentData.stamina;
        
        // 战斗属性 (包含buff加成)
        this.playerStats = {
            hp: playerData.stamina,
            maxHp: playerData.stamina,
            attack: playerData.abilities.combat.attack,
            defense: playerData.abilities.combat.defense,
            agility: playerData.abilities.combat.agility,
            baseAttack: playerData.abilities.combat.attack,
            baseDefense: playerData.abilities.combat.defense,
            baseAgility: playerData.abilities.combat.agility,
            turnDamage: 0,
            statuses: [], // 新格式：[{key, statusDuration, stackDurations, data}]
            element: playerData.element || 'water',
            elementDamageBonus: {},
            elementDamageReduce: {},
            // 临时状态标记
            damageBonus: 0,
            damageReduce: 0,
            ignoreDefense: 0,
            elementBonus: 0,
            elementAdvantage: 1,
            cannotAct: false,
            cannotAttack: false,
            cannotDefend: false,
            firstStrike: false,
            doubleAction: false,
            cooldownReset: false,
            // 旧格式兼容
            buffs: {},
            activeSkills: [],
            skillCooldowns: {}
        };
        
        this.opponentStats = {
            hp: opponentData.stamina,
            maxHp: opponentData.stamina,
            attack: opponentData.abilities.combat.attack || 10,
            defense: opponentData.abilities.combat.defense || 5,
            agility: opponentData.abilities.combat.agility || 8,
            baseAttack: opponentData.abilities.combat.attack || 10,
            baseDefense: opponentData.abilities.combat.defense || 5,
            baseAgility: opponentData.abilities.combat.agility || 8,
            turnDamage: 0,
            statuses: [], // 新格式：[{key, statusDuration, stackDurations, data}]
            element: opponentData.element || 'fire',
            elementDamageBonus: {},
            elementDamageReduce: {},
            // 临时状态标记
            damageBonus: 0,
            damageReduce: 0,
            ignoreDefense: 0,
            elementBonus: 0,
            elementAdvantage: 1,
            cannotAct: false,
            cannotAttack: false,
            cannotDefend: false,
            firstStrike: false,
            doubleAction: false,
            cooldownReset: false,
            // 旧格式兼容
            buffs: {},
            activeSkills: [],
            skillCooldowns: {}
        };
        
        // 持续效果列表
        this.activeEffects = [];
        
        // 被动技能
        this.playerPassiveSkills = this.getPassiveSkills(playerData);
        this.opponentPassiveSkills = this.getPassiveSkills(opponentData);
        
        // 战斗状态
        this.battleInProgress = false;
        this.battlePaused = false;
        this.turnCount = 0;
        this.isManualMode = true; // 默认手动战斗
        this.selectedSkill = null; // 玩家选择的技能
        this.turnTimeout = null; // 回合计时器
        
        // UI元素
        this.ui = {
            battleLog: document.getElementById('battle-log-content'),
            playerModel: document.getElementById('player-model'),
            opponentModel: document.getElementById('opponent-model'),
            btnStartBattle: document.getElementById('btn-start-battle'),
            btnPause: document.getElementById('btn-pause'),
            btnItems: document.getElementById('btn-items'),
            btnAnimals: document.getElementById('btn-animals'),
            btnFlee: document.getElementById('btn-flee'),
            playerTurnBadge: document.getElementById('player-turn-badge'),
            opponentTurnBadge: document.getElementById('opponent-turn-badge'),
            playerCountdown: document.getElementById('player-countdown'),
            opponentCountdown: document.getElementById('opponent-countdown'),
            centerCountdown: document.getElementById('center-countdown')
        };
    }

    init() {
        this.renderPlayerInfo();
        this.renderOpponentInfo();
        this.renderSkillsContainer();
        this.setupEventListeners();
        
        // 检查是否是联赛战斗，初始化比分显示
        const queueData = JSON.parse(localStorage.getItem('leagueBattleQueue') || 'null');
        if (queueData) {
            this.initLeagueScoreDisplay(queueData);
        }
    }

    renderPlayerInfo() {
        document.getElementById('player-name').textContent = this.playerData.name;
        document.getElementById('player-level').textContent = `Lv. ${this.playerData.level}`;
        const playerPortrait = document.getElementById('player-portrait');
        const playerModel = document.getElementById('player-model');
        
        // 使用图像库获取头像（优先本地文件）
        let avatarData = this.playerData.avatarData;
        if (!avatarData && window.imageLibrary) {
            // 尝试获取本地图片或localStorage中的图片
            // 优先使用animalId，然后key，最后templateKey
            avatarData = window.imageLibrary.getImageUrl(this.playerData.animalId || this.playerData.key || this.playerData.templateKey);
            if (!avatarData) {
                avatarData = window.imageLibrary.getImageByAnimal(this.playerData);
            }
        }
        
        // 设置头像和角色模型
        if (avatarData) {
            playerPortrait.style.backgroundImage = `url(${avatarData})`;
            playerPortrait.style.backgroundSize = 'cover';
            playerPortrait.style.backgroundPosition = 'center';
            playerPortrait.textContent = '';
            
            playerModel.style.backgroundImage = `url(${avatarData})`;
            playerModel.style.backgroundSize = 'contain';
            playerModel.style.backgroundPosition = 'center';
            playerModel.style.backgroundRepeat = 'no-repeat';
            playerModel.textContent = '';
        } else {
            playerPortrait.style.backgroundImage = '';
            playerPortrait.style.backgroundColor = '#' + this.playerData.color.toString(16).padStart(6, '0');
            playerPortrait.textContent = this.playerData.name.charAt(0).toUpperCase();
            
            playerModel.textContent = this.playerData.name.charAt(0).toUpperCase();
            playerModel.style.fontSize = '8rem';
            playerModel.style.color = '#' + this.playerData.color.toString(16).padStart(6, '0');
        }
        
        document.getElementById('player-hp-bar').style.width = '100%';
        document.getElementById('player-hp-text').textContent = `${this.playerCurrentHealth} / ${this.playerData.stamina}`;
        
        // 初始化系别显示
        this.updateElementDisplay();
        
        // 初始化buff图标
        this.updateBuffIcons();
    }

    renderOpponentInfo() {
        document.getElementById('opponent-name').textContent = this.opponentData.name;
        document.getElementById('opponent-level').textContent = `Lv. ${this.opponentData.level}`;
        const opponentPortrait = document.getElementById('opponent-portrait');
        const opponentModel = document.getElementById('opponent-model');
        
        // 使用图像库获取头像（优先本地文件）
        let avatarData = this.opponentData.avatarData;
        if (!avatarData && window.imageLibrary) {
            // 尝试获取本地图片或localStorage中的图片
            // 优先使用animalId，然后key，最后templateKey
            avatarData = window.imageLibrary.getImageUrl(this.opponentData.animalId || this.opponentData.key || this.opponentData.templateKey);
            if (!avatarData) {
                avatarData = window.imageLibrary.getImageByAnimal(this.opponentData);
            }
        }
        
        // 设置头像和角色模型
        if (avatarData) {
            opponentPortrait.style.backgroundImage = `url(${avatarData})`;
            opponentPortrait.style.backgroundSize = 'cover';
            opponentPortrait.style.backgroundPosition = 'center';
            opponentPortrait.textContent = '';
            
            opponentModel.style.backgroundImage = `url(${avatarData})`;
            opponentModel.style.backgroundSize = 'contain';
            opponentModel.style.backgroundPosition = 'center';
            opponentModel.style.backgroundRepeat = 'no-repeat';
            opponentModel.textContent = '';
        } else {
            opponentPortrait.style.backgroundImage = '';
            opponentPortrait.style.backgroundColor = '#' + this.opponentData.color.toString(16).padStart(6, '0');
            opponentPortrait.textContent = this.opponentData.name.charAt(0).toUpperCase();
            
            opponentModel.textContent = this.opponentData.name.charAt(0).toUpperCase();
            opponentModel.style.fontSize = '8rem';
            opponentModel.style.color = '#' + this.opponentData.color.toString(16).padStart(6, '0');
        }
        
        document.getElementById('opponent-hp-bar').style.width = '100%';
        document.getElementById('opponent-hp-text').textContent = `${this.opponentCurrentHealth} / ${this.opponentData.stamina}`;
        
        // 初始化系别显示
        this.updateElementDisplay();
        
        // 初始化buff图标
        this.updateBuffIcons();
    }
    
    // 渲染底部技能容器
    renderSkillsContainer() {
        const container = document.getElementById('skills-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 读取技能池
        const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
        
        // 获取装备的技能
        let equippedSkills = [];
        if (this.playerData.combatSkills) {
            if (Array.isArray(this.playerData.combatSkills)) {
                equippedSkills = this.playerData.combatSkills;
            } else if (this.playerData.combatSkills.equipped) {
                equippedSkills = this.playerData.combatSkills.equipped;
            }
        }
        
        // 固定渲染4个技能槽
        for (let index = 0; index < 4; index++) {
            const skillKey = equippedSkills[index];
            let skill = COMBAT_SKILLS[skillKey] || MUTATION_SKILLS[skillKey];
            
            if (!skill && skillKey) {
                const customSkill = skillPool.find(s => s.key === skillKey);
                if (customSkill) {
                    const types = customSkill.types || (customSkill.type ? [customSkill.type] : []);
                    const effects = customSkill.effects || (customSkill.effect ? [customSkill.effect] : []);
                    
                    skill = {
                        name: customSkill.name,
                        icon: customSkill.icon,
                        desc: customSkill.description || customSkill.desc,
                        types: types,
                        effects: effects,
                        value: customSkill.value,
                        cooldown: customSkill.params?.cooldown || customSkill.cooldown || 0,
                        duration: customSkill.params?.duration || customSkill.duration || 0,
                        params: customSkill.params || {}
                    };
                }
            }
            
            const card = document.createElement('div');
            card.className = 'skill-card';
            card.id = `skill-card-${index}`;
            
            if (skill) {
                const cooldownRemaining = this.playerStats.skillCooldowns[skillKey] || 0;
                const isOnCooldown = cooldownRemaining > 0;
                
                if (isOnCooldown) {
                    card.style.opacity = '0.5';
                    card.style.cursor = 'not-allowed';
                }
                
                card.innerHTML = `
                    <div class="skill-icon">${skill.icon}</div>
                    <div class="skill-name">${skill.name}</div>
                    <div class="skill-stats">
                        ${skill.cooldown ? `<span>CD:${skill.cooldown}</span>` : ''}
                        ${isOnCooldown ? `<span class="text-red-400">⏳${cooldownRemaining}</span>` : ''}
                    </div>
                    <div class="skill-type" style="background: ${this.getSkillTypeColor(skill.types ? skill.types[0] : 'attack')}">${this.getSkillTypeName(skill.types ? skill.types[0] : 'attack')}</div>
                `;
                
                // 添加点击事件(只在手动模式和非冷却时有效)
                if (!isOnCooldown) {
                    card.addEventListener('click', () => {
                        if (this.isManualMode && this.battleInProgress && !this.selectedSkill) {
                            this.selectSkill(skillKey, index);
                        }
                    });
                }
            } else {
                // 空技能槽
                card.innerHTML = `
                    <div class="skill-icon" style="opacity: 0.3;">🔒</div>
                    <div class="skill-name" style="color: #6b7280;">空槽</div>
                `;
                card.style.cursor = 'not-allowed';
            }
            
            container.appendChild(card);
        }
    }
    
    getSkillTypeColor(type) {
        const colors = {
            'attack': '#ef4444',
            'defense': '#3b82f6',
            'support': '#22c55e',
            'heal': '#10b981',
            'debuff': '#a855f7',
            'buff': '#f59e0b'
        };
        return colors[type] || '#6b7280';
    }
    
    getSkillTypeName(type) {
        const names = {
            'attack': '攻击',
            'defense': '防御',
            'support': '辅助',
            'heal': '治疗',
            'debuff': '减益',
            'buff': '增益'
        };
        return names[type] || type;
    }
    
    // 新增：更新buff图标显示
    updateBuffIcons() {
        // 更新玩家buff
        const playerBuffs = document.getElementById('player-buffs');
        if (playerBuffs && this.playerStats.statuses) {
            playerBuffs.innerHTML = '';
            this.playerStats.statuses.forEach(status => {
                const buffIcon = document.createElement('div');
                buffIcon.className = 'buff-icon';
                // 从状态key中提取ID并索引图片，或使用旧数据
                const statusIdMatch = status.key.match(/status_(\d+)/);
                if (statusIdMatch) {
                    const statusId = statusIdMatch[1];
                    const paddedNum = String(statusId).padStart(4, '0');
                    const currentPath = window.location.pathname;
                    let imageFolder = '../images/Status/';
                    if (!currentPath.includes('/pages/') && !currentPath.includes('/designers/')) {
                        imageFolder = 'images/Status/';
                    }
                    const iconPath = `${imageFolder}${paddedNum}.png`;
                    buffIcon.innerHTML = `<img src="${iconPath}" class="w-full h-full object-contain" onerror="this.outerHTML='<div class=\\'buff-icon\\'>🔮</div>'">`;
                } else if (status.data?.iconImage) {
                    // 兼容旧数据（base64图片）
                    buffIcon.innerHTML = `<img src="${status.data.iconImage}" class="w-full h-full object-contain">`;
                } else {
                    const iconText = status.data?.icon || status.data?.iconEmoji || '🔮';
                    buffIcon.textContent = iconText;
                }
                
                // 构建详细的悬停提示
                let tooltip = `【${status.data?.name || status.key}】\n`;
                
                // 添加状态描述
                if (status.data?.description) {
                    tooltip += `${status.data.description}\n\n`;
                }
                
                // 添加持续时间信息
                const isPermanent = status.data?.isPermanent;
                const isStackPermanent = status.data?.isStackPermanent;
                const hasStacks = status.data?.hasStacks !== false;
                
                if (isPermanent && isStackPermanent) {
                    tooltip += `持续时间: 永久\n`;
                } else if (isPermanent && !isStackPermanent) {
                    tooltip += `状态: 永久\n`;
                } else if (!isPermanent && isStackPermanent) {
                    tooltip += `状态持续: ${status.statusDuration || 0}回合\n`;
                } else {
                    tooltip += `状态持续: ${status.statusDuration || 0}回合\n`;
                }
                
                // 添加层数信息
                if (hasStacks && status.stackDurations) {
                    const stacks = status.stackDurations.length;
                    tooltip += `当前层数: ${stacks}层\n`;
                    if (!isStackPermanent) {
                        tooltip += `各层剩余: [${status.stackDurations.join(', ')}]回合\n`;
                    }
                    if (status.data?.maxStacks) {
                        tooltip += `最大层数: ${status.data.maxStacks}层\n`;
                    }
                }
                
                // 添加效果信息
                if (status.data?.effects && status.data.effects.length > 0) {
                    tooltip += `\n效果:\n`;
                    status.data.effects.forEach(effectKey => {
                        const effectConfig = status.data.effectConfigs?.[effectKey];
                        if (effectConfig) {
                            const effectNames = {
                                'dot-damage': '持续伤害',
                                'hot-heal': '持续恢复',
                                'boost-attack': '提升攻击',
                                'boost-defense': '提升防御',
                                'boost-speed': '提升敏捷',
                                'boost-damage': '提升伤害',
                                'reduce-attack': '降低攻击',
                                'reduce-defense': '降低防御',
                                'reduce-agility': '降低敏捷',
                                'reduce-damage': '降低伤害',
                                'ignore-defense': '无视防御',
                                'element-bonus': '属性增伤',
                                'element-advantage': '克制倍率',
                                'cannot-act': '无法行动',
                                'cannot-attack': '无法攻击',
                                'cannot-defend': '无法防御',
                                'first-strike': '先手行动',
                                'double-action': '行动两次',
                                'reverse-stats': '攻防反转',
                                'reverse-element': '系别反转',
                                'reset-cooldown': '冷却重置'
                            };
                            const effectName = effectNames[effectKey] || effectKey;
                            const value = effectConfig.value || 0;
                            const source = effectConfig.source || '';
                            
                            if (['dot-damage', 'hot-heal', 'boost-attack', 'boost-defense', 
                                 'boost-speed', 'reduce-attack', 'reduce-defense', 'reduce-agility'].includes(effectKey)) {
                                tooltip += `  • ${effectName}: ${(value * 100).toFixed(0)}%\n`;
                            } else if (['boost-damage', 'reduce-damage', 'ignore-defense', 'element-bonus'].includes(effectKey)) {
                                tooltip += `  • ${effectName}: +${(value * 100).toFixed(0)}%\n`;
                            } else if (effectKey === 'element-advantage') {
                                tooltip += `  • ${effectName}: ×${value.toFixed(2)}\n`;
                            } else {
                                tooltip += `  • ${effectName}\n`;
                            }
                        }
                    });
                }
                
                buffIcon.title = tooltip;
                
                if (status.stackDurations && status.stackDurations.length > 1) {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'buff-count';
                    countSpan.textContent = status.stackDurations.length;
                    buffIcon.appendChild(countSpan);
                }
                
                playerBuffs.appendChild(buffIcon);
            });
        }
        
        // 更新敌人buff
        const opponentBuffs = document.getElementById('opponent-buffs');
        if (opponentBuffs && this.opponentStats.statuses) {
            opponentBuffs.innerHTML = '';
            this.opponentStats.statuses.forEach(status => {
                const buffIcon = document.createElement('div');
                buffIcon.className = 'buff-icon';
                // 优先使用icon字段，其次iconEmoji，最后默认图标
                // 从状态key中提取ID并索引图片，或使用旧数据
                const statusIdMatch = status.key.match(/status_(\d+)/);
                if (statusIdMatch) {
                    const statusId = statusIdMatch[1];
                    const paddedNum = String(statusId).padStart(4, '0');
                    const currentPath = window.location.pathname;
                    let imageFolder = '../images/Status/';
                    if (!currentPath.includes('/pages/') && !currentPath.includes('/designers/')) {
                        imageFolder = 'images/Status/';
                    }
                    const iconPath = `${imageFolder}${paddedNum}.png`;
                    buffIcon.innerHTML = `<img src="${iconPath}" class="w-full h-full object-contain" onerror="this.outerHTML='<div class=\\'debuff-icon\\'>🔮</div>'">`;
                } else if (status.data?.iconImage) {
                    // 兼容旧数据（base64图片）
                    buffIcon.innerHTML = `<img src="${status.data.iconImage}" class="w-full h-full object-contain">`;
                } else {
                    const iconText = status.data?.icon || status.data?.iconEmoji || '🔮';
                    buffIcon.textContent = iconText;
                }
                
                // 构建详细的悬停提示
                let tooltip = `【${status.data?.name || status.key}】\n`;
                
                // 添加状态描述
                if (status.data?.description) {
                    tooltip += `${status.data.description}\n\n`;
                }
                
                // 添加持续时间信息
                const isPermanent = status.data?.isPermanent;
                const isStackPermanent = status.data?.isStackPermanent;
                const hasStacks = status.data?.hasStacks !== false;
                
                if (isPermanent && isStackPermanent) {
                    tooltip += `持续时间: 永久\n`;
                } else if (isPermanent && !isStackPermanent) {
                    tooltip += `状态: 永久\n`;
                } else if (!isPermanent && isStackPermanent) {
                    tooltip += `状态持续: ${status.statusDuration || 0}回合\n`;
                } else {
                    tooltip += `状态持续: ${status.statusDuration || 0}回合\n`;
                }
                
                // 添加层数信息
                if (hasStacks && status.stackDurations) {
                    const stacks = status.stackDurations.length;
                    tooltip += `当前层数: ${stacks}层\n`;
                    if (!isStackPermanent) {
                        tooltip += `各层剩余: [${status.stackDurations.join(', ')}]回合\n`;
                    }
                    if (status.data?.maxStacks) {
                        tooltip += `最大层数: ${status.data.maxStacks}层\n`;
                    }
                }
                
                // 添加效果信息
                if (status.data?.effects && status.data.effects.length > 0) {
                    tooltip += `\n效果:\n`;
                    status.data.effects.forEach(effectKey => {
                        const effectConfig = status.data.effectConfigs?.[effectKey];
                        if (effectConfig) {
                            const effectNames = {
                                'dot-damage': '持续伤害',
                                'hot-heal': '持续恢复',
                                'boost-attack': '提升攻击',
                                'boost-defense': '提升防御',
                                'boost-speed': '提升敏捷',
                                'boost-damage': '提升伤害',
                                'reduce-attack': '降低攻击',
                                'reduce-defense': '降低防御',
                                'reduce-agility': '降低敏捷',
                                'reduce-damage': '降低伤害',
                                'ignore-defense': '无视防御',
                                'element-bonus': '属性增伤',
                                'element-advantage': '克制倍率',
                                'cannot-act': '无法行动',
                                'cannot-attack': '无法攻击',
                                'cannot-defend': '无法防御',
                                'first-strike': '先手行动',
                                'double-action': '行动两次',
                                'reverse-stats': '攻防反转',
                                'reverse-element': '系别反转',
                                'reset-cooldown': '冷却重置'
                            };
                            const effectName = effectNames[effectKey] || effectKey;
                            const value = effectConfig.value || 0;
                            const source = effectConfig.source || '';
                            
                            if (['dot-damage', 'hot-heal', 'boost-attack', 'boost-defense', 
                                 'boost-speed', 'reduce-attack', 'reduce-defense', 'reduce-agility'].includes(effectKey)) {
                                tooltip += `  • ${effectName}: ${(value * 100).toFixed(0)}%\n`;
                            } else if (['boost-damage', 'reduce-damage', 'ignore-defense', 'element-bonus'].includes(effectKey)) {
                                tooltip += `  • ${effectName}: +${(value * 100).toFixed(0)}%\n`;
                            } else if (effectKey === 'element-advantage') {
                                tooltip += `  • ${effectName}: ×${value.toFixed(2)}\n`;
                            } else {
                                tooltip += `  • ${effectName}\n`;
                            }
                        }
                    });
                }
                
                buffIcon.title = tooltip;
                
                if (status.stackDurations && status.stackDurations.length > 1) {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'buff-count';
                    countSpan.textContent = status.stackDurations.length;
                    buffIcon.appendChild(countSpan);
                }
                
                opponentBuffs.appendChild(buffIcon);
            });
        }
    }
    
    renderPlayerSkillSlots() {
        this.renderSkillSlots('player-skill-slots', this.playerData);
    }
    
    renderOpponentSkillSlots() {
        this.renderSkillSlots('opponent-skill-slots', this.opponentData);
    }
    
    renderSkillSlots(containerId, animalData) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        // 获取对应的stats来检查冷却
        const isPlayer = containerId.includes('player');
        const stats = isPlayer ? this.playerStats : this.opponentStats;
        
        // 读取技能池以获取自定义技能信息
        const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
        
        // 获取装备的技能
        let equippedSkills = [];
        if (animalData.combatSkills) {
            if (Array.isArray(animalData.combatSkills)) {
                equippedSkills = animalData.combatSkills;
            } else if (animalData.combatSkills.equipped) {
                equippedSkills = animalData.combatSkills.equipped;
            }
        }
        
        // 渲染4个技能槽
        for (let i = 0; i < 4; i++) {
            const skillKey = equippedSkills[i];
            let skill = COMBAT_SKILLS[skillKey] || MUTATION_SKILLS[skillKey];
            
            // 如果不是预定义技能，从技能池中查找
            if (!skill && skillKey) {
                const customSkill = skillPool.find(s => s.key === skillKey);
                if (customSkill) {
                    // 兼容旧格式（单个type/effect）和新格式（types/effects数组）
                    const types = customSkill.types || (customSkill.type ? [customSkill.type] : []);
                    const effects = customSkill.effects || (customSkill.effect ? [customSkill.effect] : []);
                    
                    skill = {
                        name: customSkill.name,
                        icon: customSkill.icon,
                        desc: customSkill.description || customSkill.desc,
                        types: types,  // 多类型数组
                        effects: effects,  // 多效果数组
                        // 为了向后兼容，保留单个type和effect（取第一个）
                        type: types[0] || customSkill.type,
                        effect: effects[0] || customSkill.effect,
                        value: customSkill.value,
                        cooldown: customSkill.params?.cooldown || customSkill.cooldown || 0,
                        duration: customSkill.params?.duration || customSkill.duration || 0,
                        params: customSkill.params || {}
                    };
                }
            }
            
            const slotDiv = document.createElement('div');
            
            if (skill) {
                const isMutationSkill = skill.category && skill.category.startsWith('mutation-');
                const cooldownRemaining = stats.skillCooldowns[skillKey] || 0;
                const isOnCooldown = cooldownRemaining > 0;
                
                // 冷却中显示灰色，否则正常颜色
                const bgColor = isOnCooldown ? 'bg-gray-800/50' : (isMutationSkill ? 'bg-pink-900/60' : 'bg-purple-900/60');
                const borderColor = isOnCooldown ? 'border-gray-700' : (isMutationSkill ? 'border-pink-600' : 'border-purple-600');
                
                slotDiv.className = `${bgColor} border-2 ${borderColor} rounded p-2 text-center min-h-[70px] flex flex-col items-center justify-center transition-all duration-300`;
                slotDiv.id = `${containerId}-slot-${i}`; // 添加ID以便触发动画
                
                let cdDisplay = '';
                if (skill.cooldown) {
                    if (isOnCooldown) {
                        cdDisplay = `<div class="text-xs text-red-400 font-bold">冷却:${cooldownRemaining}</div>`;
                    } else {
                        cdDisplay = `<div class="text-xs text-gray-400">CD:${skill.cooldown}</div>`;
                    }
                }
                
                slotDiv.innerHTML = `
                    <div class="text-xl mb-1 ${isOnCooldown ? 'opacity-50' : ''}">${skill.icon}</div>
                    <div class="text-xs font-bold ${isOnCooldown ? 'text-gray-500' : (isMutationSkill ? 'text-pink-300' : 'text-purple-300')}">${skill.name}</div>
                    ${cdDisplay}
                `;
            } else {
                slotDiv.className = 'bg-gray-700/50 border-2 border-gray-600 rounded p-2 text-center min-h-[70px] flex items-center justify-center';
                slotDiv.innerHTML = '<span class="text-xs text-gray-500">空</span>';
            }
            
            container.appendChild(slotDiv);
        }
    }

    getPassiveSkills(animalData) {
        // 从装备的战斗技能中提取被动技能
        const skills = [];
        
        // 读取技能池以获取自定义技能信息
        const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
        
        // 兼容两种数据格式
        let equippedSkills = [];
        if (animalData.combatSkills) {
            if (Array.isArray(animalData.combatSkills)) {
                equippedSkills = animalData.combatSkills;
            } else if (animalData.combatSkills.equipped) {
                equippedSkills = animalData.combatSkills.equipped;
            }
        }
        
        equippedSkills.forEach(skillKey => {
            // 从技能池中查找技能
            let skill = null;
            if (skillKey) {
                const customSkill = skillPool.find(s => s.key === skillKey);
                if (customSkill) {
                    // 兼容旧格式（单个type/effect）和新格式（types/effects数组）
                    const types = customSkill.types || (customSkill.type ? [customSkill.type] : []);
                    const effects = customSkill.effects || (customSkill.effect ? [customSkill.effect] : []);
                    
                    // 提取关键战斗参数
                    const params = customSkill.params || {};
                    
                    // 根据效果类型提取对应的伤害参数
                    let attackBonus = 0;
                    let multiBonus = [];
                    let count = 1;
                    
                    effects.forEach(effect => {
                        // 直接攻击效果
                        if (effect === 'direct_attack') {
                            attackBonus = params[`${effect}_bonus`] || customSkill.value || 0;
                        }
                        // 多段攻击效果
                        else if (effect === 'multi_attack') {
                            multiBonus = params[`${effect}_multi-bonus`] || [];
                            count = params[`${effect}_count`] || params.count || 1;
                            if (multiBonus.length === 0 && customSkill.value) {
                                attackBonus = customSkill.value;
                            }
                        }
                        // DOT伤害效果
                        else if (effect === 'dot_damage') {
                            attackBonus = params[`${effect}_bonus`] || customSkill.value || 0;
                        }
                    });
                    
                    skill = {
                        name: customSkill.name,
                        icon: customSkill.icon,
                        desc: customSkill.description || customSkill.desc,
                        types: types,
                        effects: effects,
                        type: types[0] || customSkill.type,
                        effect: effects[0] || customSkill.effect,
                        value: customSkill.value || attackBonus,
                        cooldown: params.cooldown || customSkill.cooldown || 0,
                        duration: params.duration || customSkill.duration || 0,
                        params: {
                            ...params,
                            attackBonus: attackBonus || params.attackBonus,
                            multiBonus: multiBonus.length > 0 ? multiBonus : params.multiBonus,
                            count: count || params.count
                        }
                    };
                }
            } else if (skill) {
                // 为预定义技能添加types和effects数组（向后兼容）
                if (!skill.types && skill.type) {
                    skill.types = [skill.type];
                }
                if (!skill.effects && skill.effect) {
                    skill.effects = [skill.effect];
                }
            }
            
            if (skill) {
                skills.push({
                    key: skillKey,
                    ...skill
                });
            }
        });
        
        return skills;
    }

    setupEventListeners() {
        if (this.ui.btnStartBattle) {
            this.ui.btnStartBattle.addEventListener('click', () => this.startBattle());
        }
        if (this.ui.btnPause) {
            this.ui.btnPause.addEventListener('click', () => this.togglePause());
        }
        if (this.ui.btnItems) {
            this.ui.btnItems.addEventListener('click', () => this.showItems());
        }
        if (this.ui.btnAnimals) {
            this.ui.btnAnimals.addEventListener('click', () => this.showAnimals());
        }
        if (this.ui.btnFlee) {
            this.ui.btnFlee.addEventListener('click', () => this.flee());
        }
    }

    async startBattle() {
        // 在技能测试器中不使用该函数,由暂停按钮控制战斗开始
        if (!this.battleInProgress) {
            this.battleInProgress = true;
            this.battlePaused = false;
            this.isManualMode = true; // 始终为手动模式
            this.ui.btnPause.textContent = '⏸ 暂停';
            this.addLog('⚔️ 战斗开始！');
            await this.sleep(2000);
            await this.battleLoop();
        }
    }
    
    async togglePause() {
        // 如果战斗还没开始,则开始战斗
        if (!this.battleInProgress) {
            this.battleInProgress = true;
            this.battlePaused = false;
            this.isManualMode = true; // 始终为手动模式
            this.ui.btnPause.textContent = '⏸ 暂停';
            this.ui.btnPause.className = 'control-btn secondary';
            this.addLog('⚔️ 战斗开始！', 'text-cyan-300');
            await this.sleep(2000);
            await this.battleLoop();
            return;
        }
        
        // 战斗进行中,切换暂停状态
        this.battlePaused = !this.battlePaused;
        if (this.battlePaused) {
            this.ui.btnPause.textContent = '▶️ 继续';
            this.ui.btnPause.className = 'control-btn primary';
            this.addLog('⏸ 战斗已暂停', 'text-yellow-300');
        } else {
            this.ui.btnPause.textContent = '⏸ 暂停';
            this.ui.btnPause.className = 'control-btn secondary';
            this.addLog('▶️ 战斗继续', 'text-green-300');
        }
    }
    
    async waitForUnpause() {
        while (this.battlePaused && this.battleInProgress) {
            await this.sleep(100);
        }
    }

    async battleLoop() {
        while (this.battleInProgress) {
            // 检查暂停状态
            await this.waitForUnpause();
            if (!this.battleInProgress) break;
            
            this.turnCount++;
            
            // 更新顶部回合计数器
            const turnCounter = document.getElementById('turn-counter');
            if (turnCounter) {
                turnCounter.textContent = `第 ${this.turnCount} 回合`;
            }
            
            this.addLog(`\n━━━ 第 ${this.turnCount} 回合开始 ━━━`, 'text-cyan-400 font-bold');
            await this.sleep(500);
            await this.waitForUnpause();
            
            // 回合开始：重置属性到基础值
            this.resetAttributesToBase();
            
            // 回合开始：递减状态持续时间
            this.decreaseStatusDurations(true);  // 玩家
            this.decreaseStatusDurations(false); // 对手
            
            // 处理状态效果（自增长、移除过期、触发效果）
            this.processStatuses(true);  // 玩家
            this.processStatuses(false); // 对手
            
            // 回合开始：触发状态技能（不在冷却的状态类技能自动释放）
            await this.triggerStatusSkills(true);  // 玩家
            await this.triggerStatusSkills(false); // 对手
            
            await this.sleep(300);
            await this.waitForUnpause();
            
            // 根据敏捷值决定出手顺序（考虑firstStrike）
            let firstAttacker, secondAttacker;
            if (this.playerStats.firstStrike || (!this.opponentStats.firstStrike && this.playerStats.agility >= this.opponentStats.agility)) {
                firstAttacker = 'player';
                secondAttacker = 'opponent';
            } else {
                firstAttacker = 'opponent';
                secondAttacker = 'player';
            }
            
            // 第一个攻击者行动
            const firstName = firstAttacker === 'player' ? this.playerData.name : this.opponentData.name;
            this.addLog(`${firstName} 先手出击！`, 'text-blue-300');
            await this.sleep(300);
            await this.waitForUnpause();
            
            await this.executeTurn(firstAttacker);
            if (!this.battleInProgress) break;
            
            await this.sleep(800);
            await this.waitForUnpause();
            
            // 第二个攻击者行动
            const secondName = secondAttacker === 'player' ? this.playerData.name : this.opponentData.name;
            this.addLog(`${secondName} 反击！`, 'text-orange-300');
            await this.sleep(300);
            await this.waitForUnpause();
            
            await this.executeTurn(secondAttacker);
            if (!this.battleInProgress) break;
            
            // 更新buff持续时间（旧系统兼容）
            this.updateBuffs();
            
            // 处理持续效果（旧系统兼容）
            this.processContinuousEffects();
            
            // 同步hp到旧的health变量
            this.playerCurrentHealth = this.playerStats.hp;
            this.opponentCurrentHealth = this.opponentStats.hp;
            this.updateHealthUI();
            
            this.addLog(`━━━ 第 ${this.turnCount} 回合结束 ━━━`, 'text-blue-400');
            
            await this.sleep(1000);
            await this.waitForUnpause();
        }
    }

    async executeTurn(attacker) {
        const isPlayer = attacker === 'player';
        const attackerData = isPlayer ? this.playerData : this.opponentData;
        const attackerStats = isPlayer ? this.playerStats : this.opponentStats;
        const defenderStats = isPlayer ? this.opponentStats : this.playerStats;
        
        // 显示回合指示器
        this.showTurnIndicator(isPlayer);
        
        // 手动模式下玩家回合:等待玩家选择技能
        if (isPlayer && this.isManualMode) {
            await this.waitForSkillSelection();
        } else if (!isPlayer) {
            // 敌人回合:随机选择一个技能
            await this.selectEnemySkill();
        }
        
        // 隐藏回合指示器和倒计时（在技能使用后立即隐藏）
        this.hideTurnIndicator(isPlayer);
        
        // 执行攻击
        await this.executeAttack(isPlayer);
        
        // 清除选中状态
        this.selectedSkill = null;
        this.renderSkillsContainer();
    }

    async executeAttack(isPlayer) {
        const attackerName = isPlayer ? this.playerData.name : this.opponentData.name;
        const defenderName = isPlayer ? this.opponentData.name : this.playerData.name;
        const attackerStats = isPlayer ? this.playerStats : this.opponentStats;
        const defenderStats = isPlayer ? this.opponentStats : this.playerStats;
        
        // 检查是否能够行动
        if (attackerStats.cannotAct) {
            this.addLog(`❌ ${attackerName} 无法行动！`, 'text-purple-300');
            return;
        }
        
        // 检查是否能够攻击
        if (attackerStats.cannotAttack) {
            this.addLog(`❌ ${attackerName} 无法攻击！`, 'text-purple-300');
            return;
        }
        
        // 触发防御方的防御技能（被动触发）
        await this.triggerDefenseSkills(!isPlayer);
        
        // 检查是否有保证闪避buff（仅通过技能触发）
        if (defenderStats.buffs.guaranteed_dodge) {
            this.addLog(`${defenderName} 使用闪避技能，完美躲开了攻击！💨`, 'text-cyan-300');
            delete defenderStats.buffs.guaranteed_dodge;
            await this.sleep(800);
            return;
        }
        
        // 触发所有攻击型装备技能
        let totalDamage = 0; // 总伤害（直接累加）
        let isCriticalHit = false; // 标记是否触发暴击技能
        const attackerSkills = isPlayer ? this.playerPassiveSkills : this.opponentPassiveSkills;
        
        // 计算基础伤害（用于技能显示）
        const baseAttack = this.getEffectiveStat(attackerStats, 'attack');
        // 检查防御方是否能够防御
        const defense = defenderStats.cannotDefend ? 0 : this.getEffectiveStat(defenderStats, 'defense');
        if (defenderStats.cannotDefend) {
            this.addLog(`⚠️ ${defenderName} 无法防御！`, 'text-yellow-300');
        }
        const baseDamage = Math.max(1, Math.floor(baseAttack - defense));
        
        // 根据模式和选中的技能决定要触发的技能
        let skillsToTrigger = [];
        
        if (this.isManualMode) {
            // 手动模式下
            if (isPlayer) {
                // 玩家：只释放选中的技能
                if (this.selectedSkill) {
                    skillsToTrigger = attackerSkills.filter(s => s.key === this.selectedSkill);
                } else {
                    // 没有选择技能,放弃行动
                    this.addLog(`${attackerName} 放弃本回合行动`, 'text-gray-400');
                    return;
                }
            } else {
                // 敌人：释放选中的技能（由selectEnemySkill选择）
                if (this.selectedSkill) {
                    skillsToTrigger = attackerSkills.filter(s => s.key === this.selectedSkill);
                } else {
                    // 敌人没有可用技能，放弃行动
                    this.addLog(`${attackerName} 放弃本回合行动`, 'text-gray-400');
                    return;
                }
            }
        } else {
            // 自动模式:释放所有可用技能
            skillsToTrigger = attackerSkills;
        }
        
        // 触发攻击相关的技能（检查冷却）
        for (const skill of skillsToTrigger) {
            // 获取技能的所有类型和效果（支持多类型多效果）
            const skillTypes = skill.types || (skill.type ? [skill.type] : []);
            const skillEffects = skill.effects || (skill.effect ? [skill.effect] : []);
            
            // 自动模式下跳过防御、敏捷和纯被动技能
            // 手动模式下允许所有技能类型
            if (!this.isManualMode) {
                // 判断是否为防御、敏捷或纯被动技能
                const isDefenseSkill = skillTypes.includes('defense') ||
                                      skillEffects.some(e => ['defense_counter', 'buff_defense', 'counter',
                                                              'passive_defense', 'damage_reduction',
                                                              'guaranteed_dodge', 'direct_defense',
                                                              'continuous_defense'].includes(e));
                
                const isAgilityBuff = skillEffects.some(e => ['buff_agility', 'passive_agility'].includes(e));
                const isPassiveOnly = skillEffects.some(e => ['passive_attack', 'regen', 'heal_reduce', 'rebirth'].includes(e));
                
                if (isDefenseSkill || isAgilityBuff || isPassiveOnly) {
                    continue; // 跳过防御和敏捷技能
                }
            }
            
            // 检查技能是否在冷却中
            if (this.isSkillOnCooldown(skill.key, isPlayer)) {
                continue; // 跳过冷却中的技能
            }
            
            // 处理技能的所有攻击效果
            let skillTotalDamage = 0;
            const damageInfoList = [];
            const params = skill.params || {};
            
            // 遍历所有效果，计算每个效果的伤害
            for (const effect of skillEffects) {
                let effectDamage = 0;
                let damageType = '';
                
                // 跳过非攻击效果(但不跳过状态附加效果，将在后面单独处理)
                if (['buff_attack', 'buff_defense', 'buff_speed', 'buff_purify',
                     'buff_heal_amp', 'debuff_attack', 'debuff_defense', 'debuff_speed',
                     'debuff_no_heal', 'debuff_heal_reduce', 'heal_direct', 'heal_continuous',
                     'heal_percent', 'heal_rebirth', 'buff_status_enemy', 'debuff_status_self'].includes(effect)) {
                    continue;
                }
                
                // 从params中获取效果专属参数（格式：effect_参数名）
                const effectSource = params[`${effect}_effect-source`];
                const effectBonus = params[`${effect}_bonus`] || 0;
                const multiBonus = params[`${effect}_multi-bonus`] || params.multiBonus || [];
                const count = params[`${effect}_count`] || params.count || 1;
                
                // 根据effect-source计算来源值
                let sourceValue = 0;
                if (effectSource) {
                    const sourceMapping = {
                        'self-current-attack': baseAttack,
                        'self-base-attack': attackerStats.baseAttack,
                        'self-current-defense': attackerStats.defense,
                        'self-base-defense': attackerStats.baseDefense,
                        'enemy-max-hp': defenderStats.maxHp,
                        'enemy-current-hp': defenderStats.hp,
                        'enemy-lost-hp': defenderStats.maxHp - defenderStats.hp
                    };
                    sourceValue = sourceMapping[effectSource] || baseAttack;
                }
                
                if (effect === 'direct_attack' && effectBonus) {
                    // 直接攻击：根据effect-source和bonus计算
                    const rawDamage = Math.floor(sourceValue * effectBonus);
                    
                    // 判断是否基于攻击力（需要减去防御）
                    const isAttackBased = effectSource && effectSource.includes('attack');
                    if (isAttackBased) {
                        effectDamage = Math.max(1, rawDamage - defense);
                    } else {
                        effectDamage = rawDamage;
                    }
                    damageType = 'direct';
                } else if (effect === 'multi_attack' && (multiBonus.length > 0 || count > 1)) {
                    // 多段攻击：计算所有段的总伤害
                    let hitDamages = [];
                    let hitCount = count;
                    
                    if (multiBonus.length > 0) {
                        if (multiBonus.length === 1) {
                            for (let i = 0; i < count; i++) {
                                hitDamages.push(baseDamage * multiBonus[0]);
                            }
                            hitCount = count;
                        } else {
                            for (let i = 0; i < count && i < multiBonus.length; i++) {
                                hitDamages.push(baseDamage * multiBonus[i]);
                            }
                            hitCount = Math.min(count, multiBonus.length);
                        }
                    } else {
                        for (let i = 0; i < count; i++) {
                            hitDamages.push(baseDamage);
                        }
                    }
                    
                    // 先累加所有段的伤害（保留小数），最后统一取整
                    const totalHitDamage = hitDamages.reduce((sum, dmg) => sum + dmg, 0);
                    effectDamage = Math.floor(totalHitDamage);
                    damageType = 'multi';
                    damageInfoList.push({
                        type: 'multi',
                        damage: effectDamage,
                        hitCount: hitCount,
                        hitDamages: hitDamages.map(d => d.toFixed(1))
                    });
                } else if (effect === 'critical' && skill.value) {
                    effectDamage = Math.floor(baseDamage * skill.value);
                    isCriticalHit = true;
                    damageType = 'critical';
                } else if (effect === 'damage' && skill.value) {
                    effectDamage = Math.floor(baseDamage * skill.value);
                    damageType = 'damage';
                } else if (effect === 'bonus_damage' && skill.value) {
                    effectDamage = Math.floor(baseDamage * skill.value);
                    damageType = 'bonus';
                } else if (effect === 'percent_damage' && skill.value) {
                    const targetMaxHealth = isPlayer ? this.opponentData.stamina : this.playerData.stamina;
                    effectDamage = Math.floor(targetMaxHealth * skill.value);
                    damageType = 'percent';
                } else if (effect === 'true_damage' && skill.value) {
                    effectDamage = Math.floor(baseAttack * skill.value);
                    damageType = 'true';
                } else if (effect === 'damage_amp' && skill.value) {
                    effectDamage = Math.floor(baseDamage * skill.value);
                    damageType = 'amp';
                } else if (effect === 'armor_pierce' && skill.value) {
                    const ignoredDefense = Math.floor(defense * skill.value);
                    effectDamage = Math.floor(ignoredDefense * 0.5);
                    damageType = 'pierce';
                } else if (effect === 'dot_damage' && effectBonus) {
                    const rawDamage = Math.floor(sourceValue * effectBonus);
                    
                    // 判断是否基于攻击力（需要减去防御）
                    const isAttackBased = effectSource && effectSource.includes('attack');
                    if (isAttackBased) {
                        effectDamage = Math.max(1, rawDamage - defense);
                    } else {
                        effectDamage = rawDamage;
                    }
                    damageType = 'dot';
                } else if (effect === 'heal_lifesteal' && skill.value) {
                    effectDamage = baseDamage;
                    damageType = 'lifesteal';
                } else if (skill.value && skill.value > 0) {
                    if (skill.value > 1.0) {
                        effectDamage = Math.floor(baseDamage * skill.value);
                        damageType = 'multiplier';
                    } else {
                        effectDamage = Math.floor(baseDamage * skill.value);
                        damageType = 'bonus';
                    }
                }
                
                if (effectDamage > 0 && damageType) {
                    skillTotalDamage += effectDamage;
                    
                    // 构建伤害信息
                    let damageInfo = '';
                    if (damageType === 'direct') {
                        damageInfo = `固定伤害: ${effectDamage}`;
                    } else if (damageType === 'critical') {
                        damageInfo = `暴击伤害: ${effectDamage}`;
                    } else if (damageType === 'percent') {
                        damageInfo = `百分比伤害: ${effectDamage}`;
                    } else if (damageType === 'true') {
                        damageInfo = `真实伤害: ${effectDamage}`;
                    } else if (damageType === 'pierce') {
                        damageInfo = `穿透伤害: +${effectDamage}`;
                    } else if (damageType === 'dot') {
                        damageInfo = `持续伤害: ${effectDamage}`;
                    } else if (damageType === 'lifesteal') {
                        damageInfo = `伤害: ${effectDamage}, 汲取: ${Math.floor(effectDamage * skill.value)}`;
                    } else if (damageType === 'multiplier') {
                        damageInfo = `伤害: ${effectDamage} (${(skill.value * 100).toFixed(0)}%倍率)`;
                    } else if (damageType === 'bonus' || damageType === 'amp') {
                        damageInfo = `额外伤害: +${effectDamage}`;
                    } else if (damageType === 'damage') {
                        damageInfo = `伤害: ${effectDamage}`;
                    }
                    
                    if (damageInfo) {
                        damageInfoList.push({
                            type: damageType,
                            damage: effectDamage,
                            info: damageInfo
                        });
                    }
                }
            }
            
            // 检查技能是否包含非攻击效果（buff_status_enemy, debuff_status_self等）
            const hasNonDamageEffects = skillEffects.some(e =>
                ['buff_status_enemy', 'debuff_status_self', 'buff_attack', 'buff_defense',
                 'buff_speed', 'buff_purify', 'buff_heal_amp', 'debuff_attack', 'debuff_defense',
                 'debuff_speed', 'debuff_no_heal', 'debuff_heal_reduce', 'debuff_hp_cost', 'heal_direct',
                 'heal_continuous', 'heal_percent', 'heal_rebirth', 'buff_element_damage',
                 'debuff_element_damage'].includes(e)
            );
            
            // 如果技能造成了伤害，累加并显示
            if (skillTotalDamage > 0) {
                totalDamage += skillTotalDamage;
                
                // 合并所有伤害信息
                let combinedInfo = '';
                if (damageInfoList.length > 0) {
                    if (damageInfoList.length === 1) {
                        combinedInfo = damageInfoList[0].info || `伤害: ${skillTotalDamage}`;
                    } else {
                        const parts = damageInfoList.map(d => d.info).filter(Boolean);
                        combinedInfo = `总伤害: ${skillTotalDamage} (${parts.join(' + ')})`;
                    }
                } else {
                    combinedInfo = `伤害: ${skillTotalDamage}`;
                }
                
                await this.triggerSkillEffect(skill, isPlayer, combinedInfo);
            }
            
            // 如果技能有效果（伤害或非伤害），应用非攻击效果并设置冷却
            if (skillTotalDamage > 0 || hasNonDamageEffects) {
                // 如果技能造成了伤害，显示技能触发
                if (skillTotalDamage > 0) {
                    // 伤害已经在上面显示过了（第1741行），这里不需要重复
                }
                
                // 应用技能的非攻击效果（包括状态附加、治愈等）
                if (hasNonDamageEffects) {
                    // 如果技能没有造成伤害但有其他效果，显示技能触发
                    if (skillTotalDamage === 0) {
                        await this.triggerSkillEffect(skill, isPlayer, '辅助效果');
                    }
                    
                    // 调试日志
                    const effectNames = skillEffects.filter(e =>
                        ['buff_status_enemy', 'debuff_status_self', 'buff_attack', 'buff_defense',
                         'buff_speed', 'buff_purify', 'buff_heal_amp', 'debuff_attack', 'debuff_defense',
                         'debuff_speed', 'debuff_no_heal', 'debuff_heal_reduce', 'debuff_hp_cost', 'heal_direct',
                         'heal_continuous', 'heal_percent', 'heal_rebirth', 'buff_element_damage',
                         'debuff_element_damage'].includes(e)
                    );
                    if (effectNames.length > 0) {
                        this.addLog(`→ 应用非伤害效果: ${effectNames.map(e => EFFECT_PARAMS_CONFIG[e]?.name || e).join(', ')}`, 'text-cyan-300');
                    }
                    
                    this.applySkillEffect(skill, isPlayer);
                    // 更新UI显示新附加的状态和血量变化
                    this.updateBuffIcons();
                    this.updateStatusUI();
                    this.updateHealthUI();
                }
                
                // 设置冷却
                if (skill.cooldown) {
                    this.setSkillCooldown(skill.key, skill.cooldown, isPlayer);
                }
            }
        }
        
        // 最终伤害就是所有技能伤害的总和
        // 手动模式下：如果没有攻击技能或攻击技能冷却中，totalDamage为0，不造成伤害
        // 自动模式下：至少造成1点伤害
        let damage = totalDamage;
        if (!this.isManualMode && damage === 0) {
            damage = 1; // 自动模式下保证至少1点伤害
        }
        
        // 只有在有伤害时才应用克制倍率和显示伤害
        if (damage > 0) {
            // 应用属性克制倍率
            damage = this.applyElementDamageModifiers(damage, isPlayer);
            
            // 应用伤害（同时更新两套血量变量）
            if (isPlayer) {
                this.opponentCurrentHealth = Math.max(0, this.opponentCurrentHealth - damage);
                this.opponentStats.hp = this.opponentCurrentHealth; // 同步到新变量
                this.shakeCard(false);
            } else {
                this.playerCurrentHealth = Math.max(0, this.playerCurrentHealth - damage);
                this.playerStats.hp = this.playerCurrentHealth; // 同步到新变量
                this.shakeCard(true);
            }
            
            // 显示伤害信息
            const critText = isCriticalHit ? '💥 暴击！' : '';
            this.addLog(`${critText}${attackerName} 对 ${defenderName} 造成 ${damage} 点伤害！`, isCriticalHit ? 'text-red-400 font-bold' : 'text-red-300');
            await this.sleep(1000);
        }
        
        // 生命汲取效果
        if (attackerStats.buffs.lifesteal) {
            const heal = Math.floor(damage * 0.5);
            if (isPlayer) {
                this.playerCurrentHealth = Math.min(this.playerData.stamina, this.playerCurrentHealth + heal);
                this.playerStats.hp = this.playerCurrentHealth; // 同步到新变量
            } else {
                this.opponentCurrentHealth = Math.min(this.opponentData.stamina, this.opponentCurrentHealth + heal);
                this.opponentStats.hp = this.opponentCurrentHealth; // 同步到新变量
            }
            this.addLog(`${attackerName} 汲取了 ${heal} 点生命值！🩸`, 'text-pink-300');
            await this.sleep(800);
        }
        
        // 反击效果
        if (defenderStats.buffs.counter) {
            // 高亮反击技能
            await this.highlightSkillByEffect(isPlayer ? 'opponent' : 'player', 'counter');
            
            const counterDamage = Math.floor(damage * 0.5);
            // 反击应该伤害攻击方，而不是防御方（同时同步两套血量变量）
            if (isPlayer) {
                // 玩家攻击，敌人反击，伤害玩家
                this.playerCurrentHealth = Math.max(0, this.playerCurrentHealth - counterDamage);
                this.playerStats.hp = this.playerCurrentHealth; // 同步到新变量
            } else {
                // 敌人攻击，玩家反击，伤害敌人
                this.opponentCurrentHealth = Math.max(0, this.opponentCurrentHealth - counterDamage);
                this.opponentStats.hp = this.opponentCurrentHealth; // 同步到新变量
            }
            this.addLog(`${defenderName} 发动反击，造成 ${counterDamage} 点伤害！↩️`, 'text-purple-300');
            await this.sleep(800);
        }
        
        this.updateHealthUI();
        await this.checkBattleEnd();
    }

    async triggerDefenseSkills(isDefender) {
        // 手动模式下,不触发任何防御技能（双方都只在自己的回合释放技能）
        if (this.isManualMode) {
            return;
        }
        
        const defenderName = isDefender ? this.playerData.name : this.opponentData.name;
        const defenderStats = isDefender ? this.playerStats : this.opponentStats;
        const defenderModel = isDefender ? this.ui.playerModel : this.ui.opponentModel;
        const defenderSkills = isDefender ? this.playerPassiveSkills : this.opponentPassiveSkills;
        
        let hasDefenseSkill = false;
        
        // 触发所有防御相关的技能（检查冷却）
        for (const skill of defenderSkills) {
            // 获取技能的所有类型和效果（支持多类型多效果）
            const skillTypes = skill.types || (skill.type ? [skill.type] : []);
            const skillEffects = skill.effects || (skill.effect ? [skill.effect] : []);
            
            // 判断是否包含防御相关的类型或效果
            const hasDefenseType = skillTypes.includes('defense');
            const hasDefenseEffect = skillEffects.some(e =>
                ['defense_counter', 'buff_defense', 'counter', 'passive_defense',
                 'damage_reduction', 'direct_defense', 'continuous_defense'].includes(e)
            );
            
            if (hasDefenseType || hasDefenseEffect) {
                // 检查技能是否在冷却中
                if (this.isSkillOnCooldown(skill.key, isDefender)) {
                    continue; // 跳过冷却中的技能
                }
                
                hasDefenseSkill = true;
                
                // 计算防御加成信息（处理多个防御效果）
                const defenseInfoList = [];
                let totalDefenseBoost = 0;
                
                for (const effect of skillEffects) {
                    if (['direct_defense', 'continuous_defense', 'buff_defense', 'passive_defense'].includes(effect)) {
                        if (skill.value || skill.params?.defenseBonus) {
                            const defenseValue = skill.params?.defenseBonus || skill.value || 0;
                            const defenseBoost = Math.floor(this.getEffectiveStat(defenderStats, 'defense') * defenseValue);
                            totalDefenseBoost += defenseBoost;
                            defenseInfoList.push(`防御提升: +${defenseBoost}`);
                        }
                    } else if (effect === 'defense_counter') {
                        defenseInfoList.push('防御反击');
                        defenderStats.buffs.counter = { value: 1.0, duration: 1 };
                    } else if (effect === 'damage_reduction') {
                        const reductionValue = skill.value || 0.2;
                        defenseInfoList.push(`减伤: ${(reductionValue * 100).toFixed(0)}%`);
                    }
                }
                
                const defenseInfo = defenseInfoList.length > 0 ? defenseInfoList.join(', ') : '防御';
                
                await this.triggerSkillEffect(skill, isDefender, defenseInfo);
                
                // 应用防御加成
                if (totalDefenseBoost > 0) {
                    const defenseValue = skill.params?.defenseBonus || skill.value || 0;
                    defenderStats.buffs.defense_boost = { value: defenseValue, duration: 1 };
                }
                
                // 显示防御效果
                if (defenderModel) {
                    defenderModel.classList.add('animate-defend');
                    await this.sleep(500);
                    defenderModel.classList.remove('animate-defend');
                }
                
                // 设置冷却
                if (skill.cooldown) {
                    this.setSkillCooldown(skill.key, skill.cooldown, isDefender);
                }
            }
        }
        
        // 如果有防御技能，显示防御姿态
        if (hasDefenseSkill) {
            defenderStats.buffs.defending = { value: 0.3, duration: 1 };
        }
    }

    async triggerSkillEffect(skill, isPlayer, damageInfo = null) {
        // 显示日志，包含伤害计算信息
        let logMessage = `✨ ${isPlayer ? '我方' : '敌方'}技能 [${skill.name}] 触发！`;
        if (damageInfo) {
            logMessage += ` (${damageInfo})`;
        }
        this.addLog(logMessage, 'text-purple-300');
        
        // 只在手动模式下且是玩家触发时才高亮底部技能卡片
        if (!this.isManualMode || !isPlayer) {
            return;
        }
        
        // 获取装备的技能列表
        const animalData = isPlayer ? this.playerData : this.opponentData;
        let equippedSkills = [];
        if (animalData.combatSkills) {
            if (Array.isArray(animalData.combatSkills)) {
                equippedSkills = animalData.combatSkills;
            } else if (animalData.combatSkills.equipped) {
                equippedSkills = animalData.combatSkills.equipped;
            }
        }
        
        // 找到技能在槽位中的索引
        const skillIndex = equippedSkills.indexOf(skill.key);
        if (skillIndex !== -1) {
            // 高亮底部技能卡片
            const skillCard = document.getElementById(`skill-card-${skillIndex}`);
            if (skillCard) {
                // 触发动画
                skillCard.classList.add('active');
                await this.sleep(600);
                skillCard.classList.remove('active');
            }
        }
    }

    getEffectiveStat(stats, statName) {
        let value = stats[statName];
        
        // 应用buff加成
        if (stats.buffs[`buff_${statName}`]) {
            value = Math.floor(value * (1 + stats.buffs[`buff_${statName}`].value));
        }
        
        if (stats.buffs.defending && statName === 'defense') {
            value = Math.floor(value * 1.3);
        }
        
        if (stats.buffs.defense_boost && statName === 'defense') {
            value = Math.floor(value * (1 + stats.buffs.defense_boost.value));
        }
        
        return value;
    }

    updateBuffs() {
        // 更新玩家buff
        for (const [key, buff] of Object.entries(this.playerStats.buffs)) {
            if (buff.duration !== undefined) {
                buff.duration--;
                if (buff.duration <= 0) {
                    // buff结束时，移除对应技能的高亮
                    if (buff.skillKey && buff.slotIndex !== undefined && buff.containerId) {
                        const slotElement = document.getElementById(`${buff.containerId}-slot-${buff.slotIndex}`);
                        if (slotElement) {
                            slotElement.classList.remove('skill-active');
                        }
                        // 从activeSkills中移除
                        const index = this.playerStats.activeSkills.indexOf(buff.skillKey);
                        if (index > -1) {
                            this.playerStats.activeSkills.splice(index, 1);
                        }
                    }
                    delete this.playerStats.buffs[key];
                }
            }
        }
        
        // 更新对手buff
        for (const [key, buff] of Object.entries(this.opponentStats.buffs)) {
            if (buff.duration !== undefined) {
                buff.duration--;
                if (buff.duration <= 0) {
                    // buff结束时，移除对应技能的高亮
                    if (buff.skillKey && buff.slotIndex !== undefined && buff.containerId) {
                        const slotElement = document.getElementById(`${buff.containerId}-slot-${buff.slotIndex}`);
                        if (slotElement) {
                            slotElement.classList.remove('skill-active');
                        }
                        // 从activeSkills中移除
                        const index = this.opponentStats.activeSkills.indexOf(buff.skillKey);
                        if (index > -1) {
                            this.opponentStats.activeSkills.splice(index, 1);
                        }
                    }
                    delete this.opponentStats.buffs[key];
                }
            }
        }
        
        // 更新技能冷却
        this.updateSkillCooldowns();
    }
    
    updateSkillCooldowns() {
        // 更新玩家技能冷却
        for (const [skillKey, cooldown] of Object.entries(this.playerStats.skillCooldowns)) {
            this.playerStats.skillCooldowns[skillKey]--;
            if (this.playerStats.skillCooldowns[skillKey] <= 0) {
                delete this.playerStats.skillCooldowns[skillKey];
            }
        }
        
        // 更新对手技能冷却
        for (const [skillKey, cooldown] of Object.entries(this.opponentStats.skillCooldowns)) {
            this.opponentStats.skillCooldowns[skillKey]--;
            if (this.opponentStats.skillCooldowns[skillKey] <= 0) {
                delete this.opponentStats.skillCooldowns[skillKey];
            }
        }
        
        // 刷新技能槽显示
        this.renderPlayerSkillSlots();
        this.renderOpponentSkillSlots();
    }
    
    isSkillOnCooldown(skillKey, isPlayer) {
        const stats = isPlayer ? this.playerStats : this.opponentStats;
        return (stats.skillCooldowns[skillKey] || 0) > 0;
    }
    
    setSkillCooldown(skillKey, cooldown, isPlayer) {
        const stats = isPlayer ? this.playerStats : this.opponentStats;
        stats.skillCooldowns[skillKey] = cooldown;
    }

    showTurnIndicator(isPlayer) {
        if (isPlayer && this.ui.playerTurnBadge) {
            this.ui.playerTurnBadge.classList.add('show');
        } else if (!isPlayer && this.ui.opponentTurnBadge) {
            this.ui.opponentTurnBadge.classList.add('show');
        }
    }

    hideTurnIndicator(isPlayer) {
        if (isPlayer && this.ui.playerTurnBadge) {
            this.ui.playerTurnBadge.classList.remove('show');
        } else if (!isPlayer && this.ui.opponentTurnBadge) {
            this.ui.opponentTurnBadge.classList.remove('show');
        }
    }

    shakeCard(isPlayer) {
        const model = isPlayer ? this.ui.playerModel : this.ui.opponentModel;
        if (model) {
            model.classList.add('animate-hit');
            setTimeout(() => {
                model.classList.remove('animate-hit');
            }, 400);
        }
    }

    updateHealthUI() {
        // 更新玩家血条
        const playerHealthPercent = Math.max(0, (this.playerCurrentHealth / this.playerData.stamina) * 100);
        const playerHpBar = document.getElementById('player-hp-bar');
        const playerHpText = document.getElementById('player-hp-text');
        if (playerHpBar) playerHpBar.style.width = `${playerHealthPercent}%`;
        if (playerHpText) playerHpText.textContent = `${this.playerCurrentHealth} / ${this.playerData.stamina}`;

        // 更新对手血条
        const opponentHealthPercent = Math.max(0, (this.opponentCurrentHealth / this.opponentData.stamina) * 100);
        const opponentHpBar = document.getElementById('opponent-hp-bar');
        const opponentHpText = document.getElementById('opponent-hp-text');
        if (opponentHpBar) opponentHpBar.style.width = `${opponentHealthPercent}%`;
        if (opponentHpText) opponentHpText.textContent = `${this.opponentCurrentHealth} / ${this.opponentData.stamina}`;
        
        // 更新玩家属性数值（带变化指示）
        const playerAttackValue = document.getElementById('player-attack-value');
        const playerDefenseValue = document.getElementById('player-defense-value');
        const playerAgilityValue = document.getElementById('player-agility-value');
        
        if (playerAttackValue) {
            const attackDiff = this.playerStats.attack - this.playerStats.baseAttack;
            const arrow = attackDiff > 0 ? '<span style="color:#22c55e">↑</span>' :
                         attackDiff < 0 ? '<span style="color:#ef4444">↓</span>' : '';
            playerAttackValue.innerHTML = `${this.playerStats.attack}${arrow}`;
        }
        if (playerDefenseValue) {
            const defenseDiff = this.playerStats.defense - this.playerStats.baseDefense;
            const arrow = defenseDiff > 0 ? '<span style="color:#22c55e">↑</span>' :
                         defenseDiff < 0 ? '<span style="color:#ef4444">↓</span>' : '';
            playerDefenseValue.innerHTML = `${this.playerStats.defense}${arrow}`;
        }
        if (playerAgilityValue) {
            const agilityDiff = this.playerStats.agility - this.playerStats.baseAgility;
            const arrow = agilityDiff > 0 ? '<span style="color:#22c55e">↑</span>' :
                         agilityDiff < 0 ? '<span style="color:#ef4444">↓</span>' : '';
            playerAgilityValue.innerHTML = `${this.playerStats.agility}${arrow}`;
        }
        
        // 更新敌方属性数值（带变化指示）
        const opponentAttackValue = document.getElementById('opponent-attack-value');
        const opponentDefenseValue = document.getElementById('opponent-defense-value');
        const opponentAgilityValue = document.getElementById('opponent-agility-value');
        
        if (opponentAttackValue) {
            const attackDiff = this.opponentStats.attack - this.opponentStats.baseAttack;
            const arrow = attackDiff > 0 ? '<span style="color:#22c55e">↑</span>' :
                         attackDiff < 0 ? '<span style="color:#ef4444">↓</span>' : '';
            opponentAttackValue.innerHTML = `${this.opponentStats.attack}${arrow}`;
        }
        if (opponentDefenseValue) {
            const defenseDiff = this.opponentStats.defense - this.opponentStats.baseDefense;
            const arrow = defenseDiff > 0 ? '<span style="color:#22c55e">↑</span>' :
                         defenseDiff < 0 ? '<span style="color:#ef4444">↓</span>' : '';
            opponentDefenseValue.innerHTML = `${this.opponentStats.defense}${arrow}`;
        }
        if (opponentAgilityValue) {
            const agilityDiff = this.opponentStats.agility - this.opponentStats.baseAgility;
            const arrow = agilityDiff > 0 ? '<span style="color:#22c55e">↑</span>' :
                         agilityDiff < 0 ? '<span style="color:#ef4444">↓</span>' : '';
            opponentAgilityValue.innerHTML = `${this.opponentStats.agility}${arrow}`;
        }
        
        // 更新系别显示和克制关系
        this.updateElementDisplay();
        
        // 更新异常状态显示
        this.updateStatusUI();
    }
    
    updateElementDisplay() {
        // 更新我方系别显示
        const playerElementEl = document.getElementById('player-element');
        if (playerElementEl) {
            const playerElement = this.playerStats.element || 'water';
            const elementInfo = this.getElementInfo(playerElement);
            playerElementEl.textContent = `${elementInfo.icon} ${elementInfo.name}`;
            playerElementEl.className = `text-sm font-bold px-3 py-1 rounded-full ${elementInfo.bgClass} text-white`;
        }
        
        // 更新敌方系别显示
        const opponentElementEl = document.getElementById('opponent-element');
        if (opponentElementEl) {
            const opponentElement = this.opponentStats.element || 'fire';
            const elementInfo = this.getElementInfo(opponentElement);
            opponentElementEl.textContent = `${elementInfo.icon} ${elementInfo.name}`;
            opponentElementEl.className = `text-sm font-bold px-3 py-1 rounded-full ${elementInfo.bgClass} text-white`;
        }
        
        // 更新克制关系指示器
        const advantageEl = document.getElementById('advantage-indicator');
        if (advantageEl) {
            const playerElement = this.playerStats.element || 'water';
            const opponentElement = this.opponentStats.element || 'fire';
            const multiplier = getElementAdvantageMultiplier(playerElement, opponentElement);
            
            if (multiplier > 1) {
                // 我方克制敌方
                advantageEl.textContent = `我方克制敌方 ×${multiplier}`;
                advantageEl.className = 'text-sm font-bold px-4 py-2 rounded-lg bg-green-600 border-2 border-green-400 text-white';
            } else if (multiplier < 1) {
                // 我方被克制，敌方对我方也是1.5倍
                advantageEl.textContent = `敌方克制我方 ×1.5`;
                advantageEl.className = 'text-sm font-bold px-4 py-2 rounded-lg bg-red-600 border-2 border-red-400 text-white';
            } else {
                // 无克制关系
                advantageEl.textContent = '无克制关系';
                advantageEl.className = 'text-sm font-bold px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-400';
            }
        }
    }
    
    getElementInfo(element) {
        const elementData = {
            'normal': { name: '普通', icon: '⭕', bgClass: 'bg-gray-600' },
            'water': { name: '水系', icon: '💧', bgClass: 'bg-blue-600' },
            'fire': { name: '火系', icon: '🔥', bgClass: 'bg-red-600' },
            'grass': { name: '草系', icon: '🌿', bgClass: 'bg-green-600' },
            'wind': { name: '风系', icon: '💨', bgClass: 'bg-cyan-600' },
            'metal': { name: '金系', icon: '🪙', bgClass: 'bg-yellow-600' },
            'earth': { name: '土系', icon: '🪨', bgClass: 'bg-amber-700' }
        };
        return elementData[element] || { name: element, icon: '❓', bgClass: 'bg-gray-600' };
    }
    
    // 异常状态名称映射
    getStatusNames() {
        return {
            'stun': '😵 眩晕',
            'poison': '🤢 中毒',
            'bleed': '🩸 流血',
            'frostbite': '❄️ 冻伤',
            'burn': '🔥 灼烧',
            'paralyze': '⚡ 麻痹',
            'no-heal': '🚫 禁疗',
            'heal-reduce': '📉 减疗'
        };
    }
    
    // 更新异常状态UI（新格式）
    updateStatusUI() {
        // 更新玩家异常状态
        const playerStatusEl = document.getElementById('player-status');
        if (playerStatusEl) {
            if (this.playerStats.statuses.length === 0) {
                playerStatusEl.innerHTML = '<span class="text-xs text-gray-500">无</span>';
            } else {
                playerStatusEl.innerHTML = this.playerStats.statuses.map(s => {
                    const display = this.getStatusDisplay(s.key);
                    const hasStacks = s.data?.hasStacks !== false;
                    
                    // 判断持续时间模式
                    const isPermanent = s.data?.isPermanent;
                    const isStackPermanent = s.data?.isStackPermanent;
                    
                    if (hasStacks) {
                        if (!s.stackDurations || s.stackDurations.length === 0) return '';
                        const stacks = s.stackDurations.length;
                        
                        // 根据模式显示不同的持续时间信息
                        let durationText = '';
                        if (isPermanent && !isStackPermanent) {
                            // 每层独立计时模式
                            const minDuration = Math.min(...s.stackDurations);
                            durationText = minDuration;
                        } else if (!isPermanent && isStackPermanent) {
                            // 状态整体持续模式
                            durationText = s.statusDuration || '?';
                        } else if (isPermanent && isStackPermanent) {
                            // 双永久
                            durationText = '永久';
                        } else {
                            // 其他情况（兼容旧数据）
                            durationText = `${s.statusDuration || '?'}/${Math.min(...s.stackDurations)}`;
                        }
                        
                        return `<span class="bg-red-500/30 text-red-300 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1" title="各层剩余回合: ${s.stackDurations.join(',')}\n状态剩余回合: ${s.statusDuration}">${display} ×${stacks} (${durationText})</span>`;
                    } else {
                        const statusDuration = isPermanent ? '永久' : (s.statusDuration || '?');
                        return `<span class="bg-red-500/30 text-red-300 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1" title="状态持续回合: ${statusDuration}">${display} (${statusDuration})</span>`;
                    }
                }).filter(h => h).join('');
            }
        }
        
        // 更新敌方异常状态
        const opponentStatusEl = document.getElementById('opponent-status');
        if (opponentStatusEl) {
            if (this.opponentStats.statuses.length === 0) {
                opponentStatusEl.innerHTML = '<span class="text-xs text-gray-500">无</span>';
            } else {
                opponentStatusEl.innerHTML = this.opponentStats.statuses.map(s => {
                    const display = this.getStatusDisplay(s.key);
                    const hasStacks = s.data?.hasStacks !== false;
                    
                    // 判断持续时间模式
                    const isPermanent = s.data?.isPermanent;
                    const isStackPermanent = s.data?.isStackPermanent;
                    
                    if (hasStacks) {
                        if (!s.stackDurations || s.stackDurations.length === 0) return '';
                        const stacks = s.stackDurations.length;
                        
                        // 根据模式显示不同的持续时间信息
                        let durationText = '';
                        if (isPermanent && !isStackPermanent) {
                            // 每层独立计时模式
                            const minDuration = Math.min(...s.stackDurations);
                            durationText = minDuration;
                        } else if (!isPermanent && isStackPermanent) {
                            // 状态整体持续模式
                            durationText = s.statusDuration || '?';
                        } else if (isPermanent && isStackPermanent) {
                            // 双永久
                            durationText = '永久';
                        } else {
                            // 其他情况（兼容旧数据）
                            durationText = `${s.statusDuration || '?'}/${Math.min(...s.stackDurations)}`;
                        }
                        
                        return `<span class="bg-red-500/30 text-red-300 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1" title="各层剩余回合: ${s.stackDurations.join(',')}\n状态剩余回合: ${s.statusDuration}">${display} ×${stacks} (${durationText})</span>`;
                    } else {
                        const statusDuration = isPermanent ? '永久' : (s.statusDuration || '?');
                        return `<span class="bg-red-500/30 text-red-300 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1" title="状态持续回合: ${statusDuration}">${display} (${statusDuration})</span>`;
                    }
                }).filter(h => h).join('');
            }
        }
    }

    async checkBattleEnd() {
        // 检查敌方死亡
        if (this.opponentCurrentHealth <= 0) {
            // 检查敌方是否有重生效果
            if (this.opponentStats.rebirthPercent && this.opponentStats.rebirthPercent > 0) {
                const rebirthHp = Math.floor(this.opponentStats.maxHp * this.opponentStats.rebirthPercent);
                this.opponentCurrentHealth = rebirthHp;
                this.opponentStats.hp = rebirthHp;
                this.addLog(`✨ ${this.opponentData.name} 触发重生效果，恢复 ${rebirthHp} 点生命！`, 'text-yellow-300 font-bold');
                this.opponentStats.rebirthPercent = 0; // 清除重生标记
                this.updateHealthUI();
                await this.sleep(1500);
                return false;
            }
            
            this.battleInProgress = false;
            await this.handleVictory();
            return true;
        }
        
        // 检查玩家死亡
        if (this.playerCurrentHealth <= 0) {
            // 检查玩家是否有重生效果
            if (this.playerStats.rebirthPercent && this.playerStats.rebirthPercent > 0) {
                const rebirthHp = Math.floor(this.playerStats.maxHp * this.playerStats.rebirthPercent);
                this.playerCurrentHealth = rebirthHp;
                this.playerStats.hp = rebirthHp;
                this.addLog(`✨ ${this.playerData.name} 触发重生效果，恢复 ${rebirthHp} 点生命！`, 'text-yellow-300 font-bold');
                this.playerStats.rebirthPercent = 0; // 清除重生标记
                this.updateHealthUI();
                await this.sleep(1500);
                return false;
            }
            
            this.battleInProgress = false;
            await this.handleDefeat();
            return true;
        }
        
        return false;
    }

    async handleVictory() {
        this.addLog(`\n🎉 胜利！你击败了 ${this.opponentData.name}！`, 'text-green-400 font-bold text-lg');
        
        // 检查是否是联赛战斗
        const queueData = JSON.parse(localStorage.getItem('leagueBattleQueue') || 'null');
        if (queueData) {
            await this.handleLeagueVictory(queueData);
            return;
        }
        
        // 检查是否是通缉任务
        const activeBountyId = localStorage.getItem('activeBountyId');
        if (activeBountyId) {
            localStorage.setItem('bountyBattleResult', 'won');
        }
        
        await this.sleep(2000);
        
        // 如果是野生动物，显示捕获选项
        if (this.opponentData.isWild) {
            this.showCaptureOptions();
        } else {
            this.processXpAndLevelUp();
        }
    }

    async handleDefeat() {
        this.addLog(`\n💀 战败...你被 ${this.opponentData.name} 击败了...`, 'text-red-400 font-bold text-lg');
        
        // 检查是否是联赛战斗
        const queueData = JSON.parse(localStorage.getItem('leagueBattleQueue') || 'null');
        if (queueData) {
            await this.handleLeagueDefeat(queueData);
            return;
        }
        
        await this.sleep(2000);
        this.showReturnButton("战斗失败，返回主场景");
    }
    
    async handleLeagueVictory(queueData) {
        await this.sleep(1500);
        
        // 记录当前比赛的结果（使用当前的currentBattle作为索引）
        if (!queueData.matchHistory) {
            queueData.matchHistory = [];
        }
        queueData.matchHistory[queueData.currentBattle] = 'win';
        
        // 更新队列数据
        queueData.playerWins++;
        queueData.currentBattle++;
        
        // 更新显示
        this.renderScoreCircles(queueData);
        
        // 保存到localStorage
        localStorage.setItem('leagueBattleQueue', JSON.stringify(queueData));
        
        // 显示当前比分
        this.addLog(`\n📊 当前比分: 我方 ${queueData.playerWins} : ${queueData.opponentWins} 对方`, 'text-yellow-300 font-bold');
        await this.sleep(1500);
        
        // 检查是否提前结束（一方赢得3场）
        if (queueData.playerWins >= 3) {
            this.addLog(`\n🏆 恭喜！你以 ${queueData.playerWins}:${queueData.opponentWins} 赢得了这场比赛！`, 'text-green-400 font-bold text-lg');
            await this.sleep(2000);
            this.finishLeagueMatch(queueData);
            return;
        }
        
        // 检查是否完成所有5场
        if (queueData.currentBattle >= 5) {
            this.finishLeagueMatch(queueData);
            return;
        }
        
        // 自动继续下一场（不需要玩家点击）
        this.addLog(`\n⏱️ 3秒后自动开始第${queueData.currentBattle + 1}场战斗...`, 'text-cyan-300');
        await this.sleep(3000);
        location.reload();
    }
    
    async handleLeagueDefeat(queueData) {
        await this.sleep(1500);
        
        // 记录当前比赛的结果（使用当前的currentBattle作为索引）
        if (!queueData.matchHistory) {
            queueData.matchHistory = [];
        }
        queueData.matchHistory[queueData.currentBattle] = 'loss';
        
        // 更新队列数据
        queueData.opponentWins++;
        queueData.currentBattle++;
        
        // 更新显示
        this.renderScoreCircles(queueData);
        
        // 保存到localStorage
        localStorage.setItem('leagueBattleQueue', JSON.stringify(queueData));
        
        // 显示当前比分
        this.addLog(`\n📊 当前比分: 我方 ${queueData.playerWins} : ${queueData.opponentWins} 对方`, 'text-yellow-300 font-bold');
        await this.sleep(1500);
        
        // 检查是否提前结束（对方赢得3场）
        if (queueData.opponentWins >= 3) {
            this.addLog(`\n💔 遗憾！你以 ${queueData.playerWins}:${queueData.opponentWins} 输掉了这场比赛...`, 'text-red-400 font-bold text-lg');
            await this.sleep(2000);
            this.finishLeagueMatch(queueData);
            return;
        }
        
        // 检查是否完成所有5场
        if (queueData.currentBattle >= 5) {
            this.finishLeagueMatch(queueData);
            return;
        }
        
        // 自动继续下一场（不需要玩家点击）
        this.addLog(`\n⏱️ 3秒后自动开始第${queueData.currentBattle + 1}场战斗...`, 'text-cyan-300');
        await this.sleep(3000);
        location.reload();
    }
    
    
    finishLeagueMatch(queueData) {
        const playerWins = queueData.playerWins;
        const opponentWins = queueData.opponentWins;
        const playerWon = playerWins > opponentWins;
        
        // 最后一次更新比分显示，确保所有圈都正确显示
        this.renderScoreCircles(queueData);
        
        // 保存最终结果
        localStorage.setItem('leagueMatchResult', JSON.stringify({
            playerWins: playerWins,
            opponentWins: opponentWins,
            result: playerWon ? 'win' : 'loss'
        }));
        
        // 清除队列
        localStorage.removeItem('leagueBattleQueue');
        
        this.addLog(`\n━━━━━━━━━━━━━━━━━━━━━━`, 'text-gray-400');
        this.addLog(`🏁 比赛结束！最终比分: ${playerWins} : ${opponentWins}`, 'text-yellow-400 font-bold text-lg');
        this.addLog(`${playerWon ? '🎉 恭喜获胜！' : '💔 遗憾落败...'}`, playerWon ? 'text-green-400 font-bold' : 'text-red-400 font-bold');
        this.addLog(`━━━━━━━━━━━━━━━━━━━━━━`, 'text-gray-400');
        
        const actionPanel = document.querySelector('.controls');
        if (!actionPanel) return;
        actionPanel.innerHTML = '';
        
        const returnButton = document.createElement('button');
        returnButton.textContent = '返回联赛页面';
        returnButton.className = 'control-btn primary';
        returnButton.onclick = () => {
            const returnUrl = localStorage.getItem('battleReturnUrl') || 'league.html';
            localStorage.removeItem('battleOpponent');
            localStorage.removeItem('battlePlayerAnimal');
            window.location.href = returnUrl;
        };
        
        actionPanel.appendChild(returnButton);
    }

    showCaptureOptions() {
        const actionPanel = document.querySelector('.controls');
        if (!actionPanel) return;
        actionPanel.innerHTML = '';
        
        this.addLog(`要尝试捕获 ${this.opponentData.name} 吗？`, 'text-yellow-300');
        
        const captureButton = document.createElement('button');
        captureButton.textContent = '✅ 捕获';
        captureButton.className = 'control-btn primary';
        captureButton.onclick = () => {
            // 创建不含avatarData的副本以避免超出localStorage配额
            const capturedData = { ...this.opponentData };
            delete capturedData.avatarData; // 移除头像数据，将从模板重新获取
            localStorage.setItem('capturedAnimal', JSON.stringify(capturedData));
            this.addLog(`成功捕获了 ${this.opponentData.name}！它将被传送回你的栖息地。`, 'text-green-400');
            actionPanel.querySelectorAll('button').forEach(btn => btn.disabled = true);
            setTimeout(() => this.showReturnButton("捕获成功，返回主场景"), 1500);
        };
        
        const releaseButton = document.createElement('button');
        releaseButton.textContent = '❌ 放走';
        releaseButton.className = 'control-btn danger';
        releaseButton.onclick = () => {
            this.addLog(`你放走了 ${this.opponentData.name}。`, 'text-gray-400');
            actionPanel.querySelectorAll('button').forEach(btn => btn.disabled = true);
            setTimeout(() => this.processXpAndLevelUp(), 1000);
        };
        
        actionPanel.appendChild(captureButton);
        actionPanel.appendChild(releaseButton);
    }

    processXpAndLevelUp() {
        const xpGained = this.opponentData.level * 15;
        this.playerData.xp = (this.playerData.xp || 0) + xpGained;
        this.addLog(`你获得了 ${xpGained} 点经验值！`, 'text-yellow-300');
        
        let leveledUp = false;
        const xpToNextLevel = this.playerData.xpToNextLevel || this.playerData.level * 100;
        
        while (this.playerData.xp >= xpToNextLevel) {
            leveledUp = true;
            this.playerData.level++;
            this.playerData.xp -= xpToNextLevel;
            this.playerData.stamina += 20;
            this.playerData.xpToNextLevel = this.playerData.level * 100;
        }
        
        localStorage.setItem('playerAnimal', JSON.stringify(this.playerData));
        
        setTimeout(() => {
            if (leveledUp) {
                this.addLog(`🎉 恭喜！${this.playerData.name} 升到了 ${this.playerData.level} 级！`, 'text-green-400 font-bold');
            }
            this.showReturnButton("战斗胜利，返回主场景");
        }, 1500);
    }

    showReturnButton(message) {
        const actionPanel = document.querySelector('.controls');
        if (!actionPanel) return;
        actionPanel.innerHTML = '';
        
        const returnButton = document.createElement('button');
        returnButton.textContent = message;
        returnButton.className = 'control-btn primary';
        returnButton.onclick = () => {
            const returnUrl = localStorage.getItem('battleReturnUrl') || 'game3d.html';
            localStorage.removeItem('battleOpponent');
            localStorage.removeItem('battlePlayerAnimal');
            localStorage.removeItem('battleReturnUrl');
            window.location.href = returnUrl;
        };
        
        actionPanel.appendChild(returnButton);
    }

    selectSkill(skillKey, skillIndex) {
        // 选中技能
        this.selectedSkill = skillKey;
        
        // 清除之前的选中状态
        for (let i = 0; i < 4; i++) {
            const card = document.getElementById(`skill-card-${i}`);
            if (card) {
                card.style.border = '2px solid rgba(100, 116, 139, 0.5)';
                card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
            }
        }
        
        // 高亮选中的技能卡片
        const selectedCard = document.getElementById(`skill-card-${skillIndex}`);
        if (selectedCard) {
            selectedCard.style.border = '2px solid #22c55e';
            selectedCard.style.boxShadow = '0 0 24px rgba(34, 197, 94, 0.8)';
        }
        
        this.addLog(`已选择技能进行释放`, 'text-green-300');
        
        // 清除计时器
        if (this.turnTimeout) {
            clearTimeout(this.turnTimeout);
            this.turnTimeout = null;
        }
        
        // 清空倒计时显示
        if (this.ui.playerCountdown) {
            this.ui.playerCountdown.textContent = '';
        }
    }
    
    async waitForSkillSelection() {
        this.addLog('⏰ 请在10秒内选择技能释放...', 'text-yellow-300');
        
        let remainingTime = 10;
        
        // 清除之前可能存在的interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // 显示中心倒计时
        if (this.ui.centerCountdown) {
            this.ui.centerCountdown.classList.add('show');
        }
        
        // 设置10秒计时器
        const timeoutPromise = new Promise((resolve) => {
            // 倒计时显示
            this.countdownInterval = setInterval(() => {
                if (this.ui.centerCountdown) {
                    this.ui.centerCountdown.textContent = remainingTime;
                }
                remainingTime--;
                
                if (remainingTime < 0) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }, 1000);
            
            this.turnTimeout = setTimeout(() => {
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
                if (this.ui.centerCountdown) {
                    this.ui.centerCountdown.textContent = '';
                    this.ui.centerCountdown.classList.remove('show');
                }
                this.addLog('⏱️ 超时！放弃本回合行动', 'text-gray-400');
                resolve();
            }, 10000);
        });
        
        // 等待玩家选择技能
        const selectionPromise = new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.selectedSkill) {
                    clearInterval(checkInterval);
                    clearTimeout(this.turnTimeout);
                    this.turnTimeout = null;
                    if (this.countdownInterval) {
                        clearInterval(this.countdownInterval);
                        this.countdownInterval = null;
                    }
                    if (this.ui.centerCountdown) {
                        this.ui.centerCountdown.textContent = '';
                        this.ui.centerCountdown.classList.remove('show');
                    }
                    resolve();
                }
            }, 100);
            
            // 如果超时,也要清除检查循环
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 10000);
        });
        
        // 等待任意一个完成
        await Promise.race([timeoutPromise, selectionPromise]);
    }
    
    async selectEnemySkill() {
        const enemySkills = this.opponentPassiveSkills;
        
        // 在手动模式下,选择所有可用技能(不限类型)
        // 在自动模式下,只选择攻击技能
        let availableSkills;
        
        if (this.isManualMode) {
            // 手动模式：选择所有不在冷却中的技能
            availableSkills = enemySkills.filter(skill => {
                return !this.isSkillOnCooldown(skill.key, false);
            });
        } else {
            // 自动模式：过滤出可用的攻击技能(不在冷却中)
            availableSkills = enemySkills.filter(skill => {
                const skillTypes = skill.types || (skill.type ? [skill.type] : []);
                const skillEffects = skill.effects || (skill.effect ? [skill.effect] : []);
                
                // 不是防御/敏捷/纯被动技能
                const isDefenseSkill = skillTypes.includes('defense') ||
                                      skillEffects.some(e => ['defense_counter', 'buff_defense', 'counter',
                                                              'passive_defense', 'damage_reduction',
                                                              'guaranteed_dodge', 'direct_defense',
                                                              'continuous_defense'].includes(e));
                const isAgilityBuff = skillEffects.some(e => ['buff_agility', 'passive_agility'].includes(e));
                const isPassiveOnly = skillEffects.some(e => ['passive_attack', 'regen', 'heal_reduce', 'rebirth'].includes(e));
                
                if (isDefenseSkill || isAgilityBuff || isPassiveOnly) {
                    return false;
                }
                
                // 不在冷却中
                return !this.isSkillOnCooldown(skill.key, false);
            });
        }
        
        // 随机选择一个技能
        if (availableSkills.length > 0) {
            const selectedSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            this.selectedSkill = selectedSkill.key;
            this.addLog(`敌人准备使用 [${selectedSkill.name}]`, 'text-red-300');
        } else {
            // 没有可用技能,不选择
            this.selectedSkill = null;
            if (this.isManualMode) {
                this.addLog(`敌人没有可用技能（${enemySkills.length}个技能，全部冷却中或不可用）`, 'text-gray-400');
            }
        }
        
        await this.sleep(500);
    }
    
    showItems() {
        this.addLog('🎒 道具功能开发中...', 'text-yellow-300');
        alert('道具功能正在开发中，敬请期待！');
    }
    
    showAnimals() {
        // 暂停战斗
        if (this.battleInProgress && !this.battlePaused) {
            this.togglePause();
        }
        
        // 获取背包中的动物
        const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
        const currentPlayerKey = this.playerData.key || this.playerData.animalId;
        
        // 保存当前技能栏以便恢复
        this.savedSkillsContainer = document.getElementById('skills-container').innerHTML;
        
        // 渲染动物选择栏
        const container = document.getElementById('skills-container');
        container.innerHTML = '';
        
        if (animalPool.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'flex items-center justify-center text-gray-400 text-center';
            emptyCard.textContent = '背包中没有动物';
            container.appendChild(emptyCard);
        } else {
            // 动物数量决定每个卡片的宽度
            const cardWidth = animalPool.length <= 4 ? 'calc(25% - 0.75rem)' : 'calc(20% - 0.8rem)';
            
            animalPool.forEach(animal => {
                const isCurrent = (animal.key || animal.animalId) === currentPlayerKey;
                const animalKey = animal.key || animal.animalId;
                
                const card = document.createElement('div');
                card.className = 'skill-card';
                card.style.width = cardWidth;
                
                // 当前动物显示绿色边框
                if (isCurrent) {
                    card.style.border = '2px solid #22c55e';
                    card.style.boxShadow = '0 0 16px rgba(34, 197, 94, 0.6)';
                    card.style.cursor = 'not-allowed';
                } else {
                    card.style.cursor = 'pointer';
                    card.onclick = () => {
                        this.switchToAnimal(animalKey, animalPool);
                    };
                }
                
                card.innerHTML = `
                    <div class="skill-icon">${animal.icon || '🐾'}</div>
                    <div class="skill-name">${animal.name}</div>
                    <div class="skill-stats">
                        <span>Lv.${animal.level || 1}</span>
                        <span>HP:${animal.stamina || 100}</span>
                    </div>
                    <div class="skill-type" style="background: ${isCurrent ? '#22c55e' : '#6b7280'}">
                        ${isCurrent ? '当前' : '切换'}
                    </div>
                `;
                
                container.appendChild(card);
            });
        }
        
        // 添加返回按钮
        const returnCard = document.createElement('div');
        returnCard.className = 'skill-card';
        returnCard.style.width = cardWidth;
        returnCard.style.cursor = 'pointer';
        returnCard.onclick = () => {
            this.restoreSkillsContainer();
        };
        
        returnCard.innerHTML = `
            <div class="skill-icon">↩️</div>
            <div class="skill-name">返回</div>
            <div class="skill-type" style="background: #6b7280">取消</div>
        `;
        
        container.appendChild(returnCard);
        
        this.addLog('💡 点击动物图标切换，点击"返回"图标恢复技能栏', 'text-cyan-300');
    }
    
    switchToAnimal(animalKey, animalPool) {
        const animal = animalPool.find(a => (a.key || a.animalId) === animalKey);
        if (!animal) return;
        
        // 保存当前战斗状态
        const wasInBattle = this.battleInProgress;
        const wasPaused = this.battlePaused;
        
        // 更新玩家数据
        this.playerData = {
            ...animal,
            key: animal.key || animal.animalId,
            animalId: animal.animalId || animal.key,
            stamina: animal.stamina || animal.abilities?.combat?.hp || 100,
            abilities: animal.abilities || {
                combat: {
                    attack: 10,
                    defense: 5,
                    agility: 8
                }
            },
            combatSkills: animal.combatSkills || { equipped: [] }
        };
        
        // 重置战斗状态
        this.playerStats.hp = this.playerData.stamina;
        this.playerStats.maxHp = this.playerData.stamina;
        this.playerStats.attack = this.playerData.abilities.combat.attack;
        this.playerStats.defense = this.playerData.abilities.combat.defense;
        this.playerStats.agility = this.playerData.abilities.combat.agility;
        this.playerStats.baseAttack = this.playerData.abilities.combat.attack;
        this.playerStats.baseDefense = this.playerData.abilities.combat.defense;
        this.playerStats.baseAgility = this.playerData.abilities.combat.agility;
        this.playerStats.element = this.playerData.element || 'water';
        this.playerStats.statuses = [];
        this.playerStats.buffs = {};
        this.playerStats.skillCooldowns = {};
        this.playerStats.rebirthPercent = 0;
        
        this.playerCurrentHealth = this.playerData.stamina;
        
        // 更新被动技能
        this.playerPassiveSkills = this.getPassiveSkills(this.playerData);
        
        // 恢复技能栏并更新UI
        this.restoreSkillsContainer();
        this.renderPlayerInfo();
        this.updateHealthUI();
        
        this.addLog(`✨ 已切换到 ${animal.name}！`, 'text-green-300');
        
        // 如果之前战斗已暂停,保持暂停状态
        if (wasInBattle && wasPaused) {
            this.battlePaused = true;
        }
    }
    
    restoreSkillsContainer() {
        if (this.savedSkillsContainer) {
            document.getElementById('skills-container').innerHTML = this.savedSkillsContainer;
            this.savedSkillsContainer = null;
        } else {
            this.renderSkillsContainer();
        }
    }

    flee() {
        if (confirm("确定要从战斗中逃跑吗？")) {
            localStorage.removeItem('battleOpponent');
            localStorage.removeItem('battlePlayerAnimal');
            window.location.href = '../pages/game3d.html';
        }
    }

    addLog(message, className = 'text-gray-300') {
        const logContainer = this.ui.battleLog;
        if (!logContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${className}`;
        logEntry.textContent = message;
        logContainer.appendChild(logEntry);
        
        // 自动滚动到底部
        const battleLogPanel = document.getElementById('battle-log');
        if (battleLogPanel) {
            battleLogPanel.scrollTop = battleLogPanel.scrollHeight;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 获取效果来源的数值（从skill_designer同步）
    getEffectSourceValue(sourceKey, isPlayer) {
        const stats = isPlayer ? this.playerStats : this.opponentStats;
        const enemyStats = isPlayer ? this.opponentStats : this.playerStats;
        const mapping = {
            'self-current-attack': stats.attack,
            'self-base-attack': stats.baseAttack,
            'self-current-defense': stats.defense,
            'self-base-defense': stats.baseDefense,
            'self-current-agility': stats.agility,
            'self-base-agility': stats.baseAgility,
            'self-max-hp': stats.maxHp,
            'self-lost-hp': stats.maxHp - stats.hp,
            'self-current-hp': stats.hp,
            'self-turn-damage': stats.turnDamage,
            'enemy-current-attack': enemyStats.attack,
            'enemy-base-attack': enemyStats.baseAttack,
            'enemy-current-defense': enemyStats.defense,
            'enemy-base-defense': enemyStats.baseDefense,
            'enemy-current-agility': enemyStats.agility,
            'enemy-base-agility': enemyStats.baseAgility,
            'enemy-max-hp': enemyStats.maxHp,
            'enemy-lost-hp': enemyStats.maxHp - enemyStats.hp,
            'enemy-current-hp': enemyStats.hp,
            'enemy-turn-damage': enemyStats.turnDamage
        };
        return mapping[sourceKey] || 0;
    }
    
    // 应用属性增伤/减伤（从skill_designer同步）
    applyElementDamageModifiers(baseDamage, isPlayer) {
        let finalDamage = baseDamage;
        const attackerStats = isPlayer ? this.playerStats : this.opponentStats;
        const defenderStats = isPlayer ? this.opponentStats : this.playerStats;
        const attackerElement = attackerStats.element;
        const defenderElement = defenderStats.element;
        
        // 应用属性克制倍率
        const advantageMultiplier = getElementAdvantageMultiplier(attackerElement, defenderElement);
        if (advantageMultiplier !== 1.0) {
            const oldDamage = finalDamage;
            finalDamage = Math.round(finalDamage * advantageMultiplier);
            const advantageText = advantageMultiplier > 1 ? '克制' : '被克制';
            this.addLog(`  → 属性${advantageText}(${this.getElementName(attackerElement)}对${this.getElementName(defenderElement)}): ${oldDamage} × ${advantageMultiplier} = ${finalDamage}`, advantageMultiplier > 1 ? 'text-green-300' : 'text-red-300');
        }
        
        // 应用攻击方的属性增伤
        if (attackerStats.elementDamageBonus && attackerStats.elementDamageBonus[defenderElement]) {
            const bonus = attackerStats.elementDamageBonus[defenderElement];
            const oldDamage = finalDamage;
            finalDamage = Math.round(finalDamage * (1 + bonus));
            this.addLog(`  → 属性增伤(对${this.getElementName(defenderElement)}系): ${oldDamage} × (1+${bonus}) = ${finalDamage}`, 'text-cyan-300');
        }
        
        // 应用防御方的属性减伤
        if (defenderStats.elementDamageReduce && defenderStats.elementDamageReduce[attackerElement]) {
            const reduce = defenderStats.elementDamageReduce[attackerElement];
            const oldDamage = finalDamage;
            finalDamage = Math.round(finalDamage * (1 - reduce));
            this.addLog(`  → 属性减伤(受${this.getElementName(attackerElement)}系): ${oldDamage} × (1-${reduce}) = ${finalDamage}`, 'text-cyan-300');
        }
        
        return Math.max(1, finalDamage);
    }
    
    getElementName(element) {
        const names = {
            'normal': '普通', 'water': '水', 'fire': '火', 'grass': '草',
            'wind': '风', 'metal': '金', 'earth': '土'
        };
        return names[element] || element;
    }
    
    // 处理持续效果（从skill_designer同步）
    processContinuousEffects() {
        if (this.activeEffects.length === 0) return;
        
        this.addLog(`触发 ${this.activeEffects.length} 个持续效果`, 'text-yellow-300');
        
        this.activeEffects.forEach(effect => {
            if (effect.isTempBuff) {
                // 临时增益效果只在回合结束时清除，不需要每回合触发
                return;
            }
            
            // 对于基础属性，使用锁定的初始值；对于当前属性，重新计算
            let effectValue;
            if (effect.effectSource && effect.effectSource.includes('base')) {
                effectValue = effect.lockedSourceValue;
            } else {
                effectValue = this.getEffectSourceValue(effect.effectSource, effect.isPlayer);
            }
            
            this.applySingleEffect(effect.effectKey, effectValue, effect.count, effect.skill.params || {}, effect.isPlayer, effect.effectSource);
        });
        
        // 减少回合数并移除已结束的效果
        const beforeCount = this.activeEffects.length;
        this.activeEffects = this.activeEffects.map(effect => ({
            ...effect,
            remainingTurns: effect.remainingTurns - 1
        })).filter(effect => {
            if (effect.remainingTurns > 0) {
                return true;
            } else {
                // 清除过期的临时增益效果
                if (effect.isTempBuff) {
                    const params = effect.skill.params || {};
                    const stats = effect.isPlayer ? this.playerStats : this.opponentStats;
                    if (effect.effectKey === 'buff_element_damage') {
                        const elementType = params[`${effect.effectKey}_element-type`] || 'fire';
                        if (stats.elementDamageBonus) {
                            delete stats.elementDamageBonus[elementType];
                        }
                        this.addLog(`× 属性增伤效果已结束(${this.getElementName(elementType)}系)`, 'text-gray-400');
                    }
                }
                return false;
            }
        });
        
        if (beforeCount !== this.activeEffects.length) {
            this.addLog(`${beforeCount - this.activeEffects.length} 个效果已结束`, 'text-gray-400');
        }
    }
    
    // 完整的效果应用函数（从skill_designer同步）
    applySkillEffect(skill, isPlayer) {
        const effects = skill.effects || (skill.effect ? [skill.effect] : []);
        const params = skill.params || {};
        const count = params.count || 1;
        const duration = params.duration || skill.duration || 0;
        
        effects.forEach(effectKey => {
            // 某些效果不需要效果来源
            const noSourceEffects = ['buff_status_enemy', 'debuff_status_self', 'buff_purify', 'debuff_no_heal'];
            const tempBuffEffects = ['buff_element_damage', 'debuff_element_damage'];
            
            let sourceValue = 0;
            let effectSource = null;
            
            if (!noSourceEffects.includes(effectKey) && !tempBuffEffects.includes(effectKey)) {
                effectSource = params[`${effectKey}_effect-source`];
                if (effectSource) {
                    sourceValue = this.getEffectSourceValue(effectSource, isPlayer);
                    this.addLog(`[${EFFECT_PARAMS_CONFIG[effectKey]?.name || effectKey}] 效果来源: ${Math.round(sourceValue)}`, 'text-yellow-300');
                }
            }
            
            // 应用效果
            this.applySingleEffect(effectKey, sourceValue, count, params, isPlayer, effectSource);
            
            // 如果有持续回合，添加到持续效果列表
            if (duration > 0 && !noSourceEffects.includes(effectKey) && !tempBuffEffects.includes(effectKey)) {
                this.activeEffects.push({
                    effectKey: effectKey,
                    effectSource: effectSource,
                    lockedSourceValue: sourceValue,
                    count: count,
                    skill: skill,
                    remainingTurns: duration,
                    isPlayer: isPlayer
                });
                this.addLog(`→ ${EFFECT_PARAMS_CONFIG[effectKey]?.name} 将持续 ${duration} 回合`, 'text-cyan-300');
            } else if (tempBuffEffects.includes(effectKey) && duration > 0) {
                this.activeEffects.push({
                    effectKey: effectKey,
                    effectSource: null,
                    lockedSourceValue: 0,
                    count: 0,
                    skill: skill,
                    remainingTurns: duration,
                    isPlayer: isPlayer,
                    isTempBuff: true
                });
                this.addLog(`→ ${EFFECT_PARAMS_CONFIG[effectKey]?.name} 将持续 ${duration} 回合`, 'text-cyan-300');
            }
        });
    }
    
    // 应用单个效果（从skill_designer同步并简化）
    applySingleEffect(effectKey, sourceValue, count, params, isPlayer, effectSource) {
        const attackerStats = isPlayer ? this.playerStats : this.opponentStats;
        const defenderStats = isPlayer ? this.opponentStats : this.playerStats;
        const attackerName = isPlayer ? this.playerData.name : this.opponentData.name;
        const defenderName = isPlayer ? this.opponentData.name : this.playerData.name;
        
        // 判断是否基于攻击力
        const isAttackBased = effectSource && effectSource.includes('attack');
        
        switch(effectKey) {
            case 'direct_attack': {
                const bonus = params[`${effectKey}_bonus`] || 1;
                const rawDamage = Math.round(sourceValue * bonus);
                let actualDamage;
                
                if (isAttackBased) {
                    actualDamage = Math.max(1, rawDamage - defenderStats.defense);
                } else {
                    actualDamage = rawDamage;
                }
                
                actualDamage = this.applyElementDamageModifiers(actualDamage, isPlayer);
                defenderStats.hp = Math.max(0, defenderStats.hp - actualDamage);
                attackerStats.turnDamage += actualDamage;
                
                // 同步到旧的health变量
                if (isPlayer) {
                    this.opponentCurrentHealth = defenderStats.hp;
                } else {
                    this.playerCurrentHealth = defenderStats.hp;
                }
                this.addLog(`直接攻击: 造成 ${actualDamage} 点伤害`, 'text-red-300');
                break;
            }
            
            case 'buff_attack': {
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 1;
                const increase = Math.round(sourceValue * bonus);
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.attack += increase;
                    this.addLog(`增攻: ${isPlayer ? '我方' : '敌方'}攻击力 +${increase}`, 'text-green-300');
                }
                break;
            }
            
            case 'buff_defense': {
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 1;
                const increase = Math.round(sourceValue * bonus);
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.defense += increase;
                    this.addLog(`增防: ${isPlayer ? '我方' : '敌方'}防御力 +${increase}`, 'text-green-300');
                }
                break;
            }
            
            case 'multi_attack': {
                // 多段攻击（在applySingleEffect中不执行，在executeAttack中处理）
                this.addLog(`多段攻击效果已在攻击阶段处理`, 'text-gray-400');
                break;
            }
            
            case 'dot_damage': {
                // 附加伤害（在applySingleEffect中不执行，在executeAttack中处理）
                this.addLog(`附加伤害效果已在攻击阶段处理`, 'text-gray-400');
                break;
            }
            
            case 'percent_damage': {
                // 百分比伤害
                const effectSource = params[`${effectKey}_effect-source`] || 'enemy-max-hp';
                const percent = params[`${effectKey}_percent`] || 0.1;
                
                // 获取来源值
                let targetHp = 0;
                if (effectSource === 'enemy-max-hp') {
                    targetHp = defenderStats.maxHp;
                } else if (effectSource === 'enemy-current-hp') {
                    targetHp = defenderStats.hp;
                } else if (effectSource === 'enemy-lost-hp') {
                    targetHp = defenderStats.maxHp - defenderStats.hp;
                } else if (effectSource === 'self-max-hp') {
                    targetHp = attackerStats.maxHp;
                } else if (effectSource === 'self-current-hp') {
                    targetHp = attackerStats.hp;
                }
                
                const damage = Math.round(targetHp * percent);
                defenderStats.hp = Math.max(0, defenderStats.hp - damage);
                attackerStats.turnDamage += damage;
                
                // 同步到旧的health变量
                if (isPlayer) {
                    this.opponentCurrentHealth = defenderStats.hp;
                } else {
                    this.playerCurrentHealth = defenderStats.hp;
                }
                this.addLog(`百分比伤害: 造成 ${damage} 点伤害 (${(percent * 100).toFixed(0)}%)`, 'text-red-300');
                break;
            }
            
            case 'direct_defense': {
                // 直接防御（本回合临时提升）
                const bonus = params[`${effectKey}_bonus`] || 0.3;
                const increase = Math.round(sourceValue * bonus);
                attackerStats.defense += increase;
                this.addLog(`直接防御: ${attackerName}防御力 +${increase}`, 'text-blue-300');
                break;
            }
            
            case 'continuous_defense': {
                // 持续防御（需要配合duration使用）
                const bonus = params[`${effectKey}_bonus`] || 0.3;
                const increase = Math.round(sourceValue * bonus);
                attackerStats.defense += increase;
                this.addLog(`持续防御: ${attackerName}防御力 +${increase}`, 'text-blue-300');
                break;
            }
            
            case 'defense_counter': {
                // 防御反击
                const defenseBonus = params[`${effectKey}_defense-bonus`] || 0.3;
                const counterSource = params[`${effectKey}_counter-effect-source`] || 'self-current-defense';
                const counterBonus = params[`${effectKey}_counter-bonus`] || 0.5;
                
                // 防御加成
                const defenseIncrease = Math.round(sourceValue * defenseBonus);
                attackerStats.defense += defenseIncrease;
                
                // 设置反击buff（将在受到攻击时触发）
                attackerStats.buffs.counter = {
                    value: counterBonus,
                    duration: 1,
                    source: counterSource
                };
                
                this.addLog(`防御反击: ${attackerName}防御力 +${defenseIncrease}，并准备反击`, 'text-blue-300');
                break;
            }
            
            case 'direct_speed': {
                // 直接增速（本回合临时提升）
                const bonus = params[`${effectKey}_bonus`] || 0.3;
                const increase = Math.round(sourceValue * bonus);
                attackerStats.agility += increase;
                this.addLog(`直接增速: ${attackerName}敏捷 +${increase}`, 'text-cyan-300');
                break;
            }
            
            case 'continuous_speed': {
                // 持续增速（需要配合duration使用）
                const bonus = params[`${effectKey}_bonus`] || 0.3;
                const increase = Math.round(sourceValue * bonus);
                attackerStats.agility += increase;
                this.addLog(`持续增速: ${attackerName}敏捷 +${increase}`, 'text-cyan-300');
                break;
            }
            
            case 'heal_direct': {
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 1;
                const heal = Math.round(sourceValue * bonus * count);
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.hp = Math.min(attackerStats.maxHp, attackerStats.hp + heal);
                    
                    // 同步到旧的health变量
                    if (isPlayer) {
                        this.playerCurrentHealth = attackerStats.hp;
                    } else {
                        this.opponentCurrentHealth = attackerStats.hp;
                    }
                    this.addLog(`直接恢复: +${heal} 生命`, 'text-green-300');
                }
                break;
            }
            
            case 'heal_continuous': {
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 1;
                const heal = Math.round(sourceValue * bonus * count);
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.hp = Math.min(attackerStats.maxHp, attackerStats.hp + heal);
                    
                    // 同步到旧的health变量
                    if (isPlayer) {
                        this.playerCurrentHealth = attackerStats.hp;
                    } else {
                        this.opponentCurrentHealth = attackerStats.hp;
                    }
                    this.addLog(`持续恢复: +${heal} 生命`, 'text-green-300');
                }
                break;
            }
            
            case 'heal_percent': {
                const target = params[`${effectKey}_target`];
                const percent = params[`${effectKey}_percent`] || 0.1;
                const heal = Math.round(attackerStats.maxHp * percent);
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.hp = Math.min(attackerStats.maxHp, attackerStats.hp + heal);
                    
                    // 同步到旧的health变量
                    if (isPlayer) {
                        this.playerCurrentHealth = attackerStats.hp;
                    } else {
                        this.opponentCurrentHealth = attackerStats.hp;
                    }
                    this.addLog(`百分比恢复: +${heal} 生命 (${(percent * 100).toFixed(0)}%)`, 'text-green-300');
                }
                break;
            }
            
            case 'heal_rebirth': {
                // 重生效果（在单位即将死亡时触发）
                const target = params[`${effectKey}_target`];
                const percent = params[`${effectKey}_percent`] || 0.3;
                const condition = params[`${effectKey}_rebirth-condition`] || 'on-death';
                
                // 在applySingleEffect中设置重生标记，实际触发在checkBattleEnd中
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.rebirthPercent = percent;
                    this.addLog(`重生准备: ${attackerName}获得重生效果 (${(percent * 100).toFixed(0)}%生命)`, 'text-yellow-300');
                }
                break;
            }
            
            case 'heal_lifesteal': {
                // 生命汲取（在造成伤害后触发）
                // 这个效果在executeAttack中的旧系统buff中已处理
                // 这里作为新系统的补充，可以直接设置buff
                const bonus = params[`${effectKey}_bonus`] || 0.5;
                attackerStats.buffs.lifesteal = { value: bonus, duration: 1 };
                this.addLog(`生命汲取: ${attackerName}伤害转化 ${(bonus * 100).toFixed(0)}% 生命`, 'text-pink-300');
                break;
            }
            
            case 'buff_heal_amp': {
                // 增加治疗量
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.3;
                
                if (target === 'self' || target === 'ally-all') {
                    if (!attackerStats.healAmp) attackerStats.healAmp = 0;
                    attackerStats.healAmp += bonus;
                    this.addLog(`增加治疗量: ${attackerName}治疗效果 +${Math.round(bonus * 100)}%`, 'text-green-300');
                } else if (target === 'enemy-single' || target === 'enemy-all') {
                    if (!defenderStats.healAmp) defenderStats.healAmp = 0;
                    defenderStats.healAmp += bonus;
                    this.addLog(`增加治疗量: ${defenderName}治疗效果 +${Math.round(bonus * 100)}%`, 'text-green-300');
                }
                break;
            }
            
            case 'debuff_element_damage': {
                // 属性减伤
                const target = params[`${effectKey}_target`];
                const elementType = params[`${effectKey}_element-type`] || 'fire';
                const damageReduce = params[`${effectKey}_damage-reduce`] || 0.2;
                
                if (target === 'self' || target === 'ally-all') {
                    if (!attackerStats.elementDamageReduce) attackerStats.elementDamageReduce = {};
                    attackerStats.elementDamageReduce[elementType] =
                        (attackerStats.elementDamageReduce[elementType] || 0) + damageReduce;
                    this.addLog(`属性减伤: ${isPlayer ? '我方' : '敌方'}受${this.getElementName(elementType)}系伤害 -${Math.round(damageReduce * 100)}%`, 'text-blue-300');
                } else if (target === 'enemy-single' || target === 'enemy-all') {
                    if (!defenderStats.elementDamageReduce) defenderStats.elementDamageReduce = {};
                    defenderStats.elementDamageReduce[elementType] =
                        (defenderStats.elementDamageReduce[elementType] || 0) + damageReduce;
                    this.addLog(`属性减伤: ${isPlayer ? '敌方' : '我方'}受${this.getElementName(elementType)}系伤害 -${Math.round(damageReduce * 100)}%`, 'text-blue-300');
                }
                break;
            }
            
            case 'buff_element_damage': {
                const target = params[`${effectKey}_target`];
                const elementType = params[`${effectKey}_element-type`] || 'fire';
                const damageBonus = params[`${effectKey}_damage-bonus`] || 0.2;
                
                if (target === 'self' || target === 'ally-all') {
                    if (!attackerStats.elementDamageBonus) attackerStats.elementDamageBonus = {};
                    attackerStats.elementDamageBonus[elementType] =
                        (attackerStats.elementDamageBonus[elementType] || 0) + damageBonus;
                    this.addLog(`属性增伤: ${isPlayer ? '我方' : '敌方'}对${this.getElementName(elementType)}系伤害 +${Math.round(damageBonus * 100)}%`, 'text-green-300');
                }
                break;
            }
            
            case 'buff_status_enemy': {
                // 为敌方附加异常状态（新格式）
                const statusType = params[`${effectKey}_status-type`] || 'poison';
                const statusChance = params[`${effectKey}_status-chance`] || 100;
                const statusStacks = params[`${effectKey}_status-stacks`] || 1;
                const random = Math.random() * 100;
                
                if (random <= statusChance) {
                    const statusPool = JSON.parse(localStorage.getItem('STATUS_POOL') || '[]');
                    const statusData = statusPool.find(s => s.key === statusType);
                    const statusName = statusData ? statusData.name : statusType;
                    
                    // 查找是否已有此状态
                    const existingStatus = defenderStats.statuses.find(s => s.key === statusType);
                    
                    if (existingStatus) {
                        // 已有状态，增加层数并重置状态持续时间
                        const maxStacks = statusData?.maxStacks || 99;
                        const oldStacks = existingStatus.stackDurations?.length || 0;
                        const durationPerStack = statusData?.durationPerStack || 3;
                        const canAdd = Math.min(maxStacks - oldStacks, statusStacks);
                        
                        // 重置状态持续回合（无论是否能添加新层都刷新状态）
                        const statusDuration = statusData?.isPermanent ? 999 : (statusData?.statusDuration || 10);
                        existingStatus.statusDuration = statusDuration;
                        
                        if (canAdd > 0 && statusData?.hasStacks !== false) {
                            for (let i = 0; i < canAdd; i++) {
                                existingStatus.stackDurations.push(durationPerStack);
                            }
                            
                            this.addLog(`施加异常: ${defenderName} ${statusName} ${oldStacks}→${existingStatus.stackDurations.length}层 (状态已刷新)`, 'text-purple-300');
                            // 立即触发新层的效果
                            if (statusData && statusData.effects) {
                                statusData.effects.forEach(ek => {
                                    this.applyStatusEffect(!isPlayer, existingStatus, ek);
                                });
                            }
                            // 更新UI显示伤害
                            this.updateHealthUI();
                        } else {
                            // 即使达到最大层数，也显示状态刷新信息
                            this.addLog(`施加异常: ${defenderName} ${statusName} 持续时间已刷新 (${oldStacks}层)`, 'text-purple-300');
                        }
                    } else {
                        // 新状态
                        const statusDuration = statusData?.isPermanent ? 999 : (statusData?.statusDuration || 10);
                        const hasStacks = statusData?.hasStacks !== false;
                        
                        const newStatus = {
                            key: statusType,
                            statusDuration: statusDuration,
                            data: statusData
                        };
                        
                        if (hasStacks) {
                            const durationPerStack = statusData?.isStackPermanent ? 999 : (statusData?.durationPerStack || 3);
                            const stackDurations = [];
                            for (let i = 0; i < statusStacks; i++) {
                                stackDurations.push(durationPerStack);
                            }
                            newStatus.stackDurations = stackDurations;
                        }
                        
                        defenderStats.statuses.push(newStatus);
                        this.addLog(`施加异常: ${defenderName}获得 ${statusName}`, 'text-purple-300');
                        
                        // 立即触发状态效果
                        if (statusData && statusData.effects) {
                            statusData.effects.forEach(ek => {
                                this.applyStatusEffect(!isPlayer, newStatus, ek);
                            });
                        }
                        // 更新UI显示伤害
                        this.updateHealthUI();
                    }
                }
                break;
            }
            
            case 'debuff_status_self': {
                // 为自身附加异常状态（新格式）
                const statusType = params[`${effectKey}_status-type`] || 'poison';
                const statusChance = params[`${effectKey}_status-chance`] || 100;
                const statusStacks = params[`${effectKey}_status-stacks`] || 1;
                const random = Math.random() * 100;
                
                if (random <= statusChance) {
                    const statusPool = JSON.parse(localStorage.getItem('STATUS_POOL') || '[]');
                    const statusData = statusPool.find(s => s.key === statusType);
                    const statusName = statusData ? statusData.name : statusType;
                    
                    // 查找是否已有此状态
                    const existingStatus = attackerStats.statuses.find(s => s.key === statusType);
                    
                    if (existingStatus) {
                        // 已有状态，增加层数并重置状态持续时间
                        const maxStacks = statusData?.maxStacks || 99;
                        const oldStacks = existingStatus.stackDurations?.length || 0;
                        const durationPerStack = statusData?.durationPerStack || 3;
                        const canAdd = Math.min(maxStacks - oldStacks, statusStacks);
                        
                        // 重置状态持续回合（无论是否能添加新层都刷新状态）
                        const statusDuration = statusData?.isPermanent ? 999 : (statusData?.statusDuration || 10);
                        existingStatus.statusDuration = statusDuration;
                        
                        if (canAdd > 0 && statusData?.hasStacks !== false) {
                            for (let i = 0; i < canAdd; i++) {
                                existingStatus.stackDurations.push(durationPerStack);
                            }
                            
                            this.addLog(`自身异常: ${attackerName} ${statusName} ${oldStacks}→${existingStatus.stackDurations.length}层 (状态已刷新)`, 'text-purple-300');
                            // 立即触发新层的效果
                            if (statusData && statusData.effects) {
                                statusData.effects.forEach(ek => {
                                    this.applyStatusEffect(isPlayer, existingStatus, ek);
                                });
                            }
                            // 更新UI显示伤害
                            this.updateHealthUI();
                        } else {
                            // 即使达到最大层数，也显示状态刷新信息
                            this.addLog(`自身异常: ${attackerName} ${statusName} 持续时间已刷新 (${oldStacks}层)`, 'text-purple-300');
                        }
                    } else {
                        // 新状态
                        const statusDuration = statusData?.isPermanent ? 999 : (statusData?.statusDuration || 10);
                        const hasStacks = statusData?.hasStacks !== false;
                        
                        const newStatus = {
                            key: statusType,
                            statusDuration: statusDuration,
                            data: statusData
                        };
                        
                        if (hasStacks) {
                            const durationPerStack = statusData?.isStackPermanent ? 999 : (statusData?.durationPerStack || 3);
                            const stackDurations = [];
                            for (let i = 0; i < statusStacks; i++) {
                                stackDurations.push(durationPerStack);
                            }
                            newStatus.stackDurations = stackDurations;
                        }
                        
                        attackerStats.statuses.push(newStatus);
                        this.addLog(`自身异常: ${attackerName}获得 ${statusName}`, 'text-purple-300');
                        
                        // 立即触发状态效果
                        if (statusData && statusData.effects) {
                            statusData.effects.forEach(ek => {
                                this.applyStatusEffect(isPlayer, newStatus, ek);
                            });
                        }
                        // 更新UI显示伤害
                        this.updateHealthUI();
                    }
                }
                break;
            }
            
            case 'buff_purify': {
                // 净化：根据类型和数量清除异常状态
                const target = params[`${effectKey}_target`];
                const purifyType = params[`${effectKey}_purify-type`] || 'all';
                const purifyCount = params[`${effectKey}_purify-count`] || 'all';
                
                if (target === 'self' || target === 'ally-all') {
                    const beforeCount = attackerStats.statuses.length;
                    let targetStatuses = [];
                    
                    // 根据类型筛选要驱散的状态
                    if (purifyType === 'all') {
                        targetStatuses = attackerStats.statuses;
                    } else if (['negative', 'positive', 'neutral'].includes(purifyType)) {
                        // 按状态类型筛选
                        targetStatuses = attackerStats.statuses.filter(s => {
                            const statusType = s.data?.statusType || 'negative';
                            return statusType === purifyType;
                        });
                    } else {
                        // 指定状态key
                        targetStatuses = attackerStats.statuses.filter(s => s.key === purifyType);
                    }
                    
                    // 根据数量驱散（按施加时间从旧到新）
                    let removedCount = 0;
                    if (purifyCount === 'all') {
                        // 移除所有符合条件的状态
                        attackerStats.statuses = attackerStats.statuses.filter(s =>
                            !targetStatuses.includes(s)
                        );
                        removedCount = targetStatuses.length;
                    } else {
                        // 移除指定数量
                        const count = parseInt(purifyCount) || 1;
                        const toRemove = targetStatuses.slice(0, count);
                        attackerStats.statuses = attackerStats.statuses.filter(s =>
                            !toRemove.includes(s)
                        );
                        removedCount = toRemove.length;
                    }
                    
                    // 日志输出
                    if (removedCount > 0) {
                        const typeNames = {
                            'all': '全部',
                            'negative': '负面',
                            'positive': '正面',
                            'neutral': '中性'
                        };
                        const typeName = typeNames[purifyType] || (() => {
                            const statusPool = JSON.parse(localStorage.getItem('STATUS_POOL') || '[]');
                            const status = statusPool.find(s => s.key === purifyType);
                            return status ? status.name : purifyType;
                        })();
                        this.addLog(`净化: 清除${attackerName} ${removedCount} 个${typeName}状态 (共${beforeCount}个)`, 'text-green-300');
                    } else {
                        this.addLog(`净化: 无可清除的目标状态`, 'text-gray-400');
                    }
                }
                break;
            }
            
            case 'debuff_no_heal': {
                // 禁疗
                const target = params[`${effectKey}_target`];
                if (target === 'enemy-single' || target === 'enemy-all') {
                    if (!defenderStats.status.includes('no-heal')) {
                        defenderStats.status.push('no-heal');
                        this.addLog(`禁疗: ${defenderName}无法恢复生命`, 'text-purple-300');
                    }
                }
                break;
            }
            
            case 'debuff_heal_reduce': {
                // 减疗
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.5;
                if (target === 'enemy-single' || target === 'enemy-all') {
                    if (!defenderStats.status.includes('heal-reduce')) {
                        defenderStats.status.push('heal-reduce');
                        this.addLog(`减疗: ${defenderName}治疗效果降低 ${Math.round(bonus * 100)}%`, 'text-purple-300');
                    }
                }
                break;
            }
            
            case 'debuff_hp_cost': {
                // 扣血（生命燃烧等技能）
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.1;
                const hpCost = Math.round(sourceValue * bonus);
                
                if (target === 'self' || target === 'ally-all') {
                    // 扣除自己的生命
                    attackerStats.hp = Math.max(1, attackerStats.hp - hpCost); // 至少保留1点生命
                    
                    // 同步到旧的health变量
                    if (isPlayer) {
                        this.playerCurrentHealth = attackerStats.hp;
                    } else {
                        this.opponentCurrentHealth = attackerStats.hp;
                    }
                    this.addLog(`扣血: ${attackerName}消耗 ${hpCost} 点生命`, 'text-orange-300');
                } else if (target === 'enemy-single' || target === 'enemy-all') {
                    // 扣除敌人的生命
                    defenderStats.hp = Math.max(0, defenderStats.hp - hpCost);
                    
                    // 同步到旧的health变量
                    if (isPlayer) {
                        this.opponentCurrentHealth = defenderStats.hp;
                    } else {
                        this.playerCurrentHealth = defenderStats.hp;
                    }
                    this.addLog(`扣血: ${defenderName}失去 ${hpCost} 点生命`, 'text-red-300');
                }
                break;
            }
            
            case 'debuff_attack': {
                // 减攻
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.1;
                const decrease = Math.round(sourceValue * bonus);
                
                if (target === 'enemy-single' || target === 'enemy-all') {
                    defenderStats.attack = Math.max(0, defenderStats.attack - decrease);
                    this.addLog(`减攻: ${defenderName}攻击力 -${decrease}`, 'text-purple-300');
                } else if (target === 'self' || target === 'ally-all') {
                    attackerStats.attack = Math.max(0, attackerStats.attack - decrease);
                    this.addLog(`减攻: ${attackerName}攻击力 -${decrease}`, 'text-purple-300');
                }
                break;
            }
            
            case 'debuff_defense': {
                // 减防
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.1;
                const decrease = Math.round(sourceValue * bonus);
                
                if (target === 'enemy-single' || target === 'enemy-all') {
                    defenderStats.defense = Math.max(0, defenderStats.defense - decrease);
                    this.addLog(`减防: ${defenderName}防御力 -${decrease}`, 'text-purple-300');
                } else if (target === 'self' || target === 'ally-all') {
                    attackerStats.defense = Math.max(0, attackerStats.defense - decrease);
                    this.addLog(`减防: ${attackerName}防御力 -${decrease}`, 'text-purple-300');
                }
                break;
            }
            
            case 'debuff_speed': {
                // 减速
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.1;
                const decrease = Math.round(sourceValue * bonus);
                
                if (target === 'enemy-single' || target === 'enemy-all') {
                    defenderStats.agility = Math.max(0, defenderStats.agility - decrease);
                    this.addLog(`减速: ${defenderName}敏捷 -${decrease}`, 'text-purple-300');
                } else if (target === 'self' || target === 'ally-all') {
                    attackerStats.agility = Math.max(0, attackerStats.agility - decrease);
                    this.addLog(`减速: ${attackerName}敏捷 -${decrease}`, 'text-purple-300');
                }
                break;
            }
            
            case 'buff_speed': {
                // 增速
                const target = params[`${effectKey}_target`];
                const bonus = params[`${effectKey}_bonus`] || 0.1;
                const increase = Math.round(sourceValue * bonus);
                
                if (target === 'self' || target === 'ally-all') {
                    attackerStats.agility += increase;
                    this.addLog(`增速: ${attackerName}敏捷 +${increase}`, 'text-green-300');
                } else if (target === 'enemy-single' || target === 'enemy-all') {
                    defenderStats.agility += increase;
                    this.addLog(`增速: ${defenderName}敏捷 +${increase}`, 'text-green-300');
                }
                break;
            }
            
            // 其他效果默认处理
            default:
                if (EFFECT_PARAMS_CONFIG[effectKey]) {
                    this.addLog(`[${EFFECT_PARAMS_CONFIG[effectKey].name}] 效果触发`, 'text-gray-400');
                }
        }
    }
    
    // 新增：根据效果类型高亮技能
    async highlightSkillByEffect(side, effectType) {
        const containerId = side === 'player' ? 'player-skill-slots' : 'opponent-skill-slots';
        const animalData = side === 'player' ? this.playerData : this.opponentData;
        
        // 读取技能池以获取自定义技能信息
        const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
        
        // 获取装备的技能列表
        let equippedSkills = [];
        if (animalData.combatSkills) {
            if (Array.isArray(animalData.combatSkills)) {
                equippedSkills = animalData.combatSkills;
            } else if (animalData.combatSkills.equipped) {
                equippedSkills = animalData.combatSkills.equipped;
            }
        }
        
        // 查找具有该效果的技能
        equippedSkills.forEach((skillKey, index) => {
            // 从技能池中查找技能
            let skill = null;
            if (skillKey) {
                const customSkill = skillPool.find(s => s.key === skillKey);
                if (customSkill) {
                    // 兼容新旧格式
                    const effects = customSkill.effects || (customSkill.effect ? [customSkill.effect] : []);
                    skill = {
                        effects: effects,
                        effect: customSkill.effect  // 保留向后兼容
                    };
                }
            } else if (skill && !skill.effects && skill.effect) {
                // 为预定义技能添加effects数组
                skill.effects = [skill.effect];
            }
            
            // 检查技能是否包含指定效果（支持多效果）
            const hasEffect = skill && (
                (skill.effects && skill.effects.includes(effectType)) ||
                skill.effect === effectType
            );
            
            if (hasEffect) {
                const slotElement = document.getElementById(`${containerId}-slot-${index}`);
                if (slotElement) {
                    slotElement.classList.add('skill-triggered');
                    setTimeout(() => {
                        slotElement.classList.remove('skill-triggered');
                    }, 600);
                }
            }
        });
    }
    
    // 触发状态技能（回合开始时自动释放）
    async triggerStatusSkills(isPlayer) {
        // 手动模式下不自动触发任何技能
        if (this.isManualMode) {
            return;
        }
        
        const attackerName = isPlayer ? this.playerData.name : this.opponentData.name;
        const attackerSkills = isPlayer ? this.playerPassiveSkills : this.opponentPassiveSkills;
        
        // 查找所有包含状态效果的技能
        const statusSkills = attackerSkills.filter(skill => {
            const skillEffects = skill.effects || (skill.effect ? [skill.effect] : []);
            return skillEffects.some(e => ['buff_status_enemy', 'debuff_status_self'].includes(e));
        });
        
        if (statusSkills.length === 0) return;
        
        this.addLog(`━ ${attackerName} 检查状态技能`, 'text-cyan-300');
        
        // 触发每个不在冷却中的状态技能
        for (const skill of statusSkills) {
            // 检查技能是否在冷却中
            if (this.isSkillOnCooldown(skill.key, isPlayer)) {
                this.addLog(`⏳ [${skill.name}] 冷却中，跳过`, 'text-gray-400');
                continue;
            }
            
            // 释放技能
            await this.triggerSkillEffect(skill, isPlayer, '状态技能');
            
            // 应用技能效果
            this.applySkillEffect(skill, isPlayer);
            
            // 设置冷却
            if (skill.cooldown) {
                this.setSkillCooldown(skill.key, skill.cooldown, isPlayer);
            }
            
            await this.sleep(500);
        }
    }
    
    // ========== 新的状态系统核心函数 ==========
    
    // 重置属性到基础值（调用全局函数）
    resetAttributesToBase() {
        const battleState = {
            self: this.playerStats,
            enemy: this.opponentStats
        };
        window.resetAttributesToBase(battleState);
    }
    
    // 递减状态持续时间（调用全局函数）
    decreaseStatusDurations(isPlayer) {
        const battleState = {
            self: this.playerStats,
            enemy: this.opponentStats
        };
        const target = isPlayer ? 'self' : 'enemy';
        window.decreaseStatusDurations(target, battleState, (msg, color) => {
            this.addLog(msg, `text-${color}-300`);
        });
    }
    
    // 处理状态效果（调用全局函数）
    processStatuses(isPlayer) {
        const battleState = {
            self: this.playerStats,
            enemy: this.opponentStats
        };
        const target = isPlayer ? 'self' : 'enemy';
        window.processStatuses(target, battleState,
            (msg, color) => this.addLog(msg, `text-${color}-300`),
            (t, s, e, state, log) => window.applyStatusEffect(t, s, e, state, log)
        );
        // 同步hp到旧变量（全局函数已修改hp）
        this.playerCurrentHealth = this.playerStats.hp;
        this.opponentCurrentHealth = this.opponentStats.hp;
        // 更新状态图标显示（状态可能已被移除）
        this.updateBuffIcons();
        // 更新UI显示状态造成的伤害
        this.updateHealthUI();
    }
    
    // 应用状态效果（适配层，调用全局函数）
    applyStatusEffect(isPlayer, status, effectKey) {
        const battleState = {
            self: this.playerStats,
            enemy: this.opponentStats
        };
        const target = isPlayer ? 'self' : 'enemy';
        
        // 调用全局函数，并传入特殊的addLog适配器来同步旧变量
        window.applyStatusEffect(target, status, effectKey, battleState, (msg, color) => {
            this.addLog(msg, `text-${color}-300`);
        });
        
        // 同步hp到旧变量（全局函数已修改hp）
        this.playerCurrentHealth = this.playerStats.hp;
        this.opponentCurrentHealth = this.opponentStats.hp;
    }
    
    // 获取状态显示信息（调用全局函数）
    getStatusDisplay(statusKey) {
        return window.getStatusDisplay(statusKey);
    }
    
    // ========== 联赛比分显示系统 ==========
    
    // 初始化联赛比分显示
    initLeagueScoreDisplay(queueData) {
        const scoreDisplay = document.getElementById('league-score-display');
        if (!scoreDisplay) return;
        
        scoreDisplay.style.display = 'block';
        
        // 生成5个比分圈
        this.renderScoreCircles(queueData);
    }
    
    // 渲染比分圈
    renderScoreCircles(queueData) {
        const playerCircles = document.getElementById('player-score-circles');
        const opponentCircles = document.getElementById('opponent-score-circles');
        
        if (!playerCircles || !opponentCircles) return;
        
        playerCircles.innerHTML = '';
        opponentCircles.innerHTML = '';
        
        // 判断比赛是否已经结束（提前结束或打满5场）
        const isMatchFinished = queueData.playerWins >= 3 || queueData.opponentWins >= 3 || queueData.currentBattle >= 5;
        
        // 创建5个圈
        for (let i = 0; i < 5; i++) {
            // 我方圈
            const playerCircle = document.createElement('div');
            playerCircle.className = 'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold';
            
            if (i < queueData.currentBattle) {
                // 已完成的比赛
                const matchResult = this.getMatchResult(queueData, i);
                if (matchResult === 'win') {
                    playerCircle.className += ' bg-green-500 border-green-400 text-white';
                    playerCircle.textContent = '✓';
                } else {
                    playerCircle.className += ' bg-red-500/30 border-red-500 text-red-300';
                    playerCircle.textContent = '×';
                }
            } else if (i === queueData.currentBattle && !isMatchFinished) {
                // 当前进行的比赛（仅在比赛未结束时显示脉动）
                playerCircle.className += ' bg-blue-500/50 border-blue-400 animate-pulse';
            } else {
                // 未进行的比赛
                playerCircle.className += ' bg-gray-700 border-gray-600';
            }
            
            playerCircles.appendChild(playerCircle);
            
            // 对方圈
            const opponentCircle = document.createElement('div');
            opponentCircle.className = 'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold';
            
            if (i < queueData.currentBattle) {
                // 已完成的比赛
                const matchResult = this.getMatchResult(queueData, i);
                if (matchResult === 'loss') {
                    opponentCircle.className += ' bg-green-500 border-green-400 text-white';
                    opponentCircle.textContent = '✓';
                } else {
                    opponentCircle.className += ' bg-red-500/30 border-red-500 text-red-300';
                    opponentCircle.textContent = '×';
                }
            } else if (i === queueData.currentBattle && !isMatchFinished) {
                // 当前进行的比赛（仅在比赛未结束时显示脉动）
                opponentCircle.className += ' bg-red-500/50 border-red-400 animate-pulse';
            } else {
                // 未进行的比赛
                opponentCircle.className += ' bg-gray-700 border-gray-600';
            }
            
            opponentCircles.appendChild(opponentCircle);
        }
    }
    
    // 获取某场比赛的结果
    getMatchResult(queueData, matchIndex) {
        // 根据当前战斗索引和胜负次数推断每场比赛的结果
        // 这里需要从queueData中重建比赛历史
        if (!queueData.matchHistory) {
            queueData.matchHistory = [];
        }
        
        return queueData.matchHistory[matchIndex] || null;
    }
    
}