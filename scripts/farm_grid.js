/**
 * 农场格子系统
 * 负责处理农场的格子种植逻辑
 */

class FarmGridSystem {
    constructor() {
        // 格子配置
        this.GRID_SIZE = 3; // 3x3 的格子（实际8个种植位：上下左右+四个对角）
        
        // 时间常量: 现实6分钟 = 游戏1天
        const REAL_TIME_PER_GAME_DAY = 6 * 60 * 1000; // 360000ms
        
        this.CROP_TYPES = {
            wheat: {
                name: '小麦',
                icon: '🌾',
                growTime: REAL_TIME_PER_GAME_DAY * 2, // 游戏2天 = 现实12分钟
                yield: 10, // 产出10个食物
                cost: 3, // 种植成本3食物
                unlockLevel: 1
            },
            corn: {
                name: '玉米',
                icon: '🌽',
                growTime: REAL_TIME_PER_GAME_DAY * 2, // 游戏2天 = 现实12分钟
                yield: 15,
                cost: 5,
                unlockLevel: 1
            },
            tomato: {
                name: '番茄',
                icon: '🍅',
                growTime: REAL_TIME_PER_GAME_DAY * 4, // 游戏4天 = 现实24分钟
                yield: 25,
                cost: 8,
                unlockLevel: 2
            },
            carrot: {
                name: '胡萝卜',
                icon: '🥕',
                growTime: REAL_TIME_PER_GAME_DAY * 7, // 游戏7天(1周) = 现实42分钟
                yield: 50,
                cost: 15,
                unlockLevel: 3
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
            stage: 0, // 0=种子, 1=幼苗, 2=生长, 3=成熟
            harvestable: false
        };
        
        return { 
            success: true, 
            message: `成功种植${crop.name}`,
            cost: crop.cost
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
        const yieldAmount = crop.yield;
        
        // 清空格子
        this.farmGrids[farmId].grids[row][col] = null;
        
        return { 
            success: true, 
            message: `收获了${crop.name}`,
            yield: yieldAmount,
            cropName: crop.name
        };
    }
    
    /**
     * 更新所有农场的作物生长状态
     * 需要在游戏主循环中定期调用
     */
    updateAllFarms() {
        const now = Date.now();
        
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
                    
                    // 更新生长阶段
                    if (progress >= 1.0) {
                        grid.stage = 3; // 成熟
                        grid.harvestable = true;
                    } else if (progress >= 0.66) {
                        grid.stage = 2; // 生长
                    } else if (progress >= 0.33) {
                        grid.stage = 1; // 幼苗
                    } else {
                        grid.stage = 0; // 种子
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
     * @returns {string} 图标字符
     */
    getGridIcon(grid) {
        if (grid === null) return '🟫'; // 空地
        
        const crop = this.CROP_TYPES[grid.type];
        switch (grid.stage) {
            case 0: return '🌱'; // 种子
            case 1: return '🌿'; // 幼苗
            case 2: return '🌾'; // 生长中
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
     * @param {string} farmId - 农场ID
     * @param {string} cropType - 作物类型
     * @returns {Object} 结果对象 {success: boolean, message: string, plantedCount: number, totalCost: number}
     */
    plantAllEmptyGrids(farmId, cropType) {
        if (!this.farmGrids[farmId]) {
            return { success: false, message: '农场未初始化', plantedCount: 0, totalCost: 0 };
        }
        
        if (!this.CROP_TYPES[cropType]) {
            return { success: false, message: '未知的作物类型', plantedCount: 0, totalCost: 0 };
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
            return { success: false, message: '所有格子都已有作物', plantedCount: 0, totalCost: 0 };
        }
        
        const totalCost = crop.cost * emptyCount;
        
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
                        harvestable: false
                    };
                }
            }
        }
        
        return {
            success: true,
            message: `成功种植了${emptyCount}个${crop.name}`,
            plantedCount: emptyCount,
            totalCost: totalCost
        };
    }
    
    /**
     * 清除农场所有作物（用于拆除建筑时）
     * @param {string} farmId - 农场ID
     */
    clearFarm(farmId) {
        delete this.farmGrids[farmId];
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
