/**
 * 作物稀有度系统
 * 
 * 功能：
 * - 所有作物收获周期为游戏时间3天，分为幼苗期、生长期、成熟期（各1天）
 * - 作物有6种稀有度：白、绿、蓝、紫、金、红
 * - 稀有度受三个生长阶段的天气影响
 * - 常规天气：每个阶段+1%变异概率
 * - 极端天气：每个阶段+10%变异概率
 * - 变异结果分布：绿70%、蓝20%、紫6%、金3%、红1%
 * - 不变异则为白色稀有度
 */

class CropRaritySystem {
    constructor(gameTimeSystem) {
        this.gameTimeSystem = gameTimeSystem;
        
        // 稀有度配置（仅用于收藏和展示，不影响产量）
        this.rarities = {
            white: { name: '白色', icon: '⚪', color: '#FFFFFF' },
            green: { name: '绿色', icon: '🟢', color: '#4CAF50' },
            blue: { name: '蓝色', icon: '🔵', color: '#2196F3' },
            purple: { name: '紫色', icon: '🟣', color: '#9C27B0' },
            gold: { name: '金色', icon: '🟡', color: '#FFD700' },
            red: { name: '红色', icon: '🔴', color: '#F44336' }
        };
        
        // 变异结果分布（如果发生变异）
        this.mutationDistribution = [
            { rarity: 'green', probability: 0.70 },  // 70%
            { rarity: 'blue', probability: 0.20 },   // 20%
            { rarity: 'purple', probability: 0.06 }, // 6%
            { rarity: 'gold', probability: 0.03 },   // 3%
            { rarity: 'red', probability: 0.01 }     // 1%
        ];
        
        // 天气类型分类
        this.weatherCategories = {
            normal: ['晴', '阴', '小雨'],           // 常规天气：+1%
            extreme: ['中雨', '暴雨', '台风', '雷暴']  // 极端天气：+10%
        };
        
        // 作物数据存储
        // 格式: { farmId: { row_col: cropData } }
        this.crops = {};
        
        // 生长阶段定义（游戏时间）
        this.STAGE_DURATION = 1; // 每个阶段1游戏天
        this.TOTAL_GROWTH_TIME = 3; // 总共3游戏天
        
        // 一游戏天 = 现实6分钟
        this.REAL_TIME_PER_GAME_DAY = 6 * 60 * 1000; // 360000ms
        
        console.log('🌟 作物稀有度系统初始化完成');
    }
    
    /**
     * 种植作物（初始化作物数据）
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {string} cropType - 作物类型
     * @param {number} baseMutationRate - 基础变异概率（0-1，如0.05表示5%）
     */
    plantCrop(farmId, row, col, cropType, baseMutationRate = 0.05) {
        // 从调试设置中读取基础变异率(如果有)
        const debugSettings = JSON.parse(localStorage.getItem('debugSettings') || '{}');
        if (debugSettings.baseMutationRate !== undefined) {
            // 注意：种子的稀有度加成会在game3d.html的plantSingleCrop中额外添加
            // 这里的baseMutationRate通常是作物类型的基础值 + 种子稀有度加成
            // 所以只在baseMutationRate是默认值时才替换
            if (baseMutationRate === 0.05 || baseMutationRate === 0.08 || baseMutationRate === 0.10) {
                baseMutationRate = debugSettings.baseMutationRate;
            }
        }
        const key = `${row}_${col}`;
        
        if (!this.crops[farmId]) {
            this.crops[farmId] = {};
        }
        
        const now = Date.now();
        const timeInfo = this.gameTimeSystem.getCurrentTime();
        const currentWeather = timeInfo.weather || '晴';
        
        // 记录种植时的游戏时间
        const plantedGameTime = {
            year: timeInfo.year,
            week: timeInfo.week,
            day: timeInfo.day
        };
        
        // 创建作物数据
        this.crops[farmId][key] = {
            type: cropType,
            plantedAt: now,
            plantedGameTime: plantedGameTime, // 新增：游戏时间
            baseMutationRate: baseMutationRate,
            
            // 三个生长阶段
            stages: {
                seedling: {  // 幼苗期（第1天）
                    name: '幼苗期',
                    startTime: now,
                    endTime: now + this.REAL_TIME_PER_GAME_DAY,
                    weather: currentWeather,
                    weatherBonus: this.getWeatherBonus(currentWeather)
                },
                growing: {   // 生长期（第2天）
                    name: '生长期',
                    startTime: now + this.REAL_TIME_PER_GAME_DAY,
                    endTime: now + this.REAL_TIME_PER_GAME_DAY * 2,
                    weather: null,  // 将在进入该阶段时记录
                    weatherBonus: 0
                },
                mature: {    // 成熟期（第3天）
                    name: '成熟期',
                    startTime: now + this.REAL_TIME_PER_GAME_DAY * 2,
                    endTime: now + this.REAL_TIME_PER_GAME_DAY * 3,
                    weather: null,  // 将在进入该阶段时记录
                    weatherBonus: 0
                }
            },
            
            currentStage: 'seedling',  // 当前阶段
            rarity: null,              // 最终稀有度（收获时计算）
            isHarvested: false
        };
        
        console.log(`🌱 种植作物: ${cropType} at (${row},${col}), 天气: ${currentWeather}, 加成: +${this.getWeatherBonus(currentWeather)}%`);
        
        return this.crops[farmId][key];
    }
    
    /**
     * 获取天气加成百分比
     * @param {string} weather - 天气类型
     * @returns {number} 加成百分比（默认：常规1%，极端10%）
     */
    getWeatherBonus(weather) {
        // 从调试设置中读取加成值(如果有)
        const debugSettings = JSON.parse(localStorage.getItem('debugSettings') || '{}');
        const normalBonus = debugSettings.normalWeatherBonus !== undefined ? debugSettings.normalWeatherBonus : 1;
        const extremeBonus = debugSettings.extremeWeatherBonus !== undefined ? debugSettings.extremeWeatherBonus : 10;
        
        if (this.weatherCategories.extreme.includes(weather)) {
            return extremeBonus; // 极端天气(可调节)
        } else if (this.weatherCategories.normal.includes(weather)) {
            return normalBonus;  // 常规天气(可调节)
        }
        return normalBonus; // 默认使用常规天气加成
    }
    
    /**
     * 更新所有作物状态
     * 需要在游戏主循环中定期调用
     */
    updateAllCrops() {
        const now = Date.now();
        const timeInfo = this.gameTimeSystem.getCurrentTime();
        const currentWeather = timeInfo.weather || '晴';
        
        // 当前游戏时间（总天数）
        const currentGameTime = {
            year: timeInfo.year,
            week: timeInfo.week,
            day: timeInfo.day
        };
        
        for (const farmId in this.crops) {
            for (const key in this.crops[farmId]) {
                const crop = this.crops[farmId][key];
                
                if (crop.isHarvested) continue;
                
                // 计算经过的游戏天数（优先使用游戏时间）
                let elapsedGameDays = 0;
                if (crop.plantedGameTime) {
                    const plantedTotalDays = (crop.plantedGameTime.year - 1) * 364 + (crop.plantedGameTime.week - 1) * 7 + crop.plantedGameTime.day;
                    const currentTotalDays = (currentGameTime.year - 1) * 364 + (currentGameTime.week - 1) * 7 + currentGameTime.day;
                    elapsedGameDays = currentTotalDays - plantedTotalDays;
                } else {
                    // 备用：使用真实时间
                    const elapsed = now - crop.plantedAt;
                    elapsedGameDays = elapsed / this.REAL_TIME_PER_GAME_DAY;
                }
                
                // 更新当前阶段（基于游戏天数）
                if (elapsedGameDays >= 2) {
                    // 进入成熟期（第3天）
                    if (crop.currentStage !== 'mature') {
                        crop.currentStage = 'mature';
                        if (!crop.stages.mature.weather) {
                            crop.stages.mature.weather = currentWeather;
                            crop.stages.mature.weatherBonus = this.getWeatherBonus(currentWeather);
                            console.log(`🌾 作物进入成熟期, 天气: ${currentWeather}, 加成: +${crop.stages.mature.weatherBonus}%`);
                        }
                    }
                } else if (elapsedGameDays >= 1) {
                    // 进入生长期（第2天）
                    if (crop.currentStage === 'seedling') {
                        crop.currentStage = 'growing';
                        if (!crop.stages.growing.weather) {
                            crop.stages.growing.weather = currentWeather;
                            crop.stages.growing.weatherBonus = this.getWeatherBonus(currentWeather);
                            console.log(`🌿 作物进入生长期, 天气: ${currentWeather}, 加成: +${crop.stages.growing.weatherBonus}%`);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * 计算作物的最终稀有度
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Object} 稀有度信息
     */
    calculateRarity(farmId, row, col) {
        const key = `${row}_${col}`;
        const crop = this.crops[farmId]?.[key];
        
        if (!crop) {
            return { rarity: 'white', ...this.rarities.white };
        }
        
        // 如果已经计算过，直接返回
        if (crop.rarity) {
            return { rarity: crop.rarity, ...this.rarities[crop.rarity] };
        }
        
        // 计算总变异概率
        // 基础概率 + 幼苗期加成 + 生长期加成 + 成熟期加成
        const totalMutationRate = 
            crop.baseMutationRate * 100 + // 转换为百分比
            (crop.stages.seedling.weatherBonus || 0) +
            (crop.stages.growing.weatherBonus || 0) +
            (crop.stages.mature.weatherBonus || 0);
        
        console.log(`📊 计算稀有度:
  基础概率: ${crop.baseMutationRate * 100}%
  幼苗期天气(${crop.stages.seedling.weather}): +${crop.stages.seedling.weatherBonus}%
  生长期天气(${crop.stages.growing.weather || '未记录'}): +${crop.stages.growing.weatherBonus}%
  成熟期天气(${crop.stages.mature.weather || '未记录'}): +${crop.stages.mature.weatherBonus}%
  总变异概率: ${totalMutationRate}%`);
        
        // 判断是否发生变异（修复：逻辑应该是 roll < totalMutationRate 才变异）
        const roll = Math.random() * 100;
        
        if (roll >= totalMutationRate) {
            // 未变异，返回白色
            crop.rarity = 'white';
            console.log(`⚪ 未发生变异 (roll: ${roll.toFixed(2)} >= ${totalMutationRate})`);
            return { rarity: 'white', ...this.rarities.white };
        }
        
        // 发生变异，根据分布决定稀有度
        const mutationRoll = Math.random();
        let cumulativeProbability = 0;
        let selectedRarity = 'green'; // 默认绿色
        
        for (const item of this.mutationDistribution) {
            cumulativeProbability += item.probability;
            if (mutationRoll <= cumulativeProbability) {
                selectedRarity = item.rarity;
                break;
            }
        }
        
        crop.rarity = selectedRarity;
        const rarityInfo = this.rarities[selectedRarity];
        
        console.log(`✨ 发生变异! 稀有度: ${rarityInfo.name} (roll: ${roll.toFixed(2)} <= ${totalMutationRate}, mutation: ${mutationRoll.toFixed(3)})`);
        
        return { rarity: selectedRarity, ...rarityInfo };
    }
    
    /**
     * 收获作物
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Object} 收获结果 { success, rarity, rarityInfo, yield }
     */
    harvestCrop(farmId, row, col) {
        const key = `${row}_${col}`;
        const crop = this.crops[farmId]?.[key];
        
        if (!crop) {
            return { 
                success: false, 
                message: '该位置没有作物'
            };
        }
        
        if (crop.isHarvested) {
            return { 
                success: false, 
                message: '该作物已被收获'
            };
        }
        
        // 检查是否成熟（使用游戏时间，与updateAllCrops保持一致）
        const timeInfo = this.gameTimeSystem.getCurrentTime();
        const currentGameTime = {
            year: timeInfo.year,
            week: timeInfo.week,
            day: timeInfo.day
        };
        
        // 计算经过的游戏天数
        let elapsedGameDays = 0;
        if (crop.plantedGameTime) {
            const plantedTotalDays = (crop.plantedGameTime.year - 1) * 364 + (crop.plantedGameTime.week - 1) * 7 + crop.plantedGameTime.day;
            const currentTotalDays = (currentGameTime.year - 1) * 364 + (currentGameTime.week - 1) * 7 + currentGameTime.day;
            elapsedGameDays = currentTotalDays - plantedTotalDays;
        } else {
            // 备用：使用真实时间
            const now = Date.now();
            const elapsed = now - crop.plantedAt;
            elapsedGameDays = elapsed / this.REAL_TIME_PER_GAME_DAY;
        }
        
        // 需要至少3游戏天才能收获
        if (elapsedGameDays < 3) {
            return {
                success: false,
                message: `作物尚未成熟（已生长${elapsedGameDays.toFixed(1)}天，需要3天）`
            };
        }
        
        // 计算稀有度
        const rarityResult = this.calculateRarity(farmId, row, col);
        
        // 标记为已收获
        crop.isHarvested = true;
        
        return {
            success: true,
            message: `收获了${rarityResult.name}作物`,
            rarity: rarityResult.rarity,
            rarityInfo: rarityResult,
            crop: crop
        };
    }
    
    /**
     * 获取作物当前状态
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Object} 作物状态信息
     */
    getCropStatus(farmId, row, col) {
        const key = `${row}_${col}`;
        const crop = this.crops[farmId]?.[key];
        
        if (!crop) {
            return null;
        }
        
        const now = Date.now();
        const elapsed = now - crop.plantedAt;
        const progress = Math.min(100, (elapsed / (this.REAL_TIME_PER_GAME_DAY * 3)) * 100);
        
        return {
            type: crop.type,
            currentStage: crop.currentStage,
            progress: progress.toFixed(1),
            isHarvestable: elapsed >= this.REAL_TIME_PER_GAME_DAY * 3,
            stages: crop.stages,
            rarity: crop.rarity
        };
    }
    
    /**
     * 获取作物的生长阶段显示图标
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {string} 阶段图标
     */
    getStageIcon(farmId, row, col) {
        const status = this.getCropStatus(farmId, row, col);
        
        if (!status) return '🟫'; // 空地
        
        switch (status.currentStage) {
            case 'seedling': return '🌱'; // 幼苗期
            case 'growing': return '🌿';  // 生长期
            case 'mature': 
                // 成熟期，如果已知稀有度则显示稀有度图标
                if (status.rarity) {
                    return this.rarities[status.rarity].icon;
                }
                return '🌾'; // 未知稀有度的成熟作物
            default: return '🌱';
        }
    }
    
    /**
     * 清除农场的所有作物数据
     * @param {string} farmId - 农场ID
     */
    clearFarm(farmId) {
        delete this.crops[farmId];
        console.log(`🧹 清除农场作物数据: ${farmId}`);
    }
    
    /**
     * 保存到localStorage
     */
    saveData() {
        try {
            localStorage.setItem('cropRarityData', JSON.stringify(this.crops));
            console.log('💾 作物稀有度数据已保存');
        } catch (e) {
            console.error('保存作物稀有度数据失败:', e);
        }
    }
    
    /**
     * 从localStorage加载
     */
    loadData() {
        try {
            const data = localStorage.getItem('cropRarityData');
            if (data) {
                this.crops = JSON.parse(data);
                console.log('📂 作物稀有度数据已加载');
            }
        } catch (e) {
            console.error('加载作物稀有度数据失败:', e);
            this.crops = {};
        }
    }
    
    /**
     * 获取稀有度统计信息
     * @param {string} farmId - 农场ID（可选）
     * @returns {Object} 统计信息
     */
    getRarityStatistics(farmId = null) {
        const stats = {
            white: 0,
            green: 0,
            blue: 0,
            purple: 0,
            gold: 0,
            red: 0,
            total: 0
        };
        
        const farmsToCheck = farmId ? [farmId] : Object.keys(this.crops);
        
        for (const fId of farmsToCheck) {
            if (!this.crops[fId]) continue;
            
            for (const key in this.crops[fId]) {
                const crop = this.crops[fId][key];
                if (crop.isHarvested && crop.rarity) {
                    stats[crop.rarity]++;
                    stats.total++;
                }
            }
        }
        
        return stats;
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.CropRaritySystem = CropRaritySystem;
}
