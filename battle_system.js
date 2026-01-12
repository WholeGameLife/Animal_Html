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
    'buff_status_enemy': { name: '为敌方附加异常', params: ['status-type', 'status-chance'] },
    'buff_purify': { name: '净化', params: ['target', 'purify-type'] },
    'buff_heal_amp': { name: '增加治疗量', params: ['effect-source', 'target', 'bonus'] },
    'buff_element_damage': { name: '属性增伤', params: ['target', 'element-type', 'damage-bonus'] },
    'debuff_attack': { name: '减攻', params: ['effect-source', 'target', 'bonus'] },
    'debuff_defense': { name: '减防', params: ['effect-source', 'target', 'bonus'] },
    'debuff_speed': { name: '减速', params: ['effect-source', 'target', 'bonus'] },
    'debuff_status_self': { name: '为自身附加异常', params: ['status-type', 'status-chance'] },
    'debuff_no_heal': { name: '禁疗', params: ['target'] },
    'debuff_heal_reduce': { name: '减疗', params: ['effect-source', 'target', 'bonus'] },
    'debuff_element_damage': { name: '属性减伤', params: ['target', 'element-type', 'damage-reduce'] },
    'heal_direct': { name: '直接恢复', params: ['effect-source', 'target', 'bonus'] },
    'heal_continuous': { name: '持续恢复', params: ['effect-source', 'target', 'bonus'] },
    'heal_percent': { name: '百分比恢复', params: ['effect-source', 'target', 'percent'] },
    'heal_rebirth': { name: '重生', params: ['effect-source', 'target', 'percent', 'rebirth-condition'] },
    'heal_lifesteal': { name: '生命汲取', params: ['effect-source', 'bonus'] }
};

// 战斗技能配置
const COMBAT_SKILLS = {
    'POWER_STRIKE': { name: '力量打击', icon: '💥', type: 'attack', desc: '造成150%攻击力的伤害', effect: 'damage', value: 1.5, cooldown: 3 },
    'SHIELD_BASH': { name: '盾击', icon: '🛡️', type: 'defense', desc: '提升50%防御并反击', effect: 'defense_counter', value: 0.5, cooldown: 4 },
    'QUICK_SLASH': { name: '疾风斩', icon: '⚡', type: 'agility', desc: '连续攻击2次，每次70%伤害', effect: 'multi_attack', value: 0.7, count: 2, cooldown: 2 },
    'BERSERKER': { name: '狂暴', icon: '😡', type: 'buff', desc: '攻击力提升30%，持续3回合', effect: 'buff_attack', value: 0.3, duration: 3, cooldown: 5 },
    'IRON_WALL': { name: '铁壁', icon: '🏰', type: 'defense', desc: '防御力提升50%，持续2回合', effect: 'buff_defense', value: 0.5, duration: 2, cooldown: 4 },
    'DODGE': { name: '闪避', icon: '💨', type: 'agility', desc: '下次攻击必定闪避', effect: 'guaranteed_dodge', value: 1, cooldown: 3 },
    'CRITICAL_HIT': { name: '致命一击', icon: '🎯', type: 'attack', desc: '造成200%暴击伤害', effect: 'critical', value: 2.0, cooldown: 5 },
    'LIFE_STEAL': { name: '生命汲取', icon: '🩸', type: 'attack', desc: '攻击回复50%伤害的生命', effect: 'lifesteal', value: 0.5, cooldown: 4 },
    'COUNTER': { name: '反击', icon: '↩️', type: 'defense', desc: '受到攻击时反击100%伤害', effect: 'counter', value: 1.0, cooldown: 3 },
    'SPEED_BOOST': { name: '加速', icon: '🚀', type: 'agility', desc: '敏捷提升40%，持续2回合', effect: 'buff_agility', value: 0.4, duration: 2, cooldown: 3 }
};

// 变异技能配置
const MUTATION_SKILLS = {
    'MUT_DARK_POWER': { name: '暗黑之力', icon: '🖤', desc: '攻击力+15%', effect: 'passive_attack', value: 0.15 },
    'MUT_LIGHT_HEAL': { name: '光明治愈', icon: '🤍', desc: '每回合恢复5%生命', effect: 'regen', value: 0.05 },
    'MUT_CRYSTAL_SHIELD': { name: '晶体护盾', icon: '💎', desc: '防御力+20%', effect: 'passive_defense', value: 0.2 },
    'MUT_SHADOW_SPEED': { name: '影之疾行', icon: '👤', desc: '敏捷+25%', effect: 'passive_agility', value: 0.25 },
    'MUT_THUNDER_STRIKE': { name: '雷霆一击', icon: '⚡', desc: '攻击附加30%雷电伤害', effect: 'bonus_damage', value: 0.3 },
    'MUT_LIGHTNING_SPEED': { name: '闪电疾驰', icon: '⚡', desc: '敏捷+30%', effect: 'passive_agility', value: 0.3 },
    'MUT_HOLY_HEAL': { name: '圣光治疗', icon: '✨', desc: '每回合恢复8%生命', effect: 'regen', value: 0.08 },
    'MUT_HEAL_REDUCE': { name: '治疗削弱', icon: '✨', desc: '敌方治疗效果-50%', effect: 'heal_reduce', value: 0.5 },
    'MUT_DAMAGE_AMP': { name: '伤害增幅', icon: '🔮', desc: '造成伤害+25%', effect: 'damage_amp', value: 0.25 },
    'MUT_DEFENSE_AMP': { name: '防御增幅', icon: '🔮', desc: '受到伤害-20%', effect: 'damage_reduction', value: 0.2 },
    'MUT_PERCENT_DAMAGE': { name: '百分比伤害', icon: '🌑', desc: '攻击造成敌方5%最大生命伤害', effect: 'percent_damage', value: 0.05 },
    'MUT_LIFE_DRAIN': { name: '生命汲取', icon: '🌑', desc: '攻击回复50%伤害生命', effect: 'lifesteal', value: 0.5 },
    'MUT_ANNIHILATE': { name: '湮灭打击', icon: '💀', desc: '攻击力+40%，无视30%防御', effect: 'armor_pierce', value: 0.3, attackBonus: 0.4 },
    'MUT_VOID_PIERCE': { name: '虚空穿刺', icon: '💀', desc: '攻击附加20%真实伤害', effect: 'true_damage', value: 0.2 },
    'MUT_VOID_STRIKE': { name: '虚空打击', icon: '🌀', desc: '攻击无视50%防御', effect: 'armor_pierce', value: 0.5 },
    'MUT_TEAM_SHIELD': { name: '团队护盾', icon: '🌀', desc: '队伍全体防御+20%', effect: 'passive_defense', value: 0.2 },
    'MUT_REBIRTH': { name: '轮回重生', icon: '♻️', desc: '濒死时恢复30%生命(一次)', effect: 'rebirth', value: 0.3 },
    'MUT_PHOENIX_FLAME': { name: '凤凰之焰', icon: '♻️', desc: '攻击附加灼烧效果，持续3回合', effect: 'burn', value: 0.1, duration: 3 }
};

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
            status: [],
            element: playerData.element || 'water',
            elementDamageBonus: {},
            buffs: {}, // 存储buff效果
            activeSkills: [], // 存储当前生效的技能key
            skillCooldowns: {} // 存储技能冷却时间 {skillKey: remainingTurns}
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
            status: [],
            element: opponentData.element || 'fire',
            elementDamageReduce: {},
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
        this.turnCount = 0;
        
        // UI元素
        this.ui = {
            battleLog: document.getElementById('battle-log'),
            playerCard: document.getElementById('player-card'),
            opponentCard: document.getElementById('opponent-card'),
            btnStartBattle: document.getElementById('btn-start-battle'),
            btnFlee: document.getElementById('btn-flee'),
            playerTurnIndicator: document.getElementById('player-turn-indicator'),
            opponentTurnIndicator: document.getElementById('opponent-turn-indicator')
        };
    }

    init() {
        this.renderPlayerInfo();
        this.renderOpponentInfo();
        this.renderPlayerSkillSlots();
        this.renderOpponentSkillSlots();
        this.setupEventListeners();
    }

    renderPlayerInfo() {
        document.getElementById('player-name').textContent = this.playerData.name;
        document.getElementById('player-level').textContent = `Lv. ${this.playerData.level}`;
        const playerAvatar = document.getElementById('player-avatar');
        playerAvatar.style.backgroundColor = '#' + this.playerData.color.toString(16).padStart(6, '0');
        playerAvatar.textContent = this.playerData.name.charAt(0).toUpperCase();
        document.getElementById('player-health-bar').style.width = '100%';
        document.getElementById('player-health-text').textContent = `${this.playerCurrentHealth} / ${this.playerData.stamina}`;
        document.getElementById('player-atk').textContent = this.playerStats.attack;
        document.getElementById('player-def').textContent = this.playerStats.defense;
        document.getElementById('player-agi').textContent = this.playerStats.agility;
        
        // 初始化异常状态显示
        this.updateStatusUI();
    }

    renderOpponentInfo() {
        document.getElementById('opponent-name').textContent = this.opponentData.name;
        document.getElementById('opponent-level').textContent = `Lv. ${this.opponentData.level}`;
        const opponentAvatar = document.getElementById('opponent-avatar');
        opponentAvatar.style.backgroundColor = '#' + this.opponentData.color.toString(16).padStart(6, '0');
        opponentAvatar.textContent = this.opponentData.name.charAt(0).toUpperCase();
        document.getElementById('opponent-health-bar').style.width = '100%';
        document.getElementById('opponent-health-text').textContent = `${this.opponentCurrentHealth} / ${this.opponentData.stamina}`;
        document.getElementById('opponent-atk').textContent = this.opponentStats.attack;
        document.getElementById('opponent-def').textContent = this.opponentStats.defense;
        document.getElementById('opponent-agi').textContent = this.opponentStats.agility;
        
        // 初始化异常状态显示
        this.updateStatusUI();
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
                    skill = {
                        name: customSkill.name,
                        icon: customSkill.icon,
                        desc: customSkill.desc,
                        cooldown: customSkill.cooldown || 0
                    };
                }
            }
            
            const slotDiv = document.createElement('div');
            
            if (skill) {
                const isMutationSkill = !!MUTATION_SKILLS[skillKey];
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
        this.ui.btnStartBattle.addEventListener('click', () => this.startBattle());
        this.ui.btnFlee.addEventListener('click', () => this.flee());
    }

    async startBattle() {
        if (this.battleInProgress) return;
        
        this.battleInProgress = true;
        this.ui.btnStartBattle.disabled = true;
        this.ui.btnStartBattle.textContent = '战斗中...';
        this.addLog('⚔️ 战斗开始！双方进入战斗状态！');
        
        await this.sleep(2000);
        await this.battleLoop();
    }

    async battleLoop() {
        while (this.battleInProgress) {
            this.turnCount++;
            
            // 根据敏捷值决定出手顺序
            const playerAgi = this.getEffectiveStat(this.playerStats, 'agility');
            const opponentAgi = this.getEffectiveStat(this.opponentStats, 'agility');
            
            let firstAttacker, secondAttacker;
            if (playerAgi >= opponentAgi) {
                firstAttacker = 'player';
                secondAttacker = 'opponent';
            } else {
                firstAttacker = 'opponent';
                secondAttacker = 'player';
            }
            
            this.addLog(`\n━━━ 第 ${this.turnCount} 回合 ━━━`, 'text-cyan-400 font-bold');
            await this.sleep(1000);
            
            // 第一个攻击者行动
            const firstName = firstAttacker === 'player' ? this.playerData.name : this.opponentData.name;
            this.addLog(`${firstName} 先手出击！`, 'text-blue-300');
            await this.sleep(800);
            
            await this.executeTurn(firstAttacker);
            if (!this.battleInProgress) break;
            
            await this.sleep(1500);
            
            // 第二个攻击者行动
            const secondName = secondAttacker === 'player' ? this.playerData.name : this.opponentData.name;
            this.addLog(`${secondName} 反击！`, 'text-orange-300');
            await this.sleep(800);
            
            await this.executeTurn(secondAttacker);
            if (!this.battleInProgress) break;
            
            // 更新buff持续时间
            this.updateBuffs();
            
            // 处理持续效果
            this.processContinuousEffects();
            
            // 同步hp到旧的health变量
            this.playerCurrentHealth = this.playerStats.hp;
            this.opponentCurrentHealth = this.opponentStats.hp;
            this.updateHealthUI();
            
            await this.sleep(2000);
        }
    }

    async executeTurn(attacker) {
        const isPlayer = attacker === 'player';
        const attackerData = isPlayer ? this.playerData : this.opponentData;
        const attackerStats = isPlayer ? this.playerStats : this.opponentStats;
        const defenderStats = isPlayer ? this.opponentStats : this.playerStats;
        
        // 显示回合指示器
        this.showTurnIndicator(isPlayer);
        
        // 只执行攻击，防御改为技能触发
        await this.executeAttack(isPlayer);
        
        // 隐藏回合指示器
        this.hideTurnIndicator(isPlayer);
    }

    async executeAttack(isPlayer) {
        const attackerName = isPlayer ? this.playerData.name : this.opponentData.name;
        const defenderName = isPlayer ? this.opponentData.name : this.playerData.name;
        const attackerStats = isPlayer ? this.playerStats : this.opponentStats;
        const defenderStats = isPlayer ? this.opponentStats : this.playerStats;
        
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
        const defense = this.getEffectiveStat(defenderStats, 'defense');
        const baseDamage = Math.max(1, Math.floor(baseAttack - defense));
        
        // 触发所有攻击相关的技能（检查冷却）
        for (const skill of attackerSkills) {
            // 获取技能的所有类型和效果（支持多类型多效果）
            const skillTypes = skill.types || (skill.type ? [skill.type] : []);
            const skillEffects = skill.effects || (skill.effect ? [skill.effect] : []);
            
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
                
                // 跳过非攻击效果
                if (['buff_attack', 'buff_defense', 'buff_speed', 'buff_purify',
                     'buff_heal_amp', 'debuff_attack', 'debuff_defense', 'debuff_speed',
                     'debuff_no_heal', 'debuff_heal_reduce', 'heal_direct', 'heal_continuous',
                     'heal_percent', 'heal_rebirth'].includes(effect)) {
                    continue;
                }
                
                const attackBonus = params.attackBonus || skill.value || 0;
                const multiBonus = params.multiBonus || [];
                const count = params.count || 1;
                
                if (effect === 'direct_attack' && attackBonus) {
                    // 直接攻击：attackBonus是固定伤害值
                    effectDamage = Math.floor(attackBonus);
                    damageType = 'direct';
                } else if (effect === 'multi_attack' && (multiBonus.length > 0 || count > 1)) {
                    // 多段攻击：计算所有段的总伤害
                    let hitDamages = [];
                    let hitCount = count;
                    
                    if (multiBonus.length > 0) {
                        if (multiBonus.length === 1) {
                            for (let i = 0; i < count; i++) {
                                hitDamages.push(Math.floor(baseDamage * multiBonus[0]));
                            }
                            hitCount = count;
                        } else {
                            for (let i = 0; i < count && i < multiBonus.length; i++) {
                                hitDamages.push(Math.floor(baseDamage * multiBonus[i]));
                            }
                            hitCount = Math.min(count, multiBonus.length);
                        }
                    } else {
                        for (let i = 0; i < count; i++) {
                            hitDamages.push(baseDamage);
                        }
                    }
                    
                    effectDamage = hitDamages.reduce((sum, dmg) => sum + dmg, 0);
                    damageType = 'multi';
                    damageInfoList.push({
                        type: 'multi',
                        damage: effectDamage,
                        hitCount: hitCount,
                        hitDamages: hitDamages
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
                } else if (effect === 'dot_damage' && attackBonus) {
                    effectDamage = Math.floor(baseAttack * attackBonus);
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
            
            // 如果这个技能造成了伤害，显示技能效果
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
                
                // 设置冷却
                if (skill.cooldown) {
                    this.setSkillCooldown(skill.key, skill.cooldown, isPlayer);
                }
            }
        }
        
        // 最终伤害就是所有技能伤害的总和
        let damage = Math.max(1, totalDamage);
        
        // 应用伤害
        if (isPlayer) {
            this.opponentCurrentHealth = Math.max(0, this.opponentCurrentHealth - damage);
            this.shakeCard(false);
        } else {
            this.playerCurrentHealth = Math.max(0, this.playerCurrentHealth - damage);
            this.shakeCard(true);
        }
        
        // 显示伤害信息
        const critText = isCriticalHit ? '💥 暴击！' : '';
        this.addLog(`${critText}${attackerName} 对 ${defenderName} 造成 ${damage} 点伤害！`, isCriticalHit ? 'text-red-400 font-bold' : 'text-red-300');
        await this.sleep(1000);
        
        // 生命汲取效果
        if (attackerStats.buffs.lifesteal) {
            const heal = Math.floor(damage * 0.5);
            if (isPlayer) {
                this.playerCurrentHealth = Math.min(this.playerData.stamina, this.playerCurrentHealth + heal);
            } else {
                this.opponentCurrentHealth = Math.min(this.opponentData.stamina, this.opponentCurrentHealth + heal);
            }
            this.addLog(`${attackerName} 汲取了 ${heal} 点生命值！🩸`, 'text-pink-300');
            await this.sleep(800);
        }
        
        // 反击效果
        if (defenderStats.buffs.counter) {
            // 高亮反击技能
            await this.highlightSkillByEffect(isPlayer ? 'opponent' : 'player', 'counter');
            
            const counterDamage = Math.floor(damage * 0.5);
            if (isPlayer) {
                this.opponentCurrentHealth = Math.max(0, this.opponentCurrentHealth - counterDamage);
            } else {
                this.playerCurrentHealth = Math.max(0, this.playerCurrentHealth - counterDamage);
            }
            this.addLog(`${defenderName} 发动反击，造成 ${counterDamage} 点伤害！↩️`, 'text-purple-300');
            await this.sleep(800);
        }
        
        this.updateHealthUI();
        await this.checkBattleEnd();
    }

    async triggerDefenseSkills(isDefender) {
        const defenderName = isDefender ? this.playerData.name : this.opponentData.name;
        const defenderStats = isDefender ? this.playerStats : this.opponentStats;
        const defenderCard = isDefender ? this.ui.playerCard : this.ui.opponentCard;
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
                defenderCard.classList.add('animate-defend');
                await this.sleep(500);
                defenderCard.classList.remove('animate-defend');
                
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
        
        // 找到并高亮对应的技能槽
        const containerId = isPlayer ? 'player-skill-slots' : 'opponent-skill-slots';
        const stats = isPlayer ? this.playerStats : this.opponentStats;
        const container = document.getElementById(containerId);
        if (!container) return;
        
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
            const slotElement = document.getElementById(`${containerId}-slot-${skillIndex}`);
            if (slotElement) {
                // 触发动画
                slotElement.classList.add('skill-triggered');
                await this.sleep(600);
                slotElement.classList.remove('skill-triggered');
                
                // 如果是有持续时间的buff技能，添加持续高亮
                if (skill.duration && skill.duration > 0) {
                    // 记录技能生效
                    if (!stats.activeSkills.includes(skill.key)) {
                        stats.activeSkills.push(skill.key);
                    }
                    slotElement.classList.add('skill-active');
                    
                    // 在buff中记录技能key和槽位索引，用于后续移除高亮
                    const buffKey = `buff_${skill.effect.split('_')[1] || skill.effect}`;
                    if (stats.buffs[buffKey]) {
                        stats.buffs[buffKey].skillKey = skill.key;
                        stats.buffs[buffKey].slotIndex = skillIndex;
                        stats.buffs[buffKey].containerId = containerId;
                    }
                }
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
        if (isPlayer) {
            this.ui.playerTurnIndicator.style.display = 'block';
        } else {
            this.ui.opponentTurnIndicator.style.display = 'block';
        }
    }

    hideTurnIndicator(isPlayer) {
        if (isPlayer) {
            this.ui.playerTurnIndicator.style.display = 'none';
        } else {
            this.ui.opponentTurnIndicator.style.display = 'none';
        }
    }

    shakeCard(isPlayer) {
        const card = isPlayer ? this.ui.playerCard : this.ui.opponentCard;
        card.classList.add('animate-shake');
        setTimeout(() => {
            card.classList.remove('animate-shake');
        }, 300);
    }

    updateHealthUI() {
        // 更新玩家血条
        const playerHealthPercent = Math.max(0, (this.playerCurrentHealth / this.playerData.stamina) * 100);
        document.getElementById('player-health-bar').style.width = `${playerHealthPercent}%`;
        document.getElementById('player-health-text').textContent = `${this.playerCurrentHealth} / ${this.playerData.stamina}`;

        // 更新对手血条
        const opponentHealthPercent = Math.max(0, (this.opponentCurrentHealth / this.opponentData.stamina) * 100);
        document.getElementById('opponent-health-bar').style.width = `${opponentHealthPercent}%`;
        document.getElementById('opponent-health-text').textContent = `${this.opponentCurrentHealth} / ${this.opponentData.stamina}`;
        
        // 更新异常状态显示
        this.updateStatusUI();
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
    
    // 更新异常状态UI
    updateStatusUI() {
        const statusNames = this.getStatusNames();
        
        // 更新玩家异常状态
        const playerStatusEl = document.getElementById('player-status');
        if (playerStatusEl) {
            if (this.playerStats.status.length === 0) {
                playerStatusEl.innerHTML = '<span class="text-xs text-gray-500">无</span>';
            } else {
                playerStatusEl.innerHTML = this.playerStats.status.map(s =>
                    `<span class="bg-red-500/30 text-red-300 px-2 py-0.5 rounded text-xs">${statusNames[s] || s}</span>`
                ).join('');
            }
        }
        
        // 更新敌方异常状态
        const opponentStatusEl = document.getElementById('opponent-status');
        if (opponentStatusEl) {
            if (this.opponentStats.status.length === 0) {
                opponentStatusEl.innerHTML = '<span class="text-xs text-gray-500">无</span>';
            } else {
                opponentStatusEl.innerHTML = this.opponentStats.status.map(s =>
                    `<span class="bg-red-500/30 text-red-300 px-2 py-0.5 rounded text-xs">${statusNames[s] || s}</span>`
                ).join('');
            }
        }
    }

    async checkBattleEnd() {
        if (this.opponentCurrentHealth <= 0) {
            this.battleInProgress = false;
            await this.handleVictory();
            return true;
        }
        if (this.playerCurrentHealth <= 0) {
            this.battleInProgress = false;
            await this.handleDefeat();
            return true;
        }
        return false;
    }

    async handleVictory() {
        this.addLog(`\n🎉 胜利！你击败了 ${this.opponentData.name}！`, 'text-green-400 font-bold text-lg');
        
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
        await this.sleep(2000);
        this.showReturnButton("战斗失败，返回主场景");
    }

    showCaptureOptions() {
        const actionPanel = document.querySelector('.action-panel');
        actionPanel.innerHTML = '';
        
        this.addLog(`要尝试捕获 ${this.opponentData.name} 吗？`, 'text-yellow-300');
        
        const captureButton = document.createElement('button');
        captureButton.textContent = '✅ 捕获';
        captureButton.className = 'action-button bg-green-600 hover:bg-green-700';
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
        releaseButton.className = 'action-button flee-button';
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
        const actionPanel = document.querySelector('.action-panel');
        actionPanel.innerHTML = '';
        
        const returnButton = document.createElement('button');
        returnButton.textContent = message;
        returnButton.className = 'return-button';
        returnButton.onclick = () => {
            const returnUrl = localStorage.getItem('battleReturnUrl') || 'game3d.html';
            localStorage.removeItem('battleOpponent');
            localStorage.removeItem('battlePlayerAnimal');
            localStorage.removeItem('battleReturnUrl');
            window.location.href = returnUrl;
        };
        
        actionPanel.appendChild(returnButton);
    }

    flee() {
        if (confirm("确定要从战斗中逃跑吗？")) {
            localStorage.removeItem('battleOpponent');
            localStorage.removeItem('battlePlayerAnimal');
            window.location.href = 'game3d.html';
        }
    }

    addLog(message, className = 'text-gray-300') {
        const logContainer = this.ui.battleLog;
        const logEntry = document.createElement('div');
        logEntry.className = className;
        logEntry.textContent = message;
        logContainer.appendChild(logEntry);
        
        // 自动滚动到底部
        logContainer.parentElement.scrollTop = logContainer.parentElement.scrollHeight;
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
            'water': '水', 'fire': '火', 'grass': '草',
            'wind': '风', 'electric': '电', 'earth': '土'
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
                defenderStats.hp -= actualDamage;
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
                // 为敌方附加异常状态
                const statusType = params[`${effectKey}_status-type`] || 'poison';
                const statusChance = params[`${effectKey}_status-chance`] || 50;
                const random = Math.random() * 100;
                const statusNames = this.getStatusNames();
                
                if (random <= statusChance) {
                    if (!defenderStats.status.includes(statusType)) {
                        defenderStats.status.push(statusType);
                        this.addLog(`施加异常: ${defenderName}获得 ${statusNames[statusType] || statusType} (${statusChance}%概率成功)`, 'text-purple-300');
                    } else {
                        this.addLog(`施加异常: ${defenderName}已有 ${statusNames[statusType] || statusType}`, 'text-gray-400');
                    }
                } else {
                    this.addLog(`施加异常: 未触发 (${Math.round(random)}% > ${statusChance}%)`, 'text-gray-400');
                }
                break;
            }
            
            case 'debuff_status_self': {
                // 为自身附加异常状态
                const statusType = params[`${effectKey}_status-type`] || 'poison';
                const statusChance = params[`${effectKey}_status-chance`] || 50;
                const random = Math.random() * 100;
                const statusNames = this.getStatusNames();
                
                if (random <= statusChance) {
                    if (!attackerStats.status.includes(statusType)) {
                        attackerStats.status.push(statusType);
                        this.addLog(`自身异常: ${attackerName}获得 ${statusNames[statusType] || statusType} (${statusChance}%概率成功)`, 'text-purple-300');
                    } else {
                        this.addLog(`自身异常: ${attackerName}已有 ${statusNames[statusType] || statusType}`, 'text-gray-400');
                    }
                } else {
                    this.addLog(`自身异常: 未触发 (${Math.round(random)}% > ${statusChance}%)`, 'text-gray-400');
                }
                break;
            }
            
            case 'buff_purify': {
                // 净化：清除异常状态
                const target = params[`${effectKey}_target`];
                const purifyType = params[`${effectKey}_purify-type`] || 'all';
                const statusNames = this.getStatusNames();
                
                if (target === 'self' || target === 'ally-all') {
                    const beforeCount = attackerStats.status.length;
                    if (purifyType === 'all') {
                        attackerStats.status = [];
                        this.addLog(`净化: 清除${attackerName}所有异常状态 (${beforeCount}个)`, 'text-green-300');
                    } else {
                        attackerStats.status = attackerStats.status.filter(s => s !== purifyType);
                        this.addLog(`净化: 清除${attackerName} ${statusNames[purifyType] || purifyType}`, 'text-green-300');
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
            let skill = COMBAT_SKILLS[skillKey] || MUTATION_SKILLS[skillKey];
            
            // 如果不是预定义技能，从技能池中查找
            if (!skill && skillKey) {
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
}