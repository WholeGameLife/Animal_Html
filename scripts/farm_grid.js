/**
 * 农场格子系统
 * 负责处理农场的格子种植逻辑
 */

class FarmGridSystem {
    constructor(cropRaritySystem = null) {
        // 格子配置
        this.GRID_SIZE = 3; // 3x3 的格子（实际8个种植位：上下左右+四个对角）
        
        // 稀有度系统引用
        this.cropRaritySystem = cropRaritySystem;
        
        // 时间常量: 现实6分钟 = 游戏1天
        const REAL_TIME_PER_GAME_DAY = 6 * 60 * 1000; // 360000ms
        
        this.CROP_TYPES = {
            wheat: {
                name: '小麦',
                icon: '🌾',
                seedKey: 'seed_wheat', // 商店种子key
                cost: 5, // 种植成本（食物）
                growTime: REAL_TIME_PER_GAME_DAY * 3, // 游戏3天 = 现实18分钟
                yield: 10, // 基础产出10个食物（实际产量由农场等级决定）
                baseMutationRate: 0.05 // 基础变异概率5%
            },
            corn: {
                name: '玉米',
                icon: '🌽',
                seedKey: 'seed_corn',
                cost: 8,
                growTime: REAL_TIME_PER_GAME_DAY * 3, // 游戏3天 = 现实18分钟
                yield: 15,
                baseMutationRate: 0.05
            },
            tomato: {
                name: '番茄',
                icon: '🍅',
                seedKey: 'seed_tomato',
                cost: 10,
                growTime: REAL_TIME_PER_GAME_DAY * 3, // 游戏3天 = 现实18分钟
                yield: 25,
                baseMutationRate: 0.08 // 番茄变异率稍高
            },
            carrot: {
                name: '胡萝卜',
                icon: '🥕',
                seedKey: 'seed_carrot',
                cost: 15,
                growTime: REAL_TIME_PER_GAME_DAY * 3, // 游戏3天 = 现实18分钟
                yield: 50,
                baseMutationRate: 0.10 // 胡萝卜变异率更高
            }
        };
        
        // 存储所有农场的格子数据
        // 格式: { farmBuildingId: { grids: [[null, ...], [...]], ...} }
        this.farmGrids = {};
    }
    
    /**
     * 初始化农场格子系统
     * @param {string} farmId - 农场建筑的ID
     */
    initializeFarm(farmId) {
        if (this.farmGrids[farmId]) return; // 已初始化
        
        // 创建空的格子数组 (6x6)
        const grids = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            grids[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                grids[row][col] = null; // null 表示空地
            }
        }
        
        this.farmGrids[farmId] = {
            grids: grids,
            lastUpdate: Date.now()
        };
    }
    
    /**
     * 种植作物到指定格子
     * 注意：种子的购买和消耗由商店系统管理，此方法只负责种植逻辑
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {string} cropType - 作物类型
     * @returns {Object} 结果对象 {success: boolean, message: string}
     */
    plantCrop(farmId, row, col, cropType) {
        if (!this.farmGrids[farmId]) {
            return { success: false, message: '农场未初始化' };
        }
        
        if (!this.CROP_TYPES[cropType]) {
            return { success: false, message: '未知的作物类型' };
        }
        
        if (row < 0 || row >= this.GRID_SIZE || col < 0 || col >= this.GRID_SIZE) {
            return { success: false, message: '格子坐标超出范围' };
        }
        
        const grid = this.farmGrids[farmId].grids[row][col];
        if (grid !== null) {
            return { success: false, message: '该格子已有作物' };
        }
        
        // 种植作物
        const crop = this.CROP_TYPES[cropType];
        this.farmGrids[farmId].grids[row][col] = {
            type: cropType,
            plantedAt: Date.now(),
            growTime: crop.growTime,
            stage: 0, // 0=幼苗期, 1=生长中, 2=生长期, 3=成熟
            harvestable: false,
            rarity: null // 稀有度（收获时确定）
        };
        
        // 如果启用了稀有度系统，初始化作物稀有度数据
        if (this.cropRaritySystem) {
            this.cropRaritySystem.plantCrop(farmId, row, col, cropType, crop.baseMutationRate || 0.05);
        }
        
        return { 
            success: true, 
            message: `成功种植${crop.name}`
        };
    }
    
    /**
     * 收获指定格子的作物
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Object} 结果对象 {success: boolean, message: string, yield: number}
     */
    harvestCrop(farmId, row, col) {
        if (!this.farmGrids[farmId]) {
            return { success: false, message: '农场未初始化', yield: 0 };
        }
        
        const grid = this.farmGrids[farmId].grids[row][col];
        if (grid === null) {
            return { success: false, message: '该格子没有作物', yield: 0 };
        }
        
        if (!grid.harvestable) {
            return { success: false, message: '作物尚未成熟', yield: 0 };
        }
        
        // 收获作物
        const crop = this.CROP_TYPES[grid.type];
        const yieldAmount = crop.yield; // 产量由作物类型决定，不受稀有度影响
        let rarityInfo = null;
        
        // 如果启用了稀有度系统，计算稀有度（仅用于收藏展示）
        if (this.cropRaritySystem) {
            const harvestResult = this.cropRaritySystem.harvestCrop(farmId, row, col);
            if (harvestResult.success) {
                rarityInfo = harvestResult.rarityInfo;
                grid.rarity = harvestResult.rarity; // 记录稀有度
            }
        }
        
        // 清空格子
        this.farmGrids[farmId].grids[row][col] = null;
        
        return { 
            success: true, 
            message: rarityInfo ? 
                `收获了${rarityInfo.name}${crop.name}! ${rarityInfo.icon}` : 
                `收获了${crop.name}`,
            yield: yieldAmount,
            cropName: crop.name,
            rarity: rarityInfo ? rarityInfo.rarity : 'white',
            rarityInfo: rarityInfo
        };
    }
    
    /**
     * 更新所有农场的作物生长状态
     * 需要在游戏主循环中定期调用
     */
    updateAllFarms() {
        const now = Date.now();
        
        // 如果启用了稀有度系统，先更新稀有度系统
        if (this.cropRaritySystem) {
            this.cropRaritySystem.updateAllCrops();
        }
        
        for (const farmId in this.farmGrids) {
            const farm = this.farmGrids[farmId];
            
            for (let row = 0; row < this.GRID_SIZE; row++) {
                // 检查行是否存在（兼容旧数据）
                if (!farm.grids[row]) continue;
                
                for (let col = 0; col < this.GRID_SIZE; col++) {
                    // 跳过中心位置(1,1)，这是农场建筑的位置
                    if (row === 1 && col === 1) continue;
                    
                    const grid = farm.grids[row][col];
                    if (grid === null || grid === undefined) continue;
                    
                    const elapsed = now - grid.plantedAt;
                    const progress = elapsed / grid.growTime;
                    
                    // 更新生长阶段（3个阶段均分：0-33%幼苗，33-66%生长，66-100%成熟）
                    if (progress >= 1.0) {
                        grid.stage = 3; // 成熟
                        grid.harvestable = true;
                    } else if (progress >= 0.66) {
                        grid.stage = 2; // 生长期（第3天）
                    } else if (progress >= 0.33) {
                        grid.stage = 1; // 生长中（第2天）
                    } else {
                        grid.stage = 0; // 幼苗期（第1天）
                    }
                }
            }
            
            farm.lastUpdate = now;
        }
    }
    
    /**
     * 获取农场格子数据（用于UI渲染）
     * @param {string} farmId - 农场ID
     * @returns {Array} 格子数据数组
     */
    getFarmGrids(farmId) {
        if (!this.farmGrids[farmId]) {
            return null;
        }
        return this.farmGrids[farmId].grids;
    }
    
    /**
     * 获取格子的显示图标（根据生长阶段）
     * @param {Object} grid - 格子对象
     * @param {string} farmId - 农场ID（用于获取稀有度信息）
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {string} 图标字符
     */
    getGridIcon(grid, farmId = null, row = null, col = null) {
        if (grid === null) return '🟫'; // 空地
        
        // 如果启用了稀有度系统且作物成熟，使用稀有度系统的图标
        if (this.cropRaritySystem && grid.stage === 3 && farmId !== null && row !== null && col !== null) {
            return this.cropRaritySystem.getStageIcon(farmId, row, col);
        }
        
        const crop = this.CROP_TYPES[grid.type];
        switch (grid.stage) {
            case 0: return '🌱'; // 幼苗期（第1天）
            case 1: return '🌿'; // 生长中（第2天）
            case 2: return '🌾'; // 生长期（第3天）
            case 3: return crop.icon; // 成熟（显示具体作物图标）
            default: return '🌱';
        }
    }
    
    /**
     * 获取格子的生长进度百分比
     * @param {string} farmId - 农场ID
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {number} 进度百分比 (0-100)
     */
    getGridProgress(farmId, row, col) {
        if (!this.farmGrids[farmId]) return 0;
        
        const grid = this.farmGrids[farmId].grids[row][col];
        if (grid === null) return 0;
        
        const elapsed = Date.now() - grid.plantedAt;
        const progress = Math.min(100, Math.floor((elapsed / grid.growTime) * 100));
        return progress;
    }
    
    /**
     * 批量种植所有空格子
     * 注意：种子的购买和消耗由调用方（通常是商店/库存系统）管理
     * @param {string} farmId - 农场ID
     * @param {string} cropType - 作物类型
     * @returns {Object} 结果对象 {success: boolean, message: string, plantedCount: number}
     */
    plantAllEmptyGrids(farmId, cropType) {
        if (!this.farmGrids[farmId]) {
            return { success: false, message: '农场未初始化', plantedCount: 0 };
        }
        
        if (!this.CROP_TYPES[cropType]) {
            return { success: false, message: '未知的作物类型', plantedCount: 0 };
        }
        
        const crop = this.CROP_TYPES[cropType];
        let emptyCount = 0;
        
        // 先计算空格子数量
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (row === 1 && col === 1) continue; // 跳过中心建筑位置
                if (this.farmGrids[farmId].grids[row][col] === null) {
                    emptyCount++;
                }
            }
        }
        
        if (emptyCount === 0) {
            return { success: false, message: '所有格子都已有作物', plantedCount: 0 };
        }
        
        // 种植所有空格子
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (row === 1 && col === 1) continue; // 跳过中心建筑位置
                if (this.farmGrids[farmId].grids[row][col] === null) {
                    this.farmGrids[farmId].grids[row][col] = {
                        type: cropType,
                        plantedAt: Date.now(),
                        growTime: crop.growTime,
                        stage: 0,
                        harvestable: false,
                        rarity: null
                    };
                    
                    // 如果启用了稀有度系统，初始化作物稀有度数据
                    if (this.cropRaritySystem) {
                        this.cropRaritySystem.plantCrop(farmId, row, col, cropType, crop.baseMutationRate || 0.05);
                    }
                }
            }
        }
        
        return {
            success: true,
            message: `成功种植了${emptyCount}个${crop.name}`,
            plantedCount: emptyCount
        };
    }
    
    /**
     * 清除农场所有作物（用于拆除建筑时）
     * @param {string} farmId - 农场ID
     */
    clearFarm(farmId) {
        // 清除稀有度系统中的数据
        if (this.cropRaritySystem) {
            this.cropRaritySystem.clearFarm(farmId);
        }
        delete this.farmGrids[farmId];
    }
    
    /**
     * 设置稀有度系统引用
     * @param {CropRaritySystem} cropRaritySystem - 稀有度系统实例
     */
    setCropRaritySystem(cropRaritySystem) {
        this.cropRaritySystem = cropRaritySystem;
        console.log('✅ 农场系统已连接稀有度系统');
    }
    
    /**
     * 保存到localStorage
     */
    saveData() {
        try {
            localStorage.setItem('farmGridsData', JSON.stringify(this.farmGrids));
        } catch (e) {
            console.error('保存农场格子数据失败:', e);
        }
    }
    
    /**
     * 从localStorage加载
     */
    loadData() {
        try {
            const data = localStorage.getItem('farmGridsData');
            if (data) {
                this.farmGrids = JSON.parse(data);
            }
        } catch (e) {
            console.error('加载农场格子数据失败:', e);
            this.farmGrids = {};
        }
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.FarmGridSystem = FarmGridSystem;
}
