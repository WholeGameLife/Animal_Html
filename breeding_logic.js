// ============================================
// 电子盆栽 - 繁育系统逻辑
// 实现完整的繁育机制
// ============================================

// 检查繁育条件
function checkBreedingRequirements(parent1, parent2) {
    const errors = [];
    
    // 检查物种是否相同（ID后4位必须一致）
    const p1Id = String(parent1.animalId || '');
    const p2Id = String(parent2.animalId || '');
    
    if (p1Id.length === 5 && p2Id.length === 5) {
        const p1Species = p1Id.slice(1); // 后4位
        const p2Species = p2Id.slice(1);
        
        if (p1Species !== p2Species) {
            errors.push(`不同物种无法繁殖`);
        }
    } else if (p1Id || p2Id) {
        // 有一方有ID但格式不对
        errors.push(`动物ID格式错误`);
    }
    
    // 检查发育阶段
    if (parent1.developmentStage !== BREEDING_CONFIG.requirements.development_stage) {
        errors.push(`${parent1.name} 尚未成年`);
    }
    if (parent2.developmentStage !== BREEDING_CONFIG.requirements.development_stage) {
        errors.push(`${parent2.name} 尚未成年`);
    }
    
    // 检查体力
    if (parent1.stamina <= BREEDING_CONFIG.requirements.min_stamina) {
        errors.push(`${parent1.name} 体力不足（需要>${BREEDING_CONFIG.requirements.min_stamina}）`);
    }
    if (parent2.stamina <= BREEDING_CONFIG.requirements.min_stamina) {
        errors.push(`${parent2.name} 体力不足（需要>${BREEDING_CONFIG.requirements.min_stamina}）`);
    }
    
    // 检查冷却期
    const now = Date.now();
    if (parent1.breedingCooldownUntil && parent1.breedingCooldownUntil > now) {
        const hoursLeft = Math.ceil((parent1.breedingCooldownUntil - now) / (1000 * 60 * 60));
        errors.push(`${parent1.name} 在冷却期（剩余${hoursLeft}小时）`);
    }
    if (parent2.breedingCooldownUntil && parent2.breedingCooldownUntil > now) {
        const hoursLeft = Math.ceil((parent2.breedingCooldownUntil - now) / (1000 * 60 * 60));
        errors.push(`${parent2.name} 在冷却期（剩余${hoursLeft}小时）`);
    }
    
    return {
        canBreed: errors.length === 0,
        errors: errors
    };
}

// 计算繁殖时间
function getBreedingDuration(parent1, parent2) {
    // 取父母中较高的稀有度对应的繁殖时间
    const rarity1 = parent1.rarity || '普通';
    const rarity2 = parent2.rarity || '普通';
    
    const level1 = RARITY_CONFIG.levels[rarity1] || 0;
    const level2 = RARITY_CONFIG.levels[rarity2] || 0;
    
    const higherRarity = level1 >= level2 ? rarity1 : rarity2;
    return BREEDING_CONFIG.duration[higherRarity] || BREEDING_CONFIG.duration['普通'];
}

// 计算子代潜力
function calculateOffspringPotential(parent1, parent2) {
    // 使用固定顺序排序以匹配配置
    const potentialOrder = { '平庸': 1, '超常': 2, '璀璨': 3 };
    const potentials = [parent1.potential, parent2.potential].sort((a, b) =>
        (potentialOrder[a] || 0) - (potentialOrder[b] || 0)
    );
    const key = potentials.join('+');
    
    const config = BREEDING_CONFIG.potential_inheritance[key];
    if (!config) {
        console.warn('未找到潜力继承配置:', key);
        return '平庸';
    }
    
    // 检查是否触发突变
    const mutationRoll = Math.random() * 100;
    if (mutationRoll < config.mutation_chance) {
        // 突变：等概率随机
        const mutRoll = Math.random() * 100;
        const mutProb = BREEDING_CONFIG.mutation_potential;
        if (mutRoll < mutProb['平庸']) return '平庸';
        if (mutRoll < mutProb['平庸'] + mutProb['超常']) return '超常';
        return '璀璨';
    }
    
    // 正常继承
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const [potential, prob] of Object.entries(config.probabilities)) {
        cumulative += prob;
        if (roll < cumulative) {
            return potential;
        }
    }
    
    return '平庸'; // Fallback
}

// 计算子代变异类型
function calculateOffspringMutation(parent1, parent2) {
    const p1Mutation = parent1.mutations?.tier1;
    const p2Mutation = parent2.mutations?.tier1;
    
    // 如果双方都没有变异，子代也没有
    if (!p1Mutation && !p2Mutation) {
        return null;
    }
    
    // 如果只有一方有变异，子代有50%概率继承
    if (!p1Mutation || !p2Mutation) {
        const mutation = p1Mutation || p2Mutation;
        return Math.random() < 0.5 ? mutation : null;
    }
    
    // 双方都有变异 - 根据稀有度组合查表
    const p1Config = getMutationConfig(p1Mutation);
    const p2Config = getMutationConfig(p2Mutation);
    const p1Rarity = p1Config?.rarity;
    const p2Rarity = p2Config?.rarity;
    
    // 确定使用哪个概率表
    let probTable = null;
    let key = null;
    
    if (p1Rarity === 'basic' && p2Rarity === 'basic') {
        key = `${p1Mutation}×${p2Mutation}`;
        probTable = BREEDING_CONFIG.mutation_inheritance_basic_basic[key];
    } else if (p1Rarity === 'elite' && p2Rarity === 'elite') {
        key = `${p1Mutation}×${p2Mutation}`;
        probTable = BREEDING_CONFIG.mutation_inheritance_elite_elite[key];
    } else if (p1Rarity === 'legendary' && p2Rarity === 'legendary') {
        key = `${p1Mutation}×${p2Mutation}`;
        probTable = BREEDING_CONFIG.mutation_inheritance_legendary_legendary[key];
    } else if ((p1Rarity === 'basic' && p2Rarity === 'elite') || (p1Rarity === 'elite' && p2Rarity === 'basic')) {
        key = `${p1Mutation}×${p2Mutation}`;
        probTable = BREEDING_CONFIG.mutation_inheritance_basic_elite[key];
    } else if ((p1Rarity === 'elite' && p2Rarity === 'legendary') || (p1Rarity === 'legendary' && p2Rarity === 'elite')) {
        key = `${p1Mutation}×${p2Mutation}`;
        probTable = BREEDING_CONFIG.mutation_inheritance_elite_legendary?.[key];
    }
    
    if (!probTable) {
        console.warn('未找到变异继承配置:', key, `(${p1Rarity} × ${p2Rarity})`);
        // 随机继承父母之一
        return Math.random() < 0.5 ? p1Mutation : p2Mutation;
    }
    
    // 检查繁育失败概率（精英×精英特有）
    if (probTable.fail && Math.random() * 100 < probTable.fail) {
        return null; // 繁育失败，无变异
    }
    
    // 根据概率表决定子代变异
    const roll = Math.random() * 100;
    let cumulative = 0;
    
    // 处理基础级结果
    if (probTable.basic) {
        if (typeof probTable.basic === 'object') {
            // 基础×基础 和 基础×精英格式
            for (const [mutation, prob] of Object.entries(probTable.basic)) {
                cumulative += prob;
                if (roll < cumulative) return mutation;
            }
        } else {
            // 数值型：传说×传说、精英×传说
            cumulative += probTable.basic;
            if (roll < cumulative) {
                const basicMutations = Object.keys(MUTATION_CONFIG.tier1.basic);
                return basicMutations[Math.floor(Math.random() * basicMutations.length)];
            }
        }
    } else {
        // 直接的基础级概率（基础×基础）
        for (const [mutation, prob] of Object.entries(probTable)) {
            if (mutation === 'elite' || mutation === 'legendary' || mutation === 'fail' || mutation === 'other_elite') continue;
            cumulative += prob;
            if (roll < cumulative) return mutation;
        }
    }
    
    // 处理精英级结果
    if (probTable.elite) {
        if (typeof probTable.elite === 'object') {
            for (const [mutation, prob] of Object.entries(probTable.elite)) {
                cumulative += prob;
                if (roll < cumulative) return mutation;
            }
        } else {
            // 传说×传说返回精英概率（需要从精英池中随机选择）
            cumulative += probTable.elite;
            if (roll < cumulative) {
                const eliteMutations = Object.keys(MUTATION_CONFIG.tier1.elite);
                return eliteMutations[Math.floor(Math.random() * eliteMutations.length)];
            }
        }
    }
    
    // 处理"其他精英级"（精英×传说特有）
    if (probTable.other_elite) {
        cumulative += probTable.other_elite;
        if (roll < cumulative) {
            // 从精英池中随机选择，排除父母类型
            const eliteMutations = Object.keys(MUTATION_CONFIG.tier1.elite);
            const parentEliteMutation = p1Rarity === 'elite' ? p1Mutation : p2Mutation;
            const otherElites = eliteMutations.filter(m => m !== parentEliteMutation);
            if (otherElites.length > 0) {
                return otherElites[Math.floor(Math.random() * otherElites.length)];
            }
            return eliteMutations[Math.floor(Math.random() * eliteMutations.length)];
        }
    }
    
    // 处理传说级结果
    if (probTable.legendary) {
        if (typeof probTable.legendary === 'object') {
            for (const [mutation, prob] of Object.entries(probTable.legendary)) {
                if (mutation === 'random') {
                    // 随机选择一个传说级
                    cumulative += prob;
                    if (roll < cumulative) {
                        const legendaryMutations = Object.keys(MUTATION_CONFIG.tier1.legendary);
                        return legendaryMutations[Math.floor(Math.random() * legendaryMutations.length)];
                    }
                } else {
                    cumulative += prob;
                    if (roll < cumulative) return mutation;
                }
            }
        }
    }
    
    // Fallback
    return Math.random() < 0.5 ? p1Mutation : p2Mutation;
}

// 计算子代初始属性
function calculateOffspringStats(parent1, parent2, potential) {
    const potentialMultiplier = BREEDING_CONFIG.potential_multipliers[potential] || 1.0;
    
    // 体力 = [(父体力+母体力)/4] × 潜力系数
    const stamina = Math.floor(((parent1.maxStamina + parent2.maxStamina) / BREEDING_CONFIG.offspring_stats.stamina_divisor) * potentialMultiplier);
    
    // 好感度 = (父好感度+母好感度)/10
    const favorability = Math.floor((parent1.favorability + parent2.favorability) / BREEDING_CONFIG.offspring_stats.favorability_divisor);
    
    // 战斗属性 = [(父属性+母属性)/父母总等级] × 潜力系数
    const totalLevel = parent1.level + parent2.level;
    const attack = Math.ceil(((parent1.abilities.combat.attack + parent2.abilities.combat.attack) / totalLevel) * potentialMultiplier);
    const defense = Math.ceil(((parent1.abilities.combat.defense + parent2.abilities.combat.defense) / totalLevel) * potentialMultiplier);
    const agility = Math.ceil(((parent1.abilities.combat.agility + parent2.abilities.combat.agility) / totalLevel) * potentialMultiplier);
    
    return {
        stamina: stamina,
        maxStamina: stamina,
        favorability: favorability,
        combat: {
            attack: attack,
            defense: defense,
            agility: agility
        }
    };
}

// 应用繁育冷却期
function applyBreedingCooldown(parent) {
    parent.breedingCooldownUntil = Date.now() + BREEDING_CONFIG.requirements.cooldown;
}

// 检查是否在冷却期
function isInBreedingCooldown(parent) {
    if (!parent.breedingCooldownUntil) return false;
    return parent.breedingCooldownUntil > Date.now();
}

// 获取冷却剩余时间（小时）
function getBreedingCooldownHours(parent) {
    if (!isInBreedingCooldown(parent)) return 0;
    return Math.ceil((parent.breedingCooldownUntil - Date.now()) / (1000 * 60 * 60));
}

// 从动物池获取子代模板（根据动物ID）
function getOffspringTemplate(parent1, parent2, offspringRarity) {
    const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
    
    // 提取物种编号（后4位）
    let speciesNumber = null;
    
    // 如果父母的animalId存在且格式正确
    const p1Id = parent1.animalId ? String(parent1.animalId) : '';
    const p2Id = parent2.animalId ? String(parent2.animalId) : '';
    
    if (p1Id.length === 5 && p2Id.length === 5) {
        const p1Species = p1Id.slice(1); // 提取后4位物种编号
        const p2Species = p2Id.slice(1);
        
        // 如果父母是同一物种，子代继承该物种
        if (p1Species === p2Species) {
            speciesNumber = p1Species;
        } else {
            // 父母不同物种，随机选择一方
            speciesNumber = Math.random() < 0.5 ? p1Species : p2Species;
        }
    } else if (p1Id.length === 5) {
        speciesNumber = p1Id.slice(1);
    } else if (p2Id.length === 5) {
        speciesNumber = p2Id.slice(1);
    }
    
    if (!speciesNumber) {
        console.warn('父母的animalId格式不正确，使用默认配置');
        return null;
    }
    
    // 根据子代稀有度确定前缀
    const rarityPrefix = {
        '普通': '1',
        '闪光': '2',
        '幻彩': '3',
        '星芒': '4'
    }[offspringRarity] || '1';
    
    // 组合成子代的animalId
    const offspringAnimalId = rarityPrefix + speciesNumber;
    
    console.log(`[繁育] 父母物种: ${p1Id}, ${p2Id} -> 子代ID: ${offspringAnimalId}`);
    
    // 根据子代animalId查找模板
    const template = animalPool.find(t => String(t.animalId) === offspringAnimalId);
    if (!template) {
        console.warn('未找到动物模板:', offspringAnimalId, '尝试查找同物种其他稀有度');
        // 如果找不到对应稀有度的模板，尝试查找同物种的其他稀有度
        const sameSpeciesTemplates = animalPool.filter(t => {
            const tId = String(t.animalId || '');
            return tId.length === 5 && tId.slice(1) === speciesNumber;
        });
        
        if (sameSpeciesTemplates.length > 0) {
            console.log('找到同物种模板:', sameSpeciesTemplates.map(t => t.animalId));
            // 使用找到的第一个模板
            return {
                template: sameSpeciesTemplates[0],
                rarityConfig: null,
                animalId: offspringAnimalId,
                templateKey: sameSpeciesTemplates[0].key,
                fallback: true
            };
        }
        
        return null;
    }
    
    return {
        template: template,
        rarityConfig: null,
        animalId: offspringAnimalId,
        templateKey: template.key
    };
}

// ============================================
// 血统因子系统 - 技能池权重调整
// ============================================

/**
 * 计算父母平均珍惜度 E
 * 珍惜度计算规则：
 * - 基础珍惜度 = 稀有度等级 × 20 (普通=1, 闪光=2, 幻彩=3, 星芒=4)
 * - 潜力加成 = 潜力等级 × 10 (平庸=0, 超常=1, 璀璨=2)
 * - 变异加成 = 变异稀有度 × 5 (无=0, 基础=1, 精英=2, 传说=3)
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @returns {number} 平均珍惜度 E (0-100)
 */
function calculateAveragePreciousness(parent1, parent2) {
    const rarityLevels = {
        '普通': 1,
        '闪光': 2,
        '幻彩': 3,
        '星芒': 4
    };
    
    const potentialLevels = {
        '平庸': 0,
        '超常': 1,
        '璀璨': 2
    };
    
    const mutationRarityLevels = {
        'basic': 1,
        'elite': 2,
        'legendary': 3
    };
    
    // 计算父方珍惜度
    const p1Rarity = rarityLevels[parent1.rarity || '普通'] || 1;
    const p1Potential = potentialLevels[parent1.potential || '平庸'] || 0;
    const p1MutationConfig = parent1.mutations?.tier1 ? getMutationConfig(parent1.mutations.tier1) : null;
    const p1Mutation = p1MutationConfig ? (mutationRarityLevels[p1MutationConfig.rarity] || 0) : 0;
    const preciousness1 = (p1Rarity * 20) + (p1Potential * 10) + (p1Mutation * 5);
    
    // 计算母方珍惜度
    const p2Rarity = rarityLevels[parent2.rarity || '普通'] || 1;
    const p2Potential = potentialLevels[parent2.potential || '平庸'] || 0;
    const p2MutationConfig = parent2.mutations?.tier1 ? getMutationConfig(parent2.mutations.tier1) : null;
    const p2Mutation = p2MutationConfig ? (mutationRarityLevels[p2MutationConfig.rarity] || 0) : 0;
    const preciousness2 = (p2Rarity * 20) + (p2Potential * 10) + (p2Mutation * 5);
    
    // 平均珍惜度
    const avgPreciousness = (preciousness1 + preciousness2) / 2;
    
    console.log(`[血统因子] 父方珍惜度: ${preciousness1}, 母方珍惜度: ${preciousness2}, 平均: ${avgPreciousness}`);
    
    return avgPreciousness;
}

/**
 * 根据平均珍惜度获取技能稀有度权重倍率
 * @param {number} avgPreciousness - 平均珍惜度 E
 * @returns {Object} 各稀有度的权重倍率 {common, rare, epic, legendary}
 */
function getSkillRarityMultipliers(avgPreciousness) {
    // 默认配置
    const defaultMultipliers = [
        { min: 0,  max: 20,  common: 1.0,  rare: 1.0,  epic: 1.0,   legendary: 1.0,   desc: '标准池，极难出货' },
        { min: 21, max: 40,  common: 0.8,  rare: 1.5,  epic: 2.0,   legendary: 1.5,   desc: '压缩低级，中级翻倍' },
        { min: 41, max: 60,  common: 0.5,  rare: 2.5,  epic: 4.0,   legendary: 3.0,   desc: '高级技能开始井喷' },
        { min: 61, max: 80,  common: 0.2,  rare: 3.0,  epic: 8.0,   legendary: 10.0,  desc: '史诗保底，传说露头' },
        { min: 81, max: 95,  common: 0.05, rare: 2.0,  epic: 15.0,  legendary: 30.0,  desc: '传说概率显著提升' },
        { min: 96, max: 100, common: 0.0,  rare: 1.0,  epic: 20.0,  legendary: 40.0,  desc: '剔除普通，传说狂欢' }
    ];
    
    // 从localStorage读取配置，如果没有则使用默认
    let multiplierRanges = defaultMultipliers;
    try {
        const saved = localStorage.getItem('BREEDING_MULTIPLIERS');
        if (saved) {
            multiplierRanges = JSON.parse(saved);
            console.log('[血统因子] 使用自定义配置');
        }
    } catch (e) {
        console.warn('[血统因子] 读取配置失败，使用默认配置', e);
    }
    
    // 找到对应的区间
    const range = multiplierRanges.find(r => avgPreciousness >= r.min && avgPreciousness <= r.max);
    
    if (!range) {
        console.warn('[血统因子] 珍惜度超出范围，使用默认倍率');
        return { common: 1.0, rare: 1.0, epic: 1.0, legendary: 1.0 };
    }
    
    console.log(`[血统因子] 珍惜度: ${avgPreciousness.toFixed(2)}, 区间: [${range.min}-${range.max}], ${range.desc}`);
    console.log(`[血统因子] 权重倍率 - 普通:×${range.common}, 稀有:×${range.rare}, 史诗:×${range.epic}, 传说:×${range.legendary}`);
    
    return {
        common: range.common,
        rare: range.rare,
        epic: range.epic,
        legendary: range.legendary
    };
}

/**
 * 根据父母血统因子调整技能池的稀有度权重
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @param {Object} baseRarityWeights - 基础稀有度权重 {common: 70, rare: 20, epic: 8, legendary: 2}
 * @returns {Object} 调整后的稀有度权重（归一化后总和保持不变）
 */
function adjustRarityWeightsByBloodline(parent1, parent2, baseRarityWeights) {
    // 计算平均珍惜度
    const avgPreciousness = calculateAveragePreciousness(parent1, parent2);
    
    // 获取权重倍率
    const multipliers = getSkillRarityMultipliers(avgPreciousness);
    
    // 计算原始总和
    const originalSum = baseRarityWeights.common + baseRarityWeights.rare + baseRarityWeights.epic + baseRarityWeights.legendary;
    
    // 应用倍率（未归一化）
    const rawAdjusted = {
        common: baseRarityWeights.common * multipliers.common,
        rare: baseRarityWeights.rare * multipliers.rare,
        epic: baseRarityWeights.epic * multipliers.epic,
        legendary: baseRarityWeights.legendary * multipliers.legendary
    };
    
    // 计算调整后的总和
    const adjustedSum = rawAdjusted.common + rawAdjusted.rare + rawAdjusted.epic + rawAdjusted.legendary;
    
    // 归一化：使总和回到原始值
    const adjustedWeights = {
        common: adjustedSum > 0 ? (rawAdjusted.common / adjustedSum) * originalSum : 0,
        rare: adjustedSum > 0 ? (rawAdjusted.rare / adjustedSum) * originalSum : 0,
        epic: adjustedSum > 0 ? (rawAdjusted.epic / adjustedSum) * originalSum : 0,
        legendary: adjustedSum > 0 ? (rawAdjusted.legendary / adjustedSum) * originalSum : 0
    };
    
    console.log(`[血统因子] 基础权重 - 普通:${baseRarityWeights.common}, 稀有:${baseRarityWeights.rare}, 史诗:${baseRarityWeights.epic}, 传说:${baseRarityWeights.legendary} (总和:${originalSum})`);
    console.log(`[血统因子] 应用倍率 - 普通:×${multipliers.common}, 稀有:×${multipliers.rare}, 史诗:×${multipliers.epic}, 传说:×${multipliers.legendary}`);
    console.log(`[血统因子] 调整后权重 - 普通:${adjustedWeights.common.toFixed(2)}, 稀有:${adjustedWeights.rare.toFixed(2)}, 史诗:${adjustedWeights.epic.toFixed(2)}, 传说:${adjustedWeights.legendary.toFixed(2)} (总和:${(adjustedWeights.common + adjustedWeights.rare + adjustedWeights.epic + adjustedWeights.legendary).toFixed(2)})`);
    
    // 计算实际概率（百分比）
    const totalWeight = adjustedWeights.common + adjustedWeights.rare + adjustedWeights.epic + adjustedWeights.legendary;
    console.log(`[血统因子] 实际概率 - 普通:${((adjustedWeights.common/totalWeight)*100).toFixed(2)}%, 稀有:${((adjustedWeights.rare/totalWeight)*100).toFixed(2)}%, 史诗:${((adjustedWeights.epic/totalWeight)*100).toFixed(2)}%, 传说:${((adjustedWeights.legendary/totalWeight)*100).toFixed(2)}%`);
    
    return adjustedWeights;
}

/**
 * 为子代生成初始技能（使用血统因子调整）
 * 子代在1级时获得1个技能
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @param {string} skillPoolKey - 技能池key
 * @returns {Array} 初始技能列表
 */
function generateOffspringInitialSkills(parent1, parent2, skillPoolKey) {
    if (!skillPoolKey) {
        console.log('[血统因子] 没有技能池key');
        return [];
    }
    
    // 加载技能池
    const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
    const skillPool = skillPools.find(p => p.key === skillPoolKey);
    
    if (!skillPool || !skillPool.skills || skillPool.skills.length === 0) {
        console.log('[血统因子] 技能池为空或不存在');
        return [];
    }
    
    // 加载技能库
    const skillLibrary = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    
    // 获取基础稀有度权重
    const baseRarityWeights = skillPool.rarityWeights || { common: 70, rare: 20, epic: 8, legendary: 2 };
    
    // 根据血统因子调整权重
    const adjustedWeights = adjustRarityWeightsByBloodline(parent1, parent2, baseRarityWeights);
    
    // 创建临时技能池配置（使用调整后的权重）
    const tempSkillPool = {
        ...skillPool,
        rarityWeights: adjustedWeights
    };
    
    // 使用调整后的权重选择1个初始技能
    const currentSkillKeys = new Set();
    const skill = selectRandomSkillWithAdjustedWeights(tempSkillPool, skillLibrary, 1, currentSkillKeys);
    
    if (skill) {
        console.log(`[血统因子] 子代获得初始技能: ${skill.skillName} (${skill.rarity})`);
        return [skill];
    }
    
    return [];
}

/**
 * 使用调整后的权重选择技能（与skill_acquisition.js中的selectRandomSkill类似，但使用自定义权重）
 * @param {Object} skillPool - 技能池对象（包含调整后的rarityWeights）
 * @param {Array} skillLibrary - 技能库
 * @param {number} currentLevel - 当前等级
 * @param {Set} excludeKeys - 已拥有的技能key集合
 * @returns {Object|null} 选中的技能对象
 */
function selectRandomSkillWithAdjustedWeights(skillPool, skillLibrary, currentLevel, excludeKeys) {
    // 过滤出符合条件的技能
    const availableSkills = skillPool.skills.filter(skillConfig => {
        if (excludeKeys.has(skillConfig.skillKey)) return false;
        const unlockLevel = skillConfig.unlockLevel || 1;
        if (currentLevel < unlockLevel) return false;
        return true;
    });
    
    if (availableSkills.length === 0) {
        console.log('[血统因子] 没有可用的技能');
        return null;
    }
    
    // 使用调整后的稀有度权重
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
        console.log('[血统因子] 没有任何稀有度有可用技能');
        return null;
    }
    
    // 构建稀有度权重数组
    const rarityWeightList = [];
    validRarities.forEach(rarity => {
        const weight = rarityWeights[rarity] || 0;
        if (weight > 0) {  // 只添加权重大于0的稀有度
            rarityWeightList.push({
                rarity: rarity,
                weight: weight
            });
        }
    });
    
    if (rarityWeightList.length === 0) {
        console.log('[血统因子] 所有稀有度权重为0');
        return null;
    }
    
    // 按权重随机选择稀有度
    const selectedRarityObj = weightedRandomSelection(rarityWeightList);
    const selectedRarity = selectedRarityObj ? selectedRarityObj.rarity : null;
    
    if (!selectedRarity) {
        console.log('[血统因子] 稀有度选择失败');
        return null;
    }
    
    console.log(`[血统因子] 抽取稀有度: ${selectedRarity}`);
    
    // 从该稀有度的技能中按权重随机选择
    const raritySkills = rarityAvailable[selectedRarity];
    
    if (!raritySkills || raritySkills.length === 0) {
        console.log('[血统因子] 该稀有度没有可用技能');
        return null;
    }
    
    const selectedSkillConfig = weightedRandomSelection(raritySkills.map(s => ({
        ...s,
        weight: s.weight || 1
    })));
    
    if (!selectedSkillConfig) {
        console.log('[血统因子] 权重随机失败');
        return null;
    }
    
    // 从技能库中获取完整技能信息
    const fullSkill = skillLibrary.find(s => s.key === selectedSkillConfig.skillKey);
    if (!fullSkill) {
        console.log('[血统因子] 技能库中找不到技能:', selectedSkillConfig.skillKey);
        return null;
    }
    
    return {
        skillKey: selectedSkillConfig.skillKey,
        skillName: fullSkill.name,
        skillIcon: fullSkill.icon,
        rarity: selectedRarity,
        unlockLevel: selectedSkillConfig.unlockLevel || 1,
        skillData: fullSkill
    };
}

/**
 * 权重随机选择（内部函数）
 * @param {Array} items - 带权重的项目数组 [{...item, weight: number}]
 * @returns {Object|null} 选中的项目
 */
function weightedRandomSelection(items) {
    if (items.length === 0) return null;
    if (items.length === 1) return items[0];
    
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (totalWeight === 0) {
        return items[Math.floor(Math.random() * items.length)];
    }
    
    let random = Math.random() * totalWeight;
    
    for (let item of items) {
        random -= (item.weight || 0);
        if (random <= 0) {
            return item;
        }
    }
    
    return items[items.length - 1];
}
