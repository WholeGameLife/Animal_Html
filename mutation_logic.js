// ============================================
// 电子盆栽 - 变异系统逻辑
// 实现完整的变异机制
// ============================================

// 执行一级变异
function performTier1Mutation(animal, currentMutation, currentRarity) {
    let targetRarity, mutationName, config;
    
    if (!currentMutation) {
        // 首次变异 - 使用标准概率
        const roll = Math.random() * 100;
        const prob = MUTATION_PROBABILITY.first_mutation;
        if (roll < prob.basic) {
            targetRarity = 'basic';
            const options = Object.keys(MUTATION_CONFIG.tier1.basic);
            mutationName = options[Math.floor(Math.random() * options.length)];
        } else if (roll < prob.basic + prob.elite) {
            targetRarity = 'elite';
            const options = Object.keys(MUTATION_CONFIG.tier1.elite);
            mutationName = options[Math.floor(Math.random() * options.length)];
        } else {
            targetRarity = 'legendary';
            const options = Object.keys(MUTATION_CONFIG.tier1.legendary);
            mutationName = options[Math.floor(Math.random() * options.length)];
        }
    } else {
        // 已有变异 - 使用亲和链规则
        const result = calculateAffinityMutation(currentMutation, currentRarity);
        targetRarity = result.rarity;
        mutationName = result.mutation;
    }

    // 修正：确保 config 被正确赋值
    config = MUTATION_CONFIG.tier1[targetRarity]?.[mutationName];
    
    // 如果 config 未定义，说明出现错误，提前退出
    if (!config) {
        console.error("Mutation failed: Could not find config for", targetRarity, mutationName);
        return { success: false, log: "变异失败：未找到配置。", changeDesc: "<p>变异失败，请重试。</p>" };
    }
    
    // 初始化变异历史数组
    if (!animal.mutations.history) {
        animal.mutations.history = [];
    }
    
    // 应用变异
    const oldMutation = animal.mutations.tier1;
    const oldRarity = currentRarity;
    
    // 判断是否为稀有度提升
    const isRarityUpgrade = oldMutation && getRarityLevel(targetRarity) > getRarityLevel(oldRarity);
    
    // 管理技能：根据技能数量限制处理
    const skillLimits = SKILL_LIMITS.mutation;
    
    // 如果是进阶（稀有度提升），保留旧变异到历史
    if (isRarityUpgrade) {
        const oldConfig = getMutationConfig(oldMutation);
        if (oldConfig && !animal.mutations.history.some(h => h.name === oldMutation)) {
            animal.mutations.history.push({
                name: oldMutation,
                rarity: oldRarity,
                icon: oldConfig.icon
            });
        }
        // 稀有度提升时，保留所有旧技能（不移除）
    } else if (oldMutation) {
        // 同级转换：强制替换技能
        const skillsToRemove = animal.mutations.currentSkills || (getMutationConfig(oldMutation)?.skills || []);
        
        if (skillsToRemove && skillsToRemove.length > 0) {
            // 从变异技能列表中移除旧变异的技能
            animal.mutations.skills = animal.mutations.skills.filter(s => !skillsToRemove.includes(s));
            
            // 从装备槽中移除旧的变异技能
            if (animal.combatSkills && animal.combatSkills.equipped) {
                animal.combatSkills.equipped = animal.combatSkills.equipped.map(skillKey => {
                    if (skillKey && skillsToRemove.includes(skillKey)) {
                        return null;
                    }
                    return skillKey;
                });
            }
        }
    }
    
    // 更新当前变异
    animal.mutations.tier1 = mutationName;
    
    // 从技能池中获取对应变异类型的技能
    let mutationSkills = getSkillsFromPool(mutationName);
    
    // 如果技能池为空，使用预定义技能
    if (mutationSkills.length === 0) {
        mutationSkills = config.skills || [];
    }
    
    // 计算应获得的技能数量（考虑跨级奖励）
    let skillCount = mutationSkills.length;
    if (isRarityUpgrade) {
        const rarityDiff = getRarityLevel(targetRarity) - getRarityLevel(oldRarity);
        if (rarityDiff === 1) {
            // 普通->精英 或 精英->传说：+1技能
            skillCount = Math.min(skillCount + 1, skillLimits[targetRarity]);
        } else if (rarityDiff === 2) {
            // 普通->传说：+2技能
            skillCount = Math.min(skillCount + 2, skillLimits[targetRarity]);
        }
    }
    
    // 从技能池中随机选择技能
    const selectedSkills = mutationSkills.slice(0, skillCount);

    // 记录当前变异带来的技能，供下次变异时移除
    animal.mutations.currentSkills = [...selectedSkills];

    // 添加新技能到拥有的技能列表
    // 确保即使 selectedSkills 为空，也从 config.skills 添加
    const skillsToAdd = selectedSkills.length > 0 ? selectedSkills : (config.skills || []);
    
    // 读取技能池以便解锁到图鉴
    const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');

    skillsToAdd.forEach(skillKey => {
        if (!animal.mutations.skills.includes(skillKey)) {
            animal.mutations.skills.push(skillKey);
            
            // 解锁技能到图鉴
            const skill = MUTATION_SKILLS[skillKey] || skillPool.find(s => s.key === skillKey);
            if (skill && typeof unlockSkillInEncyclopedia === 'function') {
                unlockSkillInEncyclopedia(skillKey, skill);
            }
        }
    });
    
    // 检查并限制技能数量
    limitMutationSkills(animal, skillLimits);
    
    // 应用属性加成
    applyMutationStats(animal, config.stats);
    
    // 增加变异次数
    animal.mutationCount = (animal.mutationCount || 0) + 1;
    
    const rarityText = { basic: '基础', elite: '精英', legendary: '传说' }[targetRarity];
    const isUpgrade = oldMutation && getRarityLevel(targetRarity) > getRarityLevel(oldRarity);
    let log = `✅ 一级变异成功！\n[${rarityText}级] ${oldMutation || '无'} → ${mutationName}\n`;
    if (isUpgrade) {
        log += `🎉 稀有度提升！旧变异已保留到历史记录\n`;
    }
    
    // 获取技能名称（从技能池或预定义）
    const skillNames = getSkillNames(mutationSkills.length > 0 ? mutationSkills : config.skills);
    log += `获得技能: ${skillNames.join(', ')}`;
    
    const changeDesc = `
        <div class="space-y-2">
            <div class="flex justify-between items-center bg-gray-700 p-2 rounded">
                <span class="text-gray-400 text-sm">变异类型</span>
                <span class="text-yellow-400 font-bold">${config.icon} ${mutationName}</span>
            </div>
            <div class="flex justify-between items-center bg-gray-700 p-2 rounded">
                <span class="text-gray-400 text-sm">稀有度</span>
                <span class="text-purple-400 font-bold">${rarityText}级</span>
            </div>
            ${isUpgrade ? `
            <div class="bg-green-900/20 border border-green-500/40 p-2 rounded">
                <div class="text-green-400 text-sm">🎉 稀有度提升！</div>
                <div class="text-xs text-gray-400">旧变异"${oldMutation}"已保留到历史</div>
            </div>
            ` : ''}
            <div class="bg-gray-700 p-2 rounded">
                <div class="text-gray-400 mb-2 text-sm">获得技能:</div>
                <div class="flex flex-wrap gap-1.5">
                    ${getSkillDisplayHtml(mutationSkills.length > 0 ? mutationSkills : config.skills, targetRarity)}
                </div>
            </div>
        </div>
    `;
    
    return { success: true, log, changeDesc };
}

// 执行二级变异
function performTier2Mutation(animal) {
    const roll = Math.random() * 100;
    
    if (roll > MUTATION_PROBABILITY.tier2.success_rate) {
        return {
            success: false,
            log: '❌ 二级变异失败！基因序列不稳定。\n进入24小时冷却修养期。',
            changeDesc: '<p class="text-center text-gray-400">二级变异失败，动物需要休息。</p>'
        };
    }
    
    let mutationName;
    const tierRoll = Math.random() * 100;
    const dist = MUTATION_PROBABILITY.tier2.distribution;
    if (tierRoll < dist['阴']) {
        mutationName = '阴';
    } else if (tierRoll < dist['阴'] + dist['阳']) {
        mutationName = '阳';
    } else {
        mutationName = '玄';
    }
    
    const config = MUTATION_CONFIG.tier2[mutationName];
    const oldTier2 = animal.mutations.tier2;
    
    // 如果已有二级变异，移除旧的属性加成（通过反向应用）
    if (oldTier2 && MUTATION_CONFIG.tier2[oldTier2]) {
        const oldConfig = MUTATION_CONFIG.tier2[oldTier2];
        const reverseStats = {};
        for (const [key, value] of Object.entries(oldConfig.stats)) {
            reverseStats[key] = -value;
        }
        applyMutationStats(animal, reverseStats);
    }
    
    animal.mutations.tier2 = mutationName;
    
    applyMutationStats(animal, config.stats);
    
    let log = `✅ 二级变异成功！\n${oldTier2 || '无'} → ${mutationName}\n`;
    log += `属性提升: ${Object.entries(config.stats).map(([k, v]) => `${k}+${v}`).join(', ')}`;
    
    const changeDesc = `
        <div class="space-y-2">
            <div class="flex justify-between items-center bg-gray-700 p-2 rounded">
                <span class="text-gray-400 text-sm">二级变异</span>
                <span class="text-yellow-400 font-bold">${config.icon} ${mutationName}</span>
            </div>
            <div class="bg-gray-700 p-2 rounded">
                <div class="text-gray-400 mb-1.5 text-sm">属性加成:</div>
                <div class="text-sm space-y-0.5">
                    ${Object.entries(config.stats).map(([k, v]) => `<div class="text-green-400">${k}: +${v}</div>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    return { success: true, log, changeDesc };
}

// 应用变异属性加成
function applyMutationStats(animal, stats) {
    if (stats.attack) animal.abilities.combat.attack += stats.attack;
    if (stats.defense) animal.abilities.combat.defense += stats.defense;
    if (stats.agility) animal.abilities.combat.agility += stats.agility;
    if (stats.stamina) {
        animal.stamina += stats.stamina;
        animal.maxStamina += stats.stamina;
    }
}

// 获取变异稀有度等级
function getRarityLevel(rarity) {
    return MUTATION_RARITY_LEVELS[rarity] || 0;
}

// 基于亲和链计算变异结果
function calculateAffinityMutation(currentMutation, currentRarity) {
    const currentConfig = getMutationConfig(currentMutation);
    const currentChain = currentConfig?.chain;
    
    if (!currentChain) {
        // 如果没有链信息，回退到随机
        return { rarity: currentRarity, mutation: currentMutation };
    }
    
    const chainInfo = AFFINITY_CHAINS[currentChain];
    const oppositeChain = chainInfo.opposite;
    
    if (currentRarity === 'basic') {
        // 从基础级变异
        const roll = Math.random() * 100;
        const prob = MUTATION_PROBABILITY.from_basic;
        
        if (roll < prob.same_tier) {
            return selectSameTierMutation('basic', currentMutation, currentChain, oppositeChain);
        } else if (roll < prob.same_tier + prob.upgrade_elite) {
            return selectUpgradeMutation('elite', currentChain, oppositeChain);
        } else {
            return selectUpgradeMutation('legendary', currentChain, oppositeChain);
        }
    } else if (currentRarity === 'elite') {
        // 从精英级变异
        const roll = Math.random() * 100;
        const prob = MUTATION_PROBABILITY.from_elite;
        
        if (roll < prob.same_tier) {
            return selectSameTierMutation('elite', currentMutation, currentChain, oppositeChain);
        } else {
            return selectUpgradeMutation('legendary', currentChain, oppositeChain);
        }
    } else {
        // 传说级只能同级转换
        return selectSameTierMutation('legendary', currentMutation, currentChain, oppositeChain);
    }
}

// 选择同级变异
function selectSameTierMutation(rarity, currentMutation, currentChain, oppositeChain) {
    const tier = MUTATION_CONFIG.tier1[rarity];
    const candidates = Object.keys(tier).filter(m => m !== currentMutation);
    
    // 按亲和度分类
    const opposite = candidates.filter(m => tier[m].chain === oppositeChain);
    const neutral = candidates.filter(m => tier[m].chain !== currentChain && tier[m].chain !== oppositeChain);
    
    // 计算概率
    const roll = Math.random() * 100;
    let selected;
    
    if (rarity === 'legendary') {
        // 传说级：对立15%，中立各42.5%
        const oppositeChance = MUTATION_PROBABILITY.same_tier_opposite.legendary;
        if (roll < oppositeChance && opposite.length > 0) {
            selected = opposite[Math.floor(Math.random() * opposite.length)];
        } else if (neutral.length > 0) {
            selected = neutral[Math.floor(Math.random() * neutral.length)];
        } else {
            selected = candidates[Math.floor(Math.random() * candidates.length)];
        }
    } else {
        // 基础级/精英级：对立较低概率，中立均分
        const oppositeChance = MUTATION_PROBABILITY.same_tier_opposite[rarity];
        if (roll < oppositeChance && opposite.length > 0) {
            selected = opposite[Math.floor(Math.random() * opposite.length)];
        } else if (neutral.length > 0) {
            selected = neutral[Math.floor(Math.random() * neutral.length)];
        } else {
            selected = candidates[Math.floor(Math.random() * candidates.length)];
        }
    }
    
    return { rarity, mutation: selected };
}

// 选择升级变异
function selectUpgradeMutation(targetRarity, currentChain, oppositeChain) {
    const tier = MUTATION_CONFIG.tier1[targetRarity];
    const candidates = Object.keys(tier);
    
    // 按亲和度分类
    const affinity = candidates.filter(m => tier[m].chain === currentChain);
    const opposite = candidates.filter(m => tier[m].chain === oppositeChain);
    const neutral = candidates.filter(m => tier[m].chain !== currentChain && tier[m].chain !== oppositeChain);
    
    // 计算概率
    const roll = Math.random() * 100;
    let selected;
    
    if (targetRarity === 'elite') {
        // 升级到精英：使用配置的概率
        const prob = MUTATION_PROBABILITY.affinity.to_elite;
        if (roll < prob.affinity_chain && affinity.length > 0) {
            selected = affinity[Math.floor(Math.random() * affinity.length)];
        } else if (roll < prob.affinity_chain + prob.opposite_chain && opposite.length > 0) {
            selected = opposite[Math.floor(Math.random() * opposite.length)];
        } else if (neutral.length > 0) {
            selected = neutral[Math.floor(Math.random() * neutral.length)];
        } else {
            selected = candidates[Math.floor(Math.random() * candidates.length)];
        }
    } else {
        // 升级到传说：使用配置的概率
        const prob = MUTATION_PROBABILITY.affinity.to_legendary;
        
        if (roll < prob.affinity_chain && affinity.length > 0) {
            selected = affinity[Math.floor(Math.random() * affinity.length)];
        } else if (roll < prob.affinity_chain + prob.opposite_chain && opposite.length > 0) {
            selected = opposite[Math.floor(Math.random() * opposite.length)];
        } else if (neutral.length > 0) {
            selected = neutral[Math.floor(Math.random() * neutral.length)];
        } else {
            selected = candidates[Math.floor(Math.random() * candidates.length)];
        }
    }
    
    return { rarity: targetRarity, mutation: selected };
}

// 限制变异技能数量
function limitMutationSkills(animal, skillLimits) {
    if (!animal.mutations || !animal.mutations.skills) return;
    
    // 读取技能池以支持自定义技能
    const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    
    // 按稀有度分类技能
    const skillsByRarity = { basic: [], elite: [], legendary: [] };
    
    animal.mutations.skills.forEach(skillKey => {
        let found = false;
        
        // 首先在预定义配置中查找
        for (const [rarity, mutations] of Object.entries(MUTATION_CONFIG.tier1)) {
            for (const mutConfig of Object.values(mutations)) {
                if (mutConfig.skills && mutConfig.skills.includes(skillKey)) {
                    skillsByRarity[rarity].push(skillKey);
                    found = true;
                    return;
                }
            }
        }
        
        // 如果是自定义技能，从技能池中推断稀有度
        if (!found) {
            const customSkill = skillPool.find(s => s.key === skillKey);
            if (customSkill && customSkill.category) {
                // 根据category推断稀有度
                let rarity = 'basic'; // 默认为basic
                if (customSkill.category.includes('chaos') ||
                    customSkill.category.includes('holy') ||
                    customSkill.category.includes('psychic') ||
                    (customSkill.category.includes('thunder') && !customSkill.category.includes('lord'))) {
                    rarity = 'elite';
                } else if (customSkill.category.includes('eternal') ||
                           customSkill.category.includes('source') ||
                           customSkill.category.includes('lord')) {
                    rarity = 'legendary';
                }
                skillsByRarity[rarity].push(skillKey);
            } else {
                // 如果完全找不到，保留该技能（归类到basic）
                skillsByRarity.basic.push(skillKey);
            }
        }
    });
    
    // 限制每个稀有度的技能数量
    let limitedSkills = [];
    for (const [rarity, skills] of Object.entries(skillsByRarity)) {
        const limit = skillLimits[rarity];
        limitedSkills = limitedSkills.concat(skills.slice(0, limit));
    }
    
    // 更新技能列表
    animal.mutations.skills = limitedSkills;
    
    // 从装备槽中移除超出限制的技能
    if (animal.combatSkills && animal.combatSkills.equipped) {
        animal.combatSkills.equipped = animal.combatSkills.equipped.map(skillKey => {
            if (skillKey && !limitedSkills.includes(skillKey)) {
                return null;
            }
            return skillKey;
        });
    }
}

// 从技能池中获取对应变异类型的技能
function getSkillsFromPool(mutationType) {
    const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    
    const category = MUTATION_TO_CATEGORY_MAP[mutationType];
    if (!category) return [];
    
    // 筛选出对应类别的技能
    const matchingSkills = skillPool.filter(skill => skill.category === category);
    
    // 随机选择技能（基础级1个，精英级2个，传说级2个）
    const config = getMutationConfig(mutationType);
    const maxSkills = config?.rarity === 'basic' ? 1 : 2;
    
    // 打乱并选择
    const shuffled = matchingSkills.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxSkills).map(s => s.key);
}

// 获取变异配置
function getMutationConfig(mutationName) {
    for (const tier of Object.values(MUTATION_CONFIG.tier1)) {
        if (tier[mutationName]) return tier[mutationName];
    }
    return null;
}

// 获取技能名称列表
function getSkillNames(skillKeys) {
    const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    return skillKeys.map(skillKey => {
        const skill = MUTATION_SKILLS[skillKey];
        if (skill) return skill.name;
        
        const customSkill = skillPool.find(s => s.key === skillKey);
        return customSkill ? customSkill.name : '未知技能';
    });
}

// 获取技能显示HTML（卡片样式 - 类似繁殖结果）
function getSkillDisplayHtml(skillKeys, mutationRarity) {
    const skillPool = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    
    // 稀有度样式配置（与繁殖结果保持一致）
    const rarityStyles = {
        'basic': {
            bg: 'bg-gray-700',
            border: 'border-gray-500',
            badge: 'bg-gray-600 text-gray-300',
            label: '基础'
        },
        'elite': {
            bg: 'bg-purple-700',
            border: 'border-purple-400',
            badge: 'bg-purple-500 text-purple-100',
            label: '精英'
        },
        'legendary': {
            bg: 'bg-gradient-to-br from-orange-600 to-yellow-600',
            border: 'border-yellow-400',
            badge: 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white',
            label: '传说'
        }
    };
    
    const style = rarityStyles[mutationRarity] || rarityStyles['basic'];
    
    const skillCards = skillKeys.map(skillKey => {
        const skill = MUTATION_SKILLS[skillKey];
        const customSkill = skillPool.find(s => s.key === skillKey);
        
        const skillName = skill ? skill.name : (customSkill ? customSkill.name : '未知技能');
        const skillIcon = skill ? skill.icon : (customSkill ? customSkill.icon : '❓');
        
        return `
            <div class="${style.bg} hover:brightness-110 rounded p-2 text-center border ${style.border} transition-all flex flex-col items-center justify-center">
                <div class="text-2xl mb-1">${skillIcon}</div>
                <div class="text-xs font-bold text-white leading-tight mb-1">${skillName}</div>
                <span class="text-xs px-1.5 py-0.5 rounded ${style.badge} font-semibold">${style.label}</span>
            </div>
        `;
    }).join('');
    
    // 使用grid布局，每行最多2个技能卡片
    return `<div class="grid grid-cols-2 gap-2">${skillCards}</div>`;
}