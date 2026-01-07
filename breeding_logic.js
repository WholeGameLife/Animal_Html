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
    }
    
    if (!probTable) {
        console.warn('未找到变异继承配置:', key);
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
        for (const [mutation, prob] of Object.entries(probTable.basic)) {
            cumulative += prob;
            if (roll < cumulative) return mutation;
        }
    } else {
        // 直接的基础级概率（基础×基础）
        for (const [mutation, prob] of Object.entries(probTable)) {
            if (mutation === 'elite' || mutation === 'legendary' || mutation === 'fail') continue;
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
    
    // 处理传说级结果
    if (probTable.legendary) {
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
    
    // 处理基础级回退（传说×传说）
    if (probTable.basic && typeof probTable.basic === 'number') {
        cumulative += probTable.basic;
        if (roll < cumulative) {
            const basicMutations = Object.keys(MUTATION_CONFIG.tier1.basic);
            return basicMutations[Math.floor(Math.random() * basicMutations.length)];
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
