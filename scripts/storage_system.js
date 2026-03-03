/**
 * 仓库系统
 * 负责管理种子、收获作物和养成道具的存储
 */

class StorageSystem {
    constructor() {
        // 仓库数据结构
        this.storage = {
            seeds: {},      // 种子库存 {seed_wheat: 10, seed_corn: 5, ...}
            crops: {},      // 收获的作物 {wheat: 100, corn: 50, ...}
            items: {}       // 养成道具 {exp_potion_s: 5, stamina_potion: 3, ...}
        };
        
        // 稀有度配置
        this.rarities = {
            white: { name: '白色', color: '#FFFFFF', bgColor: 'rgba(255,255,255,0.1)', mutationBonus: 0, priceMultiplier: 1.0 },
            green: { name: '绿色', color: '#4CAF50', bgColor: 'rgba(76,175,80,0.2)', mutationBonus: 5, priceMultiplier: 2.0 },
            blue: { name: '蓝色', color: '#2196F3', bgColor: 'rgba(33,150,243,0.2)', mutationBonus: 10, priceMultiplier: 4.0 },
            purple: { name: '紫色', color: '#9C27B0', bgColor: 'rgba(156,39,176,0.2)', mutationBonus: 20, priceMultiplier: 8.0 },
            gold: { name: '金色', color: '#FFD700', bgColor: 'rgba(255,215,0,0.2)', mutationBonus: 35, priceMultiplier: 15.0 },
            red: { name: '红色', color: '#F44336', bgColor: 'rgba(244,67,54,0.2)', mutationBonus: 50, priceMultiplier: 30.0 }
        };
        
        // 物品配置
        this.ITEM_TYPES = {
            // 种子类 - 小麦 (所有稀有度)
            seed_wheat_white: { name: '小麦种子', icon: '🌾', category: 'seeds', rarity: 'white', cropType: 'wheat', desc: '基础变异率' },
            seed_wheat_green: { name: '小麦种子', icon: '🌾', category: 'seeds', rarity: 'green', cropType: 'wheat', desc: '变异率+5%' },
            seed_wheat_blue: { name: '小麦种子', icon: '🌾', category: 'seeds', rarity: 'blue', cropType: 'wheat', desc: '变异率+10%' },
            seed_wheat_purple: { name: '小麦种子', icon: '🌾', category: 'seeds', rarity: 'purple', cropType: 'wheat', desc: '变异率+20%' },
            seed_wheat_gold: { name: '小麦种子', icon: '🌾', category: 'seeds', rarity: 'gold', cropType: 'wheat', desc: '变异率+35%' },
            seed_wheat_red: { name: '小麦种子', icon: '🌾', category: 'seeds', rarity: 'red', cropType: 'wheat', desc: '变异率+50%' },
            
            // 种子类 - 玉米
            seed_corn_white: { name: '玉米种子', icon: '🌽', category: 'seeds', rarity: 'white', cropType: 'corn', desc: '基础变异率' },
            seed_corn_green: { name: '玉米种子', icon: '🌽', category: 'seeds', rarity: 'green', cropType: 'corn', desc: '变异率+5%' },
            seed_corn_blue: { name: '玉米种子', icon: '🌽', category: 'seeds', rarity: 'blue', cropType: 'corn', desc: '变异率+10%' },
            seed_corn_purple: { name: '玉米种子', icon: '🌽', category: 'seeds', rarity: 'purple', cropType: 'corn', desc: '变异率+20%' },
            seed_corn_gold: { name: '玉米种子', icon: '🌽', category: 'seeds', rarity: 'gold', cropType: 'corn', desc: '变异率+35%' },
            seed_corn_red: { name: '玉米种子', icon: '🌽', category: 'seeds', rarity: 'red', cropType: 'corn', desc: '变异率+50%' },
            
            // 种子类 - 番茄
            seed_tomato_white: { name: '番茄种子', icon: '🍅', category: 'seeds', rarity: 'white', cropType: 'tomato', desc: '基础变异率' },
            seed_tomato_green: { name: '番茄种子', icon: '🍅', category: 'seeds', rarity: 'green', cropType: 'tomato', desc: '变异率+5%' },
            seed_tomato_blue: { name: '番茄种子', icon: '🍅', category: 'seeds', rarity: 'blue', cropType: 'tomato', desc: '变异率+10%' },
            seed_tomato_purple: { name: '番茄种子', icon: '🍅', category: 'seeds', rarity: 'purple', cropType: 'tomato', desc: '变异率+20%' },
            seed_tomato_gold: { name: '番茄种子', icon: '🍅', category: 'seeds', rarity: 'gold', cropType: 'tomato', desc: '变异率+35%' },
            seed_tomato_red: { name: '番茄种子', icon: '🍅', category: 'seeds', rarity: 'red', cropType: 'tomato', desc: '变异率+50%' },
            
            // 种子类 - 胡萝卜
            seed_carrot_white: { name: '胡萝卜种子', icon: '🥕', category: 'seeds', rarity: 'white', cropType: 'carrot', desc: '基础变异率' },
            seed_carrot_green: { name: '胡萝卜种子', icon: '🥕', category: 'seeds', rarity: 'green', cropType: 'carrot', desc: '变异率+5%' },
            seed_carrot_blue: { name: '胡萝卜种子', icon: '🥕', category: 'seeds', rarity: 'blue', cropType: 'carrot', desc: '变异率+10%' },
            seed_carrot_purple: { name: '胡萝卜种子', icon: '🥕', category: 'seeds', rarity: 'purple', cropType: 'carrot', desc: '变异率+20%' },
            seed_carrot_gold: { name: '胡萝卜种子', icon: '🥕', category: 'seeds', rarity: 'gold', cropType: 'carrot', desc: '变异率+35%' },
            seed_carrot_red: { name: '胡萝卜种子', icon: '🥕', category: 'seeds', rarity: 'red', cropType: 'carrot', desc: '变异率+50%' },
            
            // 作物类（收获物）
            wheat: { name: '小麦', icon: '🌾', category: 'crops', desc: '收获的小麦' },
            corn: { name: '玉米', icon: '🌽', category: 'crops', desc: '收获的玉米' },
            tomato: { name: '番茄', icon: '🍅', category: 'crops', desc: '收获的番茄' },
            carrot: { name: '胡萝卜', icon: '🥕', category: 'crops', desc: '收获的胡萝卜' },
            
            // 养成道具类
            exp_potion_s: { name: '小经验药水', icon: '🧪', category: 'items', desc: '增加50点经验' },
            exp_potion_l: { name: '大经验药水', icon: '⚗️', category: 'items', desc: '增加200点经验' },
            stamina_potion: { name: '体力药剂', icon: '⚡', category: 'items', desc: '恢复50点体力' },
            mutation_serum: { name: '变异血清', icon: '💉', category: 'items', desc: '诱发基因突变' }
        };
    }
    
    /**
     * 添加物品到仓库
     * @param {string} itemKey - 物品键值
     * @param {number} amount - 数量
     * @returns {Object} 结果 {success: boolean, message: string}
     */
    addItem(itemKey, amount = 1) {
        const itemConfig = this.ITEM_TYPES[itemKey];
        if (!itemConfig) {
            return { success: false, message: '未知的物品类型' };
        }
        
        const category = itemConfig.category;
        
        // 根据类别存储到对应区域
        if (!this.storage[category]) {
            this.storage[category] = {};
        }
        
        if (!this.storage[category][itemKey]) {
            this.storage[category][itemKey] = 0;
        }
        
        this.storage[category][itemKey] += amount;
        
        return {
            success: true,
            message: `添加了 ${amount} 个 ${itemConfig.name}`
        };
    }
    
    /**
     * 移除物品
     * @param {string} itemKey - 物品键值
     * @param {number} amount - 数量
     * @returns {Object} 结果 {success: boolean, message: string}
     */
    removeItem(itemKey, amount = 1) {
        const itemConfig = this.ITEM_TYPES[itemKey];
        if (!itemConfig) {
            return { success: false, message: '未知的物品类型' };
        }
        
        const category = itemConfig.category;
        
        if (!this.storage[category] || !this.storage[category][itemKey]) {
            return { success: false, message: `没有 ${itemConfig.name}` };
        }
        
        if (this.storage[category][itemKey] < amount) {
            return { 
                success: false, 
                message: `${itemConfig.name} 数量不足 (拥有: ${this.storage[category][itemKey]}, 需要: ${amount})` 
            };
        }
        
        this.storage[category][itemKey] -= amount;
        
        return {
            success: true,
            message: `移除了 ${amount} 个 ${itemConfig.name}`
        };
    }
    
    /**
     * 检查物品数量
     * @param {string} itemKey - 物品键值
     * @returns {number} 数量
     */
    getItemCount(itemKey) {
        const itemConfig = this.ITEM_TYPES[itemKey];
        if (!itemConfig) return 0;
        
        const category = itemConfig.category;
        return this.storage[category]?.[itemKey] || 0;
    }
    
    /**
     * 检查是否有足够的物品
     * @param {string} itemKey - 物品键值
     * @param {number} amount - 需要的数量
     * @returns {boolean}
     */
    hasItem(itemKey, amount = 1) {
        return this.getItemCount(itemKey) >= amount;
    }
    
    /**
     * 获取指定类别的所有物品
     * @param {string} category - 类别 ('seeds', 'crops', 'items')
     * @returns {Object} 物品列表 {itemKey: amount, ...}
     */
    getItemsByCategory(category) {
        return this.storage[category] || {};
    }
    
    /**
     * 获取所有非空物品（用于UI显示）
     * @returns {Array} 物品列表 [{key, name, icon, category, amount, desc}, ...]
     */
    getAllItems() {
        const items = [];
        
        for (const category in this.storage) {
            for (const itemKey in this.storage[category]) {
                const amount = this.storage[category][itemKey];
                if (amount > 0) {
                    const config = this.ITEM_TYPES[itemKey];
                    if (config) {
                        items.push({
                            key: itemKey,
                            name: config.name,
                            icon: config.icon,
                            category: category,
                            amount: amount,
                            desc: config.desc
                        });
                    }
                }
            }
        }
        
        return items;
    }
    
    /**
     * 获取分类后的所有物品（用于分类显示）
     * @returns {Object} {seeds: [], crops: [], items: []}
     */
    getAllItemsByCategory() {
        const categorized = {
            seeds: [],
            crops: [],
            items: []
        };
        
        for (const category in this.storage) {
            for (const itemKey in this.storage[category]) {
                const amount = this.storage[category][itemKey];
                if (amount > 0) {
                    const config = this.ITEM_TYPES[itemKey];
                    if (config) {
                        categorized[category].push({
                            key: itemKey,
                            name: config.name,
                            icon: config.icon,
                            amount: amount,
                            desc: config.desc
                        });
                    }
                }
            }
        }
        
        return categorized;
    }
    
    /**
     * 清空指定类别的物品
     * @param {string} category - 类别
     */
    clearCategory(category) {
        this.storage[category] = {};
    }
    
    /**
     * 清空所有物品
     */
    clearAll() {
        this.storage = {
            seeds: {},
            crops: {},
            items: {}
        };
    }
    
    /**
     * 获取物品信息
     * @param {string} itemKey - 物品键值
     * @returns {Object|null} 物品配置信息
     */
    getItemInfo(itemKey) {
        return this.ITEM_TYPES[itemKey] || null;
    }
    
    /**
     * 保存到localStorage
     */
    saveData() {
        try {
            localStorage.setItem('storageSystemData', JSON.stringify(this.storage));
        } catch (e) {
            console.error('保存仓库数据失败:', e);
        }
    }
    
    /**
     * 从localStorage加载
     */
    loadData() {
        try {
            const data = localStorage.getItem('storageSystemData');
            if (data) {
                const parsed = JSON.parse(data);
                // 确保所有类别都存在
                this.storage = {
                    seeds: parsed.seeds || {},
                    crops: parsed.crops || {},
                    items: parsed.items || {}
                };
            }
        } catch (e) {
            console.error('加载仓库数据失败:', e);
            this.storage = {
                seeds: {},
                crops: {},
                items: {}
            };
        }
    }
    
    /**
     * 迁移旧的inventory数据到新仓库系统
     * @param {Object} oldInventory - 旧的背包数据
     */
    migrateFromInventory(oldInventory) {
        if (!oldInventory) return;
        
        for (const itemKey in oldInventory) {
            const amount = oldInventory[itemKey];
            if (amount > 0) {
                this.addItem(itemKey, amount);
            }
        }
        
        console.log('✅ 已从旧背包系统迁移数据到仓库系统');
    }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    window.StorageSystem = StorageSystem;
}
