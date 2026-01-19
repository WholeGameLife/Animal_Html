// ============================================
// 电子盆栽 - 繁育系统逻辑
// 实现完整的繁育机制
// ============================================

// 配对系统 - 检查配对关系
function checkMateRelationship(animal1, animal2) {
    // 检查是否已有配偶
    const a1HasMate = animal1.mateId && animal1.mateId !== null;
    const a2HasMate = animal2.mateId && animal2.mateId !== null;
    
    // 如果双方都没有配偶，返回可以配对
    if (!a1HasMate && !a2HasMate) {
        return { canMate: true, isPaired: false };
    }
    
    // 如果双方互为配偶，返回已配对
    if (animal1.mateId === animal2.id && animal2.mateId === animal1.id) {
        return { canMate: true, isPaired: true };
    }
    
    // 其他情况都不能配对
    return { canMate: false, isPaired: false };
}

// 配对两只动物
function pairAnimals(animal1, animal2) {
    animal1.mateId = animal2.id;
    animal2.mateId = animal1.id;
    console.log(`[配对] ${animal1.name} 和 ${animal2.name} 成为配偶`);
}

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
    
    // 检查配偶关系（只检查是否有其他配偶，未配对不算错误）
    const mateCheck = checkMateRelationship(parent1, parent2);
    if (!mateCheck.canMate) {
        errors.push(`${parent1.name} 或 ${parent2.name} 已有其他配偶`);
    }
    // 注意：未配对不报错，因为首次繁殖会自动配对
    
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
    // 安全检查
    if (!parent1 || !parent2) {
        console.warn('[血统因子] 父母数据不完整，返回默认珍惜度20');
        return 20;
    }
    
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
    
    
    return adjustedWeights;
}

/**
 * 计算子代的繁育代数
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @returns {number} 子代代数
 */
function calculateOffspringGeneration(parent1, parent2) {
    // 检查是否同一物种（animalId的后4位相同）
    const p1Id = String(parent1.animalId || '');
    const p2Id = String(parent2.animalId || '');
    
    if (p1Id.length !== 5 || p2Id.length !== 5) {
        return 1; // 如果ID格式不对，默认为第1代
    }
    
    const p1Species = p1Id.slice(1);
    const p2Species = p2Id.slice(1);
    
    if (p1Species !== p2Species) {
        return 1; // 不同物种，重新开始计代
    }
    
    // 计算基础代数：max(父代数, 母代数) + 1
    const p1Gen = parent1.speciesGeneration || 1;
    const p2Gen = parent2.speciesGeneration || 1;
    let baseGeneration = Math.max(p1Gen, p2Gen) + 1;
    
    // 如果同一对父母已经繁育过，根据繁育历史调整代数
    // 初始化繁育历史
    if (!parent1.breedingHistory) parent1.breedingHistory = [];
    if (!parent2.breedingHistory) parent2.breedingHistory = [];
    
    // 查找与当前配偶的繁育记录
    const p1RecordsWithP2 = parent1.breedingHistory.filter(r => r.mateId === parent2.id);
    const p2RecordsWithP1 = parent2.breedingHistory.filter(r => r.mateId === parent1.id);
    
    // 获取这对父母已经繁育的次数（取较大值以防不同步）
    const breedingCount = Math.max(p1RecordsWithP2.length, p2RecordsWithP1.length);
    
    // 代数 = 基础代数 + 繁育次数
    // 第1次繁育：baseGeneration + 0
    // 第2次繁育：baseGeneration + 1
    // 第3次繁育：baseGeneration + 2
    const offspringGen = baseGeneration + breedingCount;
    
    console.log(`[代数追踪] 父方代数: ${p1Gen}, 母方代数: ${p2Gen}, 繁育次数: ${breedingCount}, 子代代数: ${offspringGen}`);
    
    return offspringGen;
}

/**
 * 根据代数计算保底传说技能数量
 * @param {number} generation - 繁育代数
 * @returns {number} 保底传说技能数量
 *
 * 新保底机制：只在第5、15、30代触发
 */
function getGuaranteedLegendarySkillCount(generation) {
    // 精确匹配特定代数
    if (generation === 30) return 3;
    if (generation === 15) return 2;
    if (generation === 5) return 1;
    return 0; // 其他代数没有保底
}

/**
 * 从父母技能池中随机遗传技能
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @param {number} count - 需要遗传的技能数量
 * @param {Set} excludeKeys - 已获得的技能key集合（如保底技能）
 * @returns {Array} 遗传的技能列表
 */
function inheritSkillsFromParents(parent1, parent2, count, excludeKeys) {
    const skillLibrary = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
    
    // 收集父母的所有技能（变异技能 + 战斗技能）
    const parentSkills = [];
    
    // 父方的技能
    if (parent1.mutations?.skills) {
        parent1.mutations.skills.forEach(key => parentSkills.push({ key, source: 'father' }));
    }
    if (parent1.combatSkills?.available) {
        parent1.combatSkills.available.forEach(key => parentSkills.push({ key, source: 'father' }));
    }
    
    // 母方的技能
    if (parent2.mutations?.skills) {
        parent2.mutations.skills.forEach(key => parentSkills.push({ key, source: 'mother' }));
    }
    if (parent2.combatSkills?.available) {
        parent2.combatSkills.available.forEach(key => parentSkills.push({ key, source: 'mother' }));
    }
    
    // 去重并排除已有技能
    const uniqueSkills = [];
    const seenKeys = new Set();
    parentSkills.forEach(skill => {
        if (!seenKeys.has(skill.key) && !excludeKeys.has(skill.key)) {
            seenKeys.add(skill.key);
            uniqueSkills.push(skill);
        }
    });
    
    if (uniqueSkills.length === 0) {
        console.log('[技能遗传] 父母没有可遗传的技能');
        return [];
    }
    
    // 随机选择指定数量的技能
    const shuffled = [...uniqueSkills].sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(count, shuffled.length);
    const inheritedSkills = [];
    
    for (let i = 0; i < selectedCount; i++) {
        const skillKey = shuffled[i].key;
        const source = shuffled[i].source;
        const parent = source === 'father' ? parent1 : parent2;
        
        const fullSkill = skillLibrary.find(s => s.key === skillKey);
        
        if (!fullSkill) {
            // 如果不在技能库中，尝试从预定义技能查找
            const predefinedSkill = COMBAT_SKILLS[skillKey] || MUTATION_SKILLS[skillKey];
            if (predefinedSkill) {
                console.log(`[技能遗传] 遗传预定义技能: ${predefinedSkill.name}`);
                inheritedSkills.push({
                    skillKey: skillKey,
                    skillName: predefinedSkill.name,
                    skillIcon: predefinedSkill.icon,
                    rarity: 'common',
                    unlockLevel: 1,
                    skillData: predefinedSkill,
                    source: source
                });
            }
            continue;
        }
        
        // 获取技能稀有度和解锁等级
        let rarity = 'common';
        let unlockLevel = 1;
        
        // 从父母的acquiredSkills中查找稀有度
        if (parent.acquiredSkills) {
            const acquired = parent.acquiredSkills.find(s => s.skillKey === skillKey);
            if (acquired) {
                rarity = acquired.rarity || 'common';
                unlockLevel = acquired.unlockLevel || 1;
            }
        }
        
        // 如果没找到，从技能池配置中获取
        if (rarity === 'common' && parent.templateKey) {
            const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
            const template = animalPool.find(t => t.key === parent.templateKey);
            if (template && template.skillPoolKey) {
                const relatedPool = skillPools.find(p => p.key === template.skillPoolKey);
                if (relatedPool && relatedPool.skills) {
                    const skillConfig = relatedPool.skills.find(s => s.skillKey === skillKey);
                    if (skillConfig) {
                        rarity = skillConfig.rarity || 'common';
                        unlockLevel = skillConfig.unlockLevel || 1;
                    }
                }
            }
        }
        
        inheritedSkills.push({
            skillKey: skillKey,
            skillName: fullSkill.name,
            skillIcon: fullSkill.icon,
            rarity: rarity,
            unlockLevel: unlockLevel,
            skillData: fullSkill,
            source: source  // 'father' 或 'mother'
        });
        
        console.log(`[技能遗传] 遗传技能: ${fullSkill.name} (${rarity}, Lv.${unlockLevel}) 来自${source === 'father' ? '父方' : '母方'}`);
    }
    
    return inheritedSkills;
}

/**
 * 为子代生成初始技能（新机制：3个遗传 + 3个技能池 + 保底）
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @param {string} skillPoolKey - 技能池key
 * @param {number} generation - 子代代数（默认1）
 * @returns {Array} 初始技能列表
 */
function generateOffspringInitialSkills(parent1, parent2, skillPoolKey, generation = 1) {
    if (!skillPoolKey) {
        console.log('[子代技能] 没有技能池key');
        return [];
    }
    
    const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
    const skillPool = skillPools.find(p => p.key === skillPoolKey);
    
    if (!skillPool || !skillPool.skills || skillPool.skills.length === 0) {
        console.log('[子代技能] 技能池为空或不存在');
        return [];
    }
    
    const skillLibrary = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    const baseRarityWeights = skillPool.rarityWeights || { common: 70, rare: 20, epic: 8, legendary: 2 };
    
    const allSkills = [];
    const currentSkillKeys = new Set();
    
    // 1. 检查代数保底（第5、15、30代）
    const guaranteedLegendaryCount = getGuaranteedLegendarySkillCount(generation);
    
    if (guaranteedLegendaryCount > 0) {
        console.log(`[代数保底] 第${generation}代，保底${guaranteedLegendaryCount}个传说技能`);
        
        const legendarySkills = skillPool.skills.filter(s => s && s.rarity === 'legendary');
        
        if (legendarySkills.length > 0) {
            const shuffled = [...legendarySkills].sort(() => Math.random() - 0.5);
            const selectedCount = Math.min(guaranteedLegendaryCount, shuffled.length);
            
            for (let i = 0; i < selectedCount; i++) {
                const legendarySkillConfig = shuffled[i];
                const fullSkill = skillLibrary.find(s => s.key === legendarySkillConfig.skillKey);
                
                if (fullSkill && !currentSkillKeys.has(legendarySkillConfig.skillKey)) {
                    allSkills.push({
                        skillKey: legendarySkillConfig.skillKey,
                        skillName: fullSkill.name,
                        skillIcon: fullSkill.icon,
                        rarity: 'legendary',
                        unlockLevel: 1,
                        skillData: fullSkill,
                        guaranteed: true
                    });
                    currentSkillKeys.add(legendarySkillConfig.skillKey);
                    console.log(`[代数保底] 保底获得传说技能: ${fullSkill.name}`);
                }
            }
        }
    }
    
    // 2. 从父母技能中随机遗传（最多3个，排除保底技能）
    const inheritCount = Math.min(3, 6 - currentSkillKeys.size);
    if (inheritCount > 0) {
        const inheritedSkills = inheritSkillsFromParents(parent1, parent2, inheritCount, currentSkillKeys);
        inheritedSkills.forEach(skill => {
            allSkills.push(skill);
            currentSkillKeys.add(skill.skillKey);
        });
        console.log(`[技能遗传] 从父母遗传了${inheritedSkills.length}个技能`);
    }
    
    // 3. 通过技能池获得剩余技能（使用血统因子调整权重）
    const poolSkillCount = 6 - currentSkillKeys.size;
    if (poolSkillCount > 0) {
        console.log(`[技能池] 需要从技能池获得${poolSkillCount}个技能`);
        
        const adjustedWeights = adjustRarityWeightsByBloodline(parent1, parent2, baseRarityWeights);
        const tempSkillPool = {
            ...skillPool,
            rarityWeights: adjustedWeights
        };
        
        for (let i = 0; i < poolSkillCount; i++) {
            const skill = selectRandomSkillWithAdjustedWeights(tempSkillPool, skillLibrary, 1, currentSkillKeys);
            if (skill) {
                allSkills.push(skill);
                currentSkillKeys.add(skill.skillKey);
                console.log(`[技能池] 获得技能: ${skill.skillName} (${skill.rarity})`);
            }
        }
    }
    
    console.log(`[子代技能] 总共获得${allSkills.length}个技能`);
    return allSkills;
}

/**
 * 为子代生成初始技能（纯技能池版本 - 完全通过加权随机获得6个技能）
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @param {string} skillPoolKey - 技能池key
 * @param {number} generation - 子代代数（默认1）
 * @returns {Array} 初始技能列表
 */
function generateOffspringSkillsPurePool(parent1, parent2, skillPoolKey, generation = 1) {
    if (!skillPoolKey) {
        console.log('[纯技能池] 没有技能池key');
        return [];
    }
    
    const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
    const skillPool = skillPools.find(p => p.key === skillPoolKey);
    
    if (!skillPool || !skillPool.skills || skillPool.skills.length === 0) {
        console.log('[纯技能池] 技能池为空或不存在');
        return [];
    }
    
    const skillLibrary = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
    const baseRarityWeights = skillPool.rarityWeights || { common: 70, rare: 20, epic: 8, legendary: 2 };
    
    const allSkills = [];
    const currentSkillKeys = new Set();
    
    // 通过血统因子调整权重后，随机获得6个技能
    console.log(`[纯技能池] 为第${generation}代生成6个技能`);
    
    const adjustedWeights = adjustRarityWeightsByBloodline(parent1, parent2, baseRarityWeights);
    const tempSkillPool = {
        ...skillPool,
        rarityWeights: adjustedWeights
    };
    
    for (let i = 0; i < 6; i++) {
        const skill = selectRandomSkillWithAdjustedWeights(tempSkillPool, skillLibrary, 1, currentSkillKeys);
        if (skill) {
            // 标记为纯技能池获得
            skill.source = 'pure_pool';
            allSkills.push(skill);
            currentSkillKeys.add(skill.skillKey);
            console.log(`[纯技能池] 获得技能${i+1}: ${skill.skillName} (${skill.rarity})`);
        }
    }
    
    console.log(`[纯技能池] 总共获得${allSkills.length}个技能`);
    return allSkills;
}

/**
 * 创建两个子代选项供玩家选择
 * @param {Object} parent1 - 父方
 * @param {Object} parent2 - 母方
 * @param {number} color - 子代颜色
 * @returns {Object} 包含两个子代选项的对象 {option1, option2}
 */
function createTwoOffspringOptions(parent1, parent2, color) {
    // 计算共同的基础属性
    const offspringGeneration = calculateOffspringGeneration(parent1, parent2);
    const offspringRarity = calculateOffspringRarity(parent1.rarity || '普通', parent2.rarity || '普通');
    const offspringPotential = calculateOffspringPotential(parent1, parent2);
    const offspringMutation = calculateOffspringMutation(parent1, parent2);
    const templateInfo = getOffspringTemplate(parent1, parent2, offspringRarity);
    
    // 创建两个基础子代对象（除了技能外，其他属性相同）
    const createBaseOffspring = () => {
        const animalId = crypto.randomUUID();
        
        if (templateInfo && templateInfo.template) {
            const template = templateInfo.template;
            return {
                id: animalId,
                animalId: templateInfo.animalId,
                templateKey: templateInfo.templateKey,
                type: template.modelShape || 'sphere',
                name: template.name,
                originalName: template.name,
                color: parseInt(template.color.replace('#', ''), 16),
                avatarData: template.avatarData || null,
                isWild: false,
                isPlaced: false,
                level: 1,
                gender: Math.random() > 0.5 ? '雄' : '雌',
                experience: 0,
                experienceToNextLevel: template.baseExp || LEVEL_CONFIG.baseExperience,
                stamina: template.stamina || 70,
                maxStamina: template.stamina || 70,
                potential: offspringPotential,
                favorability: template.favorability || 0,
                element: template.element || (Math.random() > 0.5 ? parent1.element : parent2.element),
                developmentStage: '幼年期',
                rarity: offspringRarity,
                speciesGeneration: offspringGeneration,
                abilities: {
                    combat: {
                        attack: template.attack || 10,
                        defense: template.defense || 5,
                        agility: template.agility || 8
                    }
                },
                isInjured: false,
                injuryTimer: 0,
                combatSkills: { equipped: [], available: [] },
                mutations: { tier1: offspringMutation, tier2: null, skills: [], inheritedSkills: [], currentSkills: [] },
                mutationCount: 0,
                templateSkillsUnlocked: [],
                acquiredSkills: [],
                breedingHistory: [],
                mateId: null
            };
        } else {
            const nameIndex = Math.floor(Math.random() * ANIMAL_NAMES.length);
            const offspringStats = calculateOffspringStats(parent1, parent2, offspringPotential);
            
            return {
                id: animalId,
                animalId: null,
                templateKey: null,
                type: 'sphere',
                name: `${ANIMAL_NAMES[nameIndex]}${gameState.animals.length + 1}`,
                originalName: `${ANIMAL_NAMES[nameIndex]}${gameState.animals.length + 1}`,
                color: color,
                isWild: false,
                isPlaced: false,
                level: 1,
                gender: Math.random() > 0.5 ? '雄' : '雌',
                experience: 0,
                experienceToNextLevel: LEVEL_CONFIG.baseExperience,
                stamina: offspringStats.stamina,
                maxStamina: offspringStats.maxStamina,
                potential: offspringPotential,
                favorability: offspringStats.favorability,
                element: Math.random() > 0.5 ? parent1.element : parent2.element,
                developmentStage: '幼年期',
                rarity: offspringRarity,
                speciesGeneration: offspringGeneration,
                abilities: {
                    combat: { ...offspringStats.combat }
                },
                isInjured: false,
                injuryTimer: 0,
                combatSkills: { equipped: [], available: [] },
                mutations: { tier1: offspringMutation, tier2: null, skills: [], inheritedSkills: [], currentSkills: [] },
                mutationCount: 0,
                templateSkillsUnlocked: [],
                acquiredSkills: [],
                breedingHistory: [],
                mateId: null
            };
        }
    };
    
    // 选项1：3个遗传 + 3个技能池
    const option1 = createBaseOffspring();
    if (option1.templateKey) {
        const skills1 = generateOffspringInitialSkills(parent1, parent2, templateInfo.template.skillPoolKey, offspringGeneration);
        option1.acquiredSkills = skills1.map(s => ({
            skillKey: s.skillKey,
            acquiredAtLevel: 1,
            unlockLevel: s.unlockLevel || 1,
            rarity: s.rarity,
            guaranteed: s.guaranteed || false,
            source: s.source || 'unknown'
        }));
        skills1.forEach(s => {
            if ((s.unlockLevel || 1) <= 1 && !option1.combatSkills.available.includes(s.skillKey)) {
                option1.combatSkills.available.push(s.skillKey);
            }
            if (!COMBAT_SKILLS[s.skillKey]) {
                COMBAT_SKILLS[s.skillKey] = {
                    name: s.skillData.name,
                    icon: s.skillData.icon,
                    desc: s.skillData.description || s.skillData.desc || '无描述',
                    type: s.skillData.type,
                    cooldown: s.skillData.params?.cooldown || 0
                };
            }
        });
    }
    
    // 选项2：纯技能池（6个全部从技能池获取）
    const option2 = createBaseOffspring();
    if (option2.templateKey) {
        const skills2 = generateOffspringSkillsPurePool(parent1, parent2, templateInfo.template.skillPoolKey, offspringGeneration);
        option2.acquiredSkills = skills2.map(s => ({
            skillKey: s.skillKey,
            acquiredAtLevel: 1,
            unlockLevel: s.unlockLevel || 1,
            rarity: s.rarity,
            guaranteed: false,
            source: 'pure_pool'
        }));
        skills2.forEach(s => {
            if ((s.unlockLevel || 1) <= 1 && !option2.combatSkills.available.includes(s.skillKey)) {
                option2.combatSkills.available.push(s.skillKey);
            }
            if (!COMBAT_SKILLS[s.skillKey]) {
                COMBAT_SKILLS[s.skillKey] = {
                    name: s.skillData.name,
                    icon: s.skillData.icon,
                    desc: s.skillData.description || s.skillData.desc || '无描述',
                    type: s.skillData.type,
                    cooldown: s.skillData.params?.cooldown || 0
                };
            }
        });
    }
    
    // 处理变异技能继承（两个选项相同）
    if (offspringMutation) {
        const mutationConfig = getMutationConfig(offspringMutation);
        if (mutationConfig) {
            let mutationSkills = getSkillsFromPool(offspringMutation);
            if (mutationSkills.length === 0 && mutationConfig.skills) {
                mutationSkills = mutationConfig.skills;
            }
            option1.mutations.skills = [...mutationSkills];
            option1.mutations.currentSkills = [...mutationSkills];
            option2.mutations.skills = [...mutationSkills];
            option2.mutations.currentSkills = [...mutationSkills];
        }
    }
    
    const inheritedSkills = calculateSkillInheritance(parent1, parent2, option1);
    if (inheritedSkills.length > 0) {
        option1.mutations.inheritedSkills = [...inheritedSkills];
        option2.mutations.inheritedSkills = [...inheritedSkills];
    }
    
    return { option1, option2 };
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
    // 过滤出符合条件的技能（添加安全检查）
    const availableSkills = skillPool.skills.filter(skillConfig => {
        if (!skillConfig || !skillConfig.skillKey) return false;
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
    
    // 统计各稀有度可用技能（添加安全检查）
    const rarityAvailable = {
        common: availableSkills.filter(s => s && s.rarity === 'common'),
        rare: availableSkills.filter(s => s && s.rarity === 'rare'),
        epic: availableSkills.filter(s => s && s.rarity === 'epic'),
        legendary: availableSkills.filter(s => s && s.rarity === 'legendary')
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
        skillData: fullSkill,
        source: 'pool'  // 标记为技能池获得
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
