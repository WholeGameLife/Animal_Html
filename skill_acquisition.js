/**
 * 技能获取系统
 * 动物在1级、10级、20级、30级时各获得1个技能（最多4个）
 * 技能从动物的技能池中根据权重和要求等级随机分配
 */

// 注意：SKILL_UNLOCK_LEVELS 和 MAX_SKILLS 应该在 animal_config.js 中定义
// 这里不再重复声明，直接使用全局变量

/**
 * 获取动物在指定等级应该拥有的技能
 * @param {Object} animal - 动物对象
 * @param {number} currentLevel - 当前等级
 * @param {Array} currentSkills - 当前已拥有的技能列表 [{skillKey, ...}]
 * @returns {Array} 新技能列表（如果有新技能解锁）
 */
function getAnimalSkillsAtLevel(animal, currentLevel, currentSkills = []) {
    // 如果动物没有技能池，返回空
    if (!animal.skillPoolKey) {
        console.log('动物没有关联技能池');
        return currentSkills;
    }

    // 加载技能池
    const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
    const skillPool = skillPools.find(p => p.key === animal.skillPoolKey);
    
    if (!skillPool || !skillPool.skills || skillPool.skills.length === 0) {
        console.log('技能池为空或不存在');
        return currentSkills;
    }

    // 加载技能库
    const skillLibrary = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');

    // 计算应该拥有的技能数量
    const targetSkillCount = SKILL_UNLOCK_LEVELS.filter(level => currentLevel >= level).length;
    const currentSkillCount = currentSkills.length;

    // 如果已达到上限或已拥有足够技能，不添加新技能
    if (currentSkillCount >= MAX_SKILLS || currentSkillCount >= targetSkillCount) {
        return currentSkills;
    }

    // 需要新增的技能数量
    const neededSkills = Math.min(targetSkillCount - currentSkillCount, MAX_SKILLS - currentSkillCount);
    
    console.log(`当前等级${currentLevel}，应拥有${targetSkillCount}个技能，当前${currentSkillCount}个，需新增${neededSkills}个`);

    // 获取新技能
    const newSkills = [...currentSkills];
    const currentSkillKeys = new Set(currentSkills.map(s => s.skillKey));

    for (let i = 0; i < neededSkills; i++) {
        const newSkill = selectRandomSkill(skillPool, skillLibrary, currentLevel, currentSkillKeys);
        if (newSkill) {
            newSkills.push(newSkill);
            currentSkillKeys.add(newSkill.skillKey);
            console.log(`✅ 获得新技能: ${newSkill.skillName} (${newSkill.rarity})`);
        }
    }

    return newSkills;
}

/**
 * 从技能池中随机选择一个技能
 * @param {Object} skillPool - 技能池对象
 * @param {Array} skillLibrary - 技能库
 * @param {number} currentLevel - 当前等级
 * @param {Set} excludeKeys - 已拥有的技能key集合
 * @returns {Object|null} 选中的技能对象
 */
function selectRandomSkill(skillPool, skillLibrary, currentLevel, excludeKeys) {
    // 过滤出符合条件的技能
    const availableSkills = skillPool.skills.filter(skillConfig => {
        // 排除已拥有的技能
        if (excludeKeys.has(skillConfig.skillKey)) return false;
        
        // 检查等级要求
        const unlockLevel = skillConfig.unlockLevel || 1;
        if (currentLevel < unlockLevel) return false;
        
        return true;
    });

    if (availableSkills.length === 0) {
        console.log('没有可用的技能');
        return null;
    }

    // 先按稀有度权重抽取稀有度
    const rarityWeights = skillPool.rarityWeights || { common: 70, rare: 20, epic: 8, legendary: 2 };
    
    // 统计各稀有度可用技能
    const rarityAvailable = {
        common: availableSkills.filter(s => s.rarity === 'common'),
        rare: availableSkills.filter(s => s.rarity === 'rare'),
        epic: availableSkills.filter(s => s.rarity === 'epic'),
        legendary: availableSkills.filter(s => s.rarity === 'legendary')
    };

    // 只考虑有可用技能的稀有度
    const validRarities = Object.keys(rarityAvailable).filter(r => rarityAvailable[r].length > 0);
    if (validRarities.length === 0) {
        console.log('没有任何稀有度有可用技能');
        return null;
    }

    // 构建稀有度权重数组（只包含有技能的稀有度）
    const rarityWeightList = [];
    validRarities.forEach(rarity => {
        rarityWeightList.push({
            rarity: rarity,
            weight: rarityWeights[rarity] || 0
        });
    });

    // 按权重随机选择稀有度
    const selectedRarityObj = weightedRandom(rarityWeightList);
    const selectedRarity = selectedRarityObj ? selectedRarityObj.rarity : null;
    
    if (!selectedRarity) {
        console.log('稀有度选择失败');
        return null;
    }
    
    console.log(`抽取稀有度: ${selectedRarity}`);

    // 从该稀有度的技能中按权重随机选择
    const raritySkills = rarityAvailable[selectedRarity];
    
    if (!raritySkills || raritySkills.length === 0) {
        console.log('该稀有度没有可用技能');
        return null;
    }
    const selectedSkillConfig = weightedRandom(raritySkills.map(s => ({
        ...s,
        weight: s.weight || 0
    })));

    if (!selectedSkillConfig) {
        console.log('权重随机失败');
        return null;
    }

    // 从技能库中获取完整技能信息
    const fullSkill = skillLibrary.find(s => s.key === selectedSkillConfig.skillKey);
    if (!fullSkill) {
        console.log('技能库中找不到技能:', selectedSkillConfig.skillKey);
        return null;
    }

    return {
        skillKey: selectedSkillConfig.skillKey,
        skillName: fullSkill.name,
        skillIcon: fullSkill.icon,
        rarity: selectedSkillConfig.rarity,
        unlockLevel: selectedSkillConfig.unlockLevel || 1,
        // 保存完整技能数据（游戏中使用）
        skillData: fullSkill
    };
}

/**
 * 权重随机选择
 * @param {Array} items - 带权重的项目数组 [{...item, weight: number}]
 * @returns {Object|null} 选中的项目
 */
function weightedRandom(items) {
    if (items.length === 0) return null;
    if (items.length === 1) return items[0];

    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight === 0) {
        // 如果所有权重都是0，随机选择
        return items[Math.floor(Math.random() * items.length)];
    }

    let random = Math.random() * totalWeight;
    
    for (let item of items) {
        random -= (item.weight || 0);
        if (random <= 0) {
            return item;
        }
    }

    // 容错：返回最后一个
    return items[items.length - 1];
}

/**
 * 检查动物在升级时是否应该获得新技能
 * @param {number} oldLevel - 旧等级
 * @param {number} newLevel - 新等级
 * @returns {boolean} 是否跨越了技能解锁等级
 */
function shouldUnlockNewSkill(oldLevel, newLevel) {
    return SKILL_UNLOCK_LEVELS.some(unlockLevel => 
        oldLevel < unlockLevel && newLevel >= unlockLevel
    );
}

/**
 * 获取下一个技能解锁等级
 * @param {number} currentLevel - 当前等级
 * @returns {number|null} 下一个解锁等级，如果没有则返回null
 */
function getNextSkillUnlockLevel(currentLevel) {
    const nextLevel = SKILL_UNLOCK_LEVELS.find(level => level > currentLevel);
    return nextLevel || null;
}

/**
 * 模拟技能获取（用于测试）
 * @param {Object} animal - 动物对象
 * @returns {Object} 测试结果
 */
function simulateSkillAcquisition(animal) {
    const results = [];
    let skills = [];

    SKILL_UNLOCK_LEVELS.forEach(level => {
        const newSkills = getAnimalSkillsAtLevel(animal, level, skills);
        const addedSkills = newSkills.filter(s => 
            !skills.some(old => old.skillKey === s.skillKey)
        );
        
        if (addedSkills.length > 0) {
            results.push({
                level: level,
                skills: addedSkills.map(s => ({
                    name: s.skillName,
                    rarity: s.rarity,
                    icon: s.skillIcon
                }))
            });
        }
        
        skills = newSkills;
    });

    return {
        totalSkills: skills.length,
        unlockHistory: results,
        finalSkills: skills
    };
}

// 浏览器环境下不需要模块导出
// 所有函数都是全局函数，可以直接在其他脚本中使用