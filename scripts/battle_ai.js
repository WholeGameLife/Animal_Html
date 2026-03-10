/**
 * battle_ai.js - 联赛AI对手逻辑系统
 *
 * 三种难度的AI策略，难度差异不仅体现在单回合技能选择上，
 * 还体现在是否具备「多动物队伍联动」意识：
 *
 *  ┌──────────┬────────────────────────────────────────────────────────────┐
 *  │ 简单AI   │ 完全随机，不考虑队伍，10%概率发呆                         │
 *  ├──────────┼────────────────────────────────────────────────────────────┤
 *  │ 中级AI   │ 单动物状态感知（HP/克制），不主动联动队伍                 │
 *  │          │ 只在当前动物快倒下时被动应对（不会主动换人）              │
 *  ├──────────┼────────────────────────────────────────────────────────────┤
 *  │ 困难AI   │ 完整队伍联动策略：                                        │
 *  │          │  · 分析敌方当前动物元素，主动提示（或模拟）换人请求       │
 *  │          │  · 为后续动物铺路（优先积累DOT/减速/减防）                │
 *  │          │  · 识别己方动物角色（攻击型/辅助型/克制型）               │
 *  │          │  · 保留高CD技能给高价值回合                               │
 *  │          │  · 跟踪已倒下的敌方动物，分析剩余威胁                     │
 *  └──────────┴────────────────────────────────────────────────────────────┘
 *
 * 使用方式：
 *   const ai = new BattleAI('easy'|'medium'|'hard', battleSystemInstance);
 *   const skillKey = ai.selectSkill();
 */

class BattleAI {
    /**
     * @param {'easy'|'medium'|'hard'} difficulty
     * @param {BattleSystem} battleSystem
     */
    constructor(difficulty, battleSystem) {
        this.difficulty = difficulty;
        this.bs = battleSystem;

        this.difficultyNames = {
            easy:   '简单AI',
            medium: '中级AI',
            hard:   '困难AI'
        };

        // ── 队伍信息（困难AI使用）──
        this.teamRoles = {};          // { animalId: 'attacker'|'support'|'tank'|'counter' }
        this.enemyTeamMembers = [];   // 敌方已出场动物列表
        this.defeatedEnemies = new Set(); // 已倒下的敌方动物 id

        // ── 历史数据 ──
        this.turnCount = 0;
        this.lastEnemyAnimalId = null; // 上一回合的敌方动物 id（用于检测换人）
    }

    // =====================================================
    // 公共入口
    // =====================================================

    /**
     * 选择本回合使用的技能
     * @returns {string|null}
     */
    selectSkill() {
        this.turnCount++;
        this._updateTeamState(); // 更新队伍状态追踪

        switch (this.difficulty) {
            case 'easy':   return this._easySelectSkill();
            case 'medium': return this._mediumSelectSkill();
            case 'hard':   return this._hardSelectSkill();
            default:       return this._easySelectSkill();
        }
    }

    // =====================================================
    // 简单AI —— 随机 + 10% 发呆，完全不考虑队伍
    // =====================================================

    _easySelectSkill() {
        const name = this.difficultyNames.easy;
        const avail = this._getAvailableSkills();

        if (Math.random() < 0.10) {
            this._log(`${name} 发呆了，放弃本回合行动`, 'gray');
            return null;
        }
        if (avail.length === 0) {
            this._log(`${name} 没有可用技能，放弃行动`, 'gray');
            return null;
        }

        const chosen = this._randomFrom(avail);
        this._log(`${name} 随机选择了 [${chosen.name}]`, 'gray');
        return chosen.key;
    }

    // =====================================================
    // 中级AI —— 状态感知 + 基础克制，但不联动队伍
    // =====================================================

    _mediumSelectSkill() {
        const name = this.difficultyNames.medium;
        const avail = this._getAvailableSkills();

        if (avail.length === 0) {
            this._log(`${name} 没有可用技能，放弃行动`, 'gray');
            return null;
        }

        const my  = this.bs.opponentStats;
        const foe = this.bs.playerStats;
        const hpRatio = my.hp / my.maxHp;

        // 属性克制
        const elementMult = typeof getElementAdvantageMultiplier === 'function'
            ? getElementAdvantageMultiplier(my.element, foe.element) : 1.0;
        const hasAdvantage = elementMult > 1.0;

        // 分类
        const healSkills    = avail.filter(s => this._isHealSkill(s));
        const defenseSkills = avail.filter(s => this._isDefenseSkill(s));
        const attackSkills  = avail.filter(s => this._isAttackSkill(s));
        const buffSkills    = avail.filter(s => this._isBuffSkill(s));
        const debuffSkills  = avail.filter(s => this._isDebuffSkill(s));

        // HP 危急先救
        if (hpRatio < 0.3) {
            if (healSkills.length > 0) {
                const chosen = this._randomFrom(healSkills);
                this._log(`${name} 血量危急，使用治疗 [${chosen.name}]`, 'yellow');
                return chosen.key;
            }
            if (defenseSkills.length > 0) {
                const chosen = this._randomFrom(defenseSkills);
                this._log(`${name} 血量危急，使用防御 [${chosen.name}]`, 'yellow');
                return chosen.key;
            }
        }

        // 属性克制时偏向攻击
        if (hasAdvantage && attackSkills.length > 0 && Math.random() < 0.75) {
            const chosen = this._randomFrom(attackSkills);
            this._log(`${name} 利用克制，使用攻击 [${chosen.name}]`, 'cyan');
            return chosen.key;
        }

        // 优先级：攻击 > 减益 > 增益 > 防御 > 治疗
        for (const group of [attackSkills, debuffSkills, buffSkills, defenseSkills, healSkills]) {
            if (group.length > 0) {
                const chosen = this._randomFrom(group);
                this._log(`${name} 选择 [${chosen.name}]`, 'gray');
                return chosen.key;
            }
        }

        const fallback = this._randomFrom(avail);
        this._log(`${name} 随机兜底 [${fallback.name}]`, 'gray');
        return fallback.key;
    }

    // =====================================================
    // 困难AI —— 完整评分 + 队伍联动策略
    // =====================================================

    _hardSelectSkill() {
        const name = this.difficultyNames.hard;
        const avail = this._getAvailableSkills();

        if (avail.length === 0) {
            this._log(`${name} 没有可用技能，放弃行动`, 'gray');
            return null;
        }

        const my  = this.bs.opponentStats;
        const foe = this.bs.playerStats;

        const myHpRatio  = my.hp  / my.maxHp;
        const foeHpRatio = foe.hp / foe.maxHp;

        const elementMult = typeof getElementAdvantageMultiplier === 'function'
            ? getElementAdvantageMultiplier(my.element, foe.element) : 1.0;
        const hasAdvantage    = elementMult > 1.0;
        const hasDisadvantage = elementMult < 1.0;

        // 敌方负面状态数量
        const foeNegative = (foe.statuses || []).filter(s =>
            (s.data?.statusType || 'negative') === 'negative'
        ).length;

        // 我方正面状态数量
        const myPositive = (my.statuses || []).filter(s =>
            s.data?.statusType === 'positive'
        ).length;

        // ── 队伍联动情境分析 ──
        const teamInfo = this._analyzeTeamContext();

        // 评分
        const scored = avail.map(skill => {
            let score = 0;

            // 基础类型分
            if (this._isAttackSkill(skill))  score += 50;
            if (this._isDebuffSkill(skill))  score += 40;
            if (this._isBuffSkill(skill))    score += 30;
            if (this._isDefenseSkill(skill)) score += 20;
            if (this._isHealSkill(skill))    score += 15;

            // ── 生命值情境 ──
            if (myHpRatio < 0.25) {
                if (this._isHealSkill(skill))    score += 80;
                if (this._isDefenseSkill(skill)) score += 40;
                // 如果队伍里还有其他动物，且自己快倒了，先把DOT/减速施加出去再"带走"
                if (teamInfo.hasMoreTeammates && this._isDebuffSkill(skill)) {
                    score += 30; // 为后续动物铺路
                    this._logDebug('  [联动] 快倒下，抢先施加debuff为队友铺路');
                }
            } else if (myHpRatio < 0.5) {
                if (this._isHealSkill(skill))    score += 40;
                if (this._isDefenseSkill(skill)) score += 20;
            }

            // ── 斩杀补刀 ──
            if (foeHpRatio < 0.2 && this._isAttackSkill(skill)) {
                score += 60;
            }

            // ── 属性克制 ──
            if (hasAdvantage && this._isAttackSkill(skill))  score += 35;
            if (hasDisadvantage) {
                if (this._isAttackSkill(skill))  score -= 20;
                if (this._isDefenseSkill(skill)) score += 25;
                if (this._isBuffSkill(skill))    score += 15;
                // 处于属性不利时，为后续克制型动物铺路的减益技能更有价值
                if (teamInfo.hasCounterAnimal && this._isDebuffSkill(skill)) {
                    score += 20;
                    this._logDebug('  [联动] 属性不利，减益铺路让克制型队友接场');
                }
            }

            // ── 敌方状态情境 ──
            if (foeNegative >= 3 && this._isDebuffSkill(skill)) {
                score -= 20; // 已有很多负面状态，继续叠加价值降低
            }
            if (foeNegative === 0 && this._isDebuffSkill(skill)) {
                score += 20; // 敌方无状态，先手施加更有价值
            }

            // ── 我方buff情境 ──
            if (myPositive === 0 && this._isBuffSkill(skill)) {
                score += 20;
            }

            // ── 队伍联动：为后续动物铺路 ──
            if (teamInfo.hasMoreTeammates) {
                // 持续性debuff（减速/毒/减防）：当前动物死后也会继续发挥作用
                const persistentDebuffEffects = [
                    'buff_status_enemy',  // 为敌方施加状态
                    'debuff_speed',       // 减速（有利于后续动物先手）
                    'debuff_defense',     // 减防（后续动物攻击更痛）
                    'debuff_attack'       // 减攻（保护后续动物）
                ];
                const hasPersistentDebuff = (skill.effects || []).some(e =>
                    persistentDebuffEffects.includes(e)
                );
                if (hasPersistentDebuff) {
                    score += 15; // 持续性减益更有团队价值
                    this._logDebug(`  [联动] 持续减益加分，对后续队友有利`);
                }

                // 持续性buff给队友：heal_rebirth（重生）更有价值，因为后续动物也可能触发
                // 注意：heal_rebirth 对本动物而言才有用，下面是评估当前动物使用重生的价值
                // 如果当前动物 HP > 70%，重生意义不大；HP < 50% 时有保险价值
                if ((skill.effects || []).includes('heal_rebirth')) {
                    if (myHpRatio < 0.5) score += 25;
                    else score -= 10;
                }
            }

            // ── 当前动物是否是"克制型"角色 ──
            // 若当前动物元素克制敌方，攻击技能加分（发挥角色价值）
            if (teamInfo.currentIsCounter && this._isAttackSkill(skill)) {
                score += 20;
                this._logDebug('  [联动] 当前是克制型动物，攻击加分');
            }

            // ── 当前动物是否是"辅助型"角色 ──
            // 若队伍中还有更强的攻击型动物存活，当前动物应以debuff/buff为主
            if (teamInfo.hasBetterAttacker && this._isAttackSkill(skill) &&
                this._isDebuffSkill({ effects: (skill.effects || []) })) {
                // 混合技能（攻击+减益）：不扣分
            } else if (teamInfo.hasBetterAttacker && this._isAttackSkill(skill) &&
                       !this._isBuffSkill(skill) && !this._isDebuffSkill(skill)) {
                // 纯攻击型技能在有更强攻击队友时，轻微降低评分（保留对方HP让队友发挥）
                // 注意：这里不降低太多，避免过度保守
                score -= 5;
            }

            // ── CD 价值管理 ──
            const cd = skill.cooldown || 0;
            if (cd >= 3) score += 15;
            if (cd >= 5) score += 10;

            // ── 随机扰动（±15）防完全可预测 ──
            score += Math.random() * 30 - 15;

            return { skill, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];

        this._log(
            `${name} 评分最高 [${best.skill.name}](${best.score.toFixed(1)}分)，释放`,
            'cyan'
        );

        // Debug 输出（需要 window._aiDebug = true）
        if (window._aiDebug) {
            scored.forEach(({ skill, score }) => {
                console.log(`[AI评分] ${skill.name}: ${score.toFixed(1)}`);
            });
        }

        return best.skill.key;
    }

    // =====================================================
    // 队伍联动情境分析（困难AI专用）
    // =====================================================

    /**
     * 分析当前战场的队伍联动情境
     * @returns {Object} 情境描述对象
     */
    _analyzeTeamContext() {
        const ctx = {
            hasMoreTeammates:  false,  // 敌方（AI方）队伍是否还有其他动物
            hasCounterAnimal:  false,  // 己方队伍中是否有克制当前敌方元素的动物
            currentIsCounter:  false,  // 当前上场动物是否克制玩家
            hasBetterAttacker: false,  // 己方是否有比当前动物攻击力更高的动物未出场
            enemyRemainingCount: 0,    // 敌方（玩家方）剩余动物数
        };

        const bs = this.bs;

        // ── 我方（AI方）队伍信息 ──
        // AI 方是 opponent，从 enemyBattleTeamData / enemyGameState 中读取
        const enemyTeamData = JSON.parse(localStorage.getItem('enemyBattleTeamData') || '{}');
        const enemyTeamIds = enemyTeamData.battleTeam || [];
        const enemyState = JSON.parse(localStorage.getItem('enemyGameState') || '{}');
        const allEnemyAnimals = enemyState.animals || [];

        const currentOpponentId = bs.opponentData?.animalId || bs.opponentData?.id;
        const aliveTeammates = allEnemyAnimals.filter(a => {
            const id = a.id || a.animalId;
            // 已在已倒下列表中的跳过（利用 BattleSystem 的 defeatedEnemyIds）
            if (bs.defeatedEnemyIds && bs.defeatedEnemyIds.has(id)) return false;
            return id !== currentOpponentId;
        });

        ctx.hasMoreTeammates = aliveTeammates.length > 0;

        // 检查己方存活队伍中是否有克制玩家的动物
        const foeElement = bs.playerStats?.element || 'water';
        if (typeof getElementAdvantageMultiplier === 'function') {
            ctx.currentIsCounter =
                getElementAdvantageMultiplier(bs.opponentStats?.element, foeElement) > 1.0;

            ctx.hasCounterAnimal = aliveTeammates.some(a => {
                const mult = getElementAdvantageMultiplier(a.element || 'normal', foeElement);
                return mult > 1.0;
            });
        }

        // 判断己方是否有攻击力更高的未出场动物
        const myAttack = bs.opponentStats?.baseAttack || 0;
        ctx.hasBetterAttacker = aliveTeammates.some(a => {
            const atk = a.abilities?.combat?.attack || a.attack || 0;
            return atk > myAttack * 1.1; // 超过当前10%才算"更好的攻击者"
        });

        // ── 玩家方剩余动物 ──
        const playerTeamData = JSON.parse(localStorage.getItem('battleTeamData') || '{}');
        const playerTeamIds = playerTeamData.battleTeam || [];
        const playerState = JSON.parse(localStorage.getItem('gameState') || '{}');
        const allPlayerAnimals = playerState.animals || [];
        const currentPlayerId = bs.playerData?.animalId || bs.playerData?.id;
        ctx.enemyRemainingCount = allPlayerAnimals.filter(a => {
            const id = a.id || a.animalId;
            return id !== currentPlayerId;
        }).length;

        return ctx;
    }

    // =====================================================
    // 状态更新（每回合调用）
    // =====================================================

    _updateTeamState() {
        // 追踪敌方动物换人（玩家换人）
        const currentFoeId = this.bs.playerData?.animalId || this.bs.playerData?.id;
        if (currentFoeId && currentFoeId !== this.lastEnemyAnimalId) {
            if (this.lastEnemyAnimalId) {
                // 对方换人了
                if (this.difficulty === 'hard') {
                    this._log(
                        `${this.difficultyNames.hard} 检测到玩家切换动物（${currentFoeId}）`,
                        'purple'
                    );
                }
            }
            this.lastEnemyAnimalId = currentFoeId;
        }
    }

    // =====================================================
    // 技能分类判断
    // =====================================================

    _isAttackSkill(skill) {
        const types   = skill.types   || (skill.type   ? [skill.type]   : []);
        const effects = skill.effects || (skill.effect ? [skill.effect] : []);
        return types.includes('attack') || effects.some(e => [
            'direct_attack', 'multi_attack', 'dot_damage', 'percent_damage',
            'true_damage', 'damage_amp', 'armor_pierce', 'critical',
            'damage', 'bonus_damage', 'heal_lifesteal'
        ].includes(e));
    }

    _isDefenseSkill(skill) {
        const types   = skill.types   || (skill.type   ? [skill.type]   : []);
        const effects = skill.effects || (skill.effect ? [skill.effect] : []);
        return types.includes('defense') || effects.some(e => [
            'direct_defense', 'continuous_defense', 'defense_counter',
            'buff_defense', 'damage_reduction', 'guaranteed_dodge'
        ].includes(e));
    }

    _isHealSkill(skill) {
        const types   = skill.types   || (skill.type   ? [skill.type]   : []);
        const effects = skill.effects || (skill.effect ? [skill.effect] : []);
        return types.includes('heal') || effects.some(e => [
            'heal_direct', 'heal_continuous', 'heal_percent', 'heal_rebirth'
        ].includes(e));
    }

    _isBuffSkill(skill) {
        const types   = skill.types   || (skill.type   ? [skill.type]   : []);
        const effects = skill.effects || (skill.effect ? [skill.effect] : []);
        return types.includes('buff') || types.includes('support') || effects.some(e => [
            'buff_attack', 'buff_speed', 'buff_heal_amp',
            'buff_element_damage', 'buff_purify', 'direct_speed',
            'continuous_speed', 'debuff_status_self'
        ].includes(e));
    }

    _isDebuffSkill(skill) {
        const types   = skill.types   || (skill.type   ? [skill.type]   : []);
        const effects = skill.effects || (skill.effect ? [skill.effect] : []);
        return types.includes('debuff') || effects.some(e => [
            'debuff_attack', 'debuff_defense', 'debuff_speed',
            'debuff_no_heal', 'debuff_heal_reduce', 'debuff_element_damage',
            'debuff_hp_cost', 'buff_status_enemy'
        ].includes(e));
    }

    // =====================================================
    // 工具函数
    // =====================================================

    /** 获取敌方（AI方）所有不在冷却的可用技能 */
    _getAvailableSkills() {
        return (this.bs.opponentPassiveSkills || []).filter(skill =>
            !this.bs.isSkillOnCooldown(skill.key, false)
        );
    }

    _randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _log(msg, color = 'gray') {
        if (this.bs && typeof this.bs.addLog === 'function') {
            this.bs.addLog(`🤖 ${msg}`, `text-${color}-300`);
        }
    }

    _logDebug(msg) {
        if (window._aiDebug) console.log(`[BattleAI] ${msg}`);
    }
}

// =====================================================
// AI 工厂函数
// =====================================================

/**
 * 创建指定难度的 AI 实例
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {BattleSystem} battleSystem
 * @returns {BattleAI}
 */
function createBattleAI(difficulty, battleSystem) {
    return new BattleAI(difficulty, battleSystem);
}

// =====================================================
// BattleSystem 注入接口
// （不修改 battle_system.js，通过替换 selectEnemySkill 实现）
// =====================================================

/**
 * 将 AI 注入战斗系统，替换敌方技能选择逻辑
 * @param {BattleSystem} battleSystem
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {BattleAI}
 */
function injectAIIntoBattleSystem(battleSystem, difficulty) {
    const ai = new BattleAI(difficulty, battleSystem);

    // 保存原始函数（以便恢复）
    battleSystem._originalSelectEnemySkill = battleSystem.selectEnemySkill.bind(battleSystem);

    // 替换
    battleSystem.selectEnemySkill = async function() {
        // ── 困难AI：回合开始前先评估是否应该换人 ──
        if (difficulty === 'hard') {
            const switched = await _aiTrySwitchAnimal(ai, this);
            if (switched) {
                // 换人消耗本回合行动（turnCount 已在 _aiTrySwitchAnimal 内递增）
                this.selectedSkill = null;
                return;
            }
        }

        // 不换人：正常选技能（selectSkill 内会递增 turnCount）
        const skillKey = ai.selectSkill();
        this.selectedSkill = skillKey;

        if (skillKey) {
            const skill = (this.opponentPassiveSkills || []).find(s => s.key === skillKey);
            const skillName = skill ? skill.name : skillKey;
            this.addLog(
                `敌人（${ai.difficultyNames[difficulty]}）准备使用 [${skillName}]`,
                'text-red-300'
            );
        } else {
            this.addLog(
                `敌人（${ai.difficultyNames[difficulty]}）放弃本回合行动`,
                'text-gray-400'
            );
        }

        await this.sleep(500);
    };

    battleSystem._injectedAI = ai;
    console.log(`[BattleAI] 已注入${ai.difficultyNames[difficulty]}到战斗系统`);
    return ai;
}

/**
 * 困难AI 主动换人决策函数
 *
 * 换人条件（满足任一即可触发，每条规则有防连续换人保护）：
 *  1. 属性不利 且 队伍中有克制当前玩家的动物 → 立即换
 *  2. 当前 HP < 25% 且 有满血候选动物（血量高于自己50%）→ 换
 *  3. 全部技能冷却中 且 有有技能的候选动物 → 换
 *  4. 每5回合主动进攻换人（候选评分比当前高30分以上）
 *
 * @param {BattleAI} ai
 * @param {BattleSystem} bs
 * @returns {Promise<boolean>} 是否发生了换人
 */
async function _aiTrySwitchAnimal(ai, bs) {
    // 需要 switchToEnemyAnimal 接口（由 skill_tester.html 注入）
    if (typeof bs.switchToEnemyAnimal !== 'function') return false;

    // 防止同一回合重复换人
    if (ai._switchedThisTurn) {
        ai._switchedThisTurn = false;
        return false;
    }

    // 预先递增回合计数
    // 若最终不换人则会在函数末尾回退（-1），由 selectSkill 正常递增
    // 若发生换人则保留递增（替代了 selectSkill 中的递增）
    ai.turnCount++;
    ai._updateTeamState();

    const currentId = bs.opponentData?.animalId || bs.opponentData?.id;

    // 构建存活候选名单（支持 skill_tester 和 battle.html 联赛两种数据来源）
    let candidates = [];

    // 方式1：skill_tester.html 的 enemyBattleTeamData / enemyGameState
    const enemyTeamData = JSON.parse(localStorage.getItem('enemyBattleTeamData') || '{}');
    const teamIds = enemyTeamData.battleTeam || [];
    const enemyState = JSON.parse(localStorage.getItem('enemyGameState') || '{}');
    const allEnemies = enemyState.animals || [];

    if (teamIds.length > 0) {
        candidates = teamIds
            .map(id => allEnemies.find(a => a.id === id || a.animalId === id))
            .filter(a => {
                if (!a) return false;
                const id = a.id || a.animalId;
                if (id === currentId) return false;
                if (bs.defeatedEnemyIds && bs.defeatedEnemyIds.has(id)) return false;
                return true;
            });
    }

    // 方式2：battle.html 联赛模式的 leagueBattleInfo
    if (candidates.length === 0) {
        const leagueInfo = JSON.parse(localStorage.getItem('leagueBattleInfo') || '{}');
        const opponentTeam = leagueInfo?.matchInfo?.opponent;
        if (opponentTeam && opponentTeam.registeredAnimals) {
            if (!bs.defeatedEnemyIds) bs.defeatedEnemyIds = new Set();
            bs.defeatedEnemyIds.add(currentId);
            candidates = opponentTeam.registeredAnimals
                .slice(0, 6)
                .filter(a => {
                    const id = a.id || a.animalId || a.name;
                    return !bs.defeatedEnemyIds.has(id);
                })
                .map(a => ({
                    ...a,
                    id: a.id || a.animalId,
                    animalId: a.animalId || a.id,
                    stamina: a.hp || a.originalAnimal?.maxStamina || 300,
                    abilities: {
                        combat: {
                            attack: a.attack || 50,
                            defense: a.defense || 50,
                            agility: a.agility || 50
                        }
                    }
                }));
        }
    }

    if (candidates.length === 0) {
        // 没有候选动物（普通单打独斗或队伍已耗尽），回退 turnCount
        ai.turnCount--;
        return false;
    }

    const my  = bs.opponentStats;
    const foe = bs.playerStats;
    const myHpRatio  = my.hp  / my.maxHp;

    const foeElement = foe.element || 'normal';
    const myElement  = my.element  || 'normal';

    const myMult = typeof getElementAdvantageMultiplier === 'function'
        ? getElementAdvantageMultiplier(myElement, foeElement) : 1.0;
    const hasDisadvantage = myMult < 1.0;

    // 给每个候选动物评分
    const scored = candidates.map(a => {
        let score = 0;
        const el  = a.element || 'normal';
        const atk = a.abilities?.combat?.attack || a.attack || 0;
        const myAtk = my.baseAttack || 0;
        const maxHp = a.stamina || a.abilities?.combat?.hp || 100;

        // 克制敌方元素：+60
        if (typeof getElementAdvantageMultiplier === 'function') {
            if (getElementAdvantageMultiplier(el, foeElement) > 1.0) score += 60;
        }
        // 攻击力更高：+20
        if (atk > myAtk * 1.1) score += 20;
        // 血量更充足（候选满血 vs 当前剩余）：
        if (maxHp > my.maxHp * 1.3) score += 10;

        return { animal: a, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) return false;

    const bestEl   = best.animal.element || 'normal';
    const bestMult = typeof getElementAdvantageMultiplier === 'function'
        ? getElementAdvantageMultiplier(bestEl, foeElement) : 1.0;

    // ── 规则1：属性不利且有克制动物 ──
    if (hasDisadvantage && bestMult > 1.0) {
        bs.addLog(
            `🤖 困难AI 属性不利，换出 [${bs.opponentData.name}] → 换入 [${best.animal.name}]`,
            'text-purple-300'
        );
        bs.switchToEnemyAnimal(best.animal.id || best.animal.animalId);
        ai._switchedThisTurn = true;
        await bs.sleep(400);
        return true;
    }

    // ── 规则2：HP 危急，换上血量更充足的动物 ──
    if (myHpRatio < 0.25) {
        const healthier = candidates.find(a => {
            const maxHp = a.stamina || a.abilities?.combat?.hp || 100;
            return maxHp > my.maxHp * 1.5;
        });
        if (healthier) {
            bs.addLog(
                `🤖 困难AI 血量危急，换出 [${bs.opponentData.name}] → 换入 [${healthier.name}]`,
                'text-purple-300'
            );
            bs.switchToEnemyAnimal(healthier.id || healthier.animalId);
            ai._switchedThisTurn = true;
            await bs.sleep(400);
            return true;
        }
    }

    // ── 规则3：全部技能冷却中，换有技能的动物 ──
    const mySkills = bs.opponentPassiveSkills || [];
    const allCooldown = mySkills.length > 0 &&
        mySkills.every(s => bs.isSkillOnCooldown(s.key, false));
    if (allCooldown) {
        const active = candidates.find(a => {
            const skills = a.combatSkills?.equipped || [];
            return skills.length > 0;
        });
        if (active) {
            bs.addLog(
                `🤖 困难AI 技能全部冷却，换出 [${bs.opponentData.name}] → 换入 [${active.name}]`,
                'text-purple-300'
            );
            bs.switchToEnemyAnimal(active.id || active.animalId);
            ai._switchedThisTurn = true;
            await bs.sleep(400);
            return true;
        }
    }

    // ── 规则4：每5回合主动进攻换人 ──
    if (ai.turnCount % 5 === 0 && best.score >= 60) {
        const currentScore = (myMult > 1.0 ? 60 : 0) + ((my.baseAttack || 0) > 0 ? 20 : 0);
        if (best.score > currentScore + 30) {
            bs.addLog(
                `🤖 困难AI 进攻换人：[${bs.opponentData.name}] → [${best.animal.name}]（差${(best.score - currentScore).toFixed(0)}分）`,
                'text-purple-300'
            );
            bs.switchToEnemyAnimal(best.animal.id || best.animal.animalId);
            ai._switchedThisTurn = true;
            await bs.sleep(400);
            return true;
        }
    }

    // 没有换人：回退预先递增的 turnCount（将由后续 selectSkill 正常递增）
    ai.turnCount--;
    return false;
}

/**
 * 从战斗系统中移除 AI 注入，恢复原始随机逻辑
 * @param {BattleSystem} battleSystem
 */
function removeAIFromBattleSystem(battleSystem) {
    if (battleSystem._originalSelectEnemySkill) {
        battleSystem.selectEnemySkill = battleSystem._originalSelectEnemySkill;
        delete battleSystem._originalSelectEnemySkill;
        delete battleSystem._injectedAI;
        console.log('[BattleAI] 已移除AI注入，恢复原始逻辑');
    }
}

// =====================================================
// 战斗测试器集成入口
// =====================================================

/**
 * 在战斗测试器中设置 AI
 * @param {BattleSystem} battleSystem
 * @param {'easy'|'medium'|'hard'|'none'} difficulty
 * @returns {BattleAI|null}
 */
function setupBattleTesterAI(battleSystem, difficulty) {
    removeAIFromBattleSystem(battleSystem);

    if (difficulty && difficulty !== 'none') {
        const ai = injectAIIntoBattleSystem(battleSystem, difficulty);
        if (battleSystem.addLog) {
            const diffNames = { easy: '简单', medium: '中级', hard: '困难' };
            battleSystem.addLog(
                `━━━ 已启用${diffNames[difficulty] || difficulty}AI（${ai.difficultyNames[difficulty]}）━━━`,
                'text-purple-300'
            );
            if (difficulty === 'hard') {
                battleSystem.addLog(
                    '🧠 困难AI：具备队伍联动意识，会为后续动物铺路',
                    'text-purple-300'
                );
            } else if (difficulty === 'medium') {
                battleSystem.addLog(
                    '🤔 中级AI：感知血量和克制关系，单动物决策',
                    'text-yellow-300'
                );
            } else {
                battleSystem.addLog(
                    '😊 简单AI：随机行动，偶尔发呆',
                    'text-green-300'
                );
            }
        }
        return ai;
    }

    return null;
}
