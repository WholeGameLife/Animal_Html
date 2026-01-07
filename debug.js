// 检测当前页面类型
const isWorldMapPage = window.location.pathname.includes('world_map.html');

// 创建调试窗口HTML
const debugPanelHTML = isWorldMapPage ? `
    <div id="debug-panel" class="fixed top-10 right-10 bg-gray-900/95 backdrop-blur-lg border-2 border-red-500 rounded-xl p-4 text-white w-96 z-50 hidden shadow-2xl" style="cursor: move;">
        <div id="debug-header" class="w-full flex justify-between items-center mb-4">
            <h4 class="text-lg font-bold text-red-400">🐞 地图调试器</h4>
            <button id="btn-close-debug" class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <!-- 地图选择 -->
            <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <label class="block text-sm font-semibold text-yellow-400 mb-2">选择地图</label>
                <select id="debug-map-select" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500">
                    <option value="">-- 选择地图 --</option>
                </select>
            </div>
            
            <!-- 动物配置选择 -->
            <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <label class="block text-sm font-semibold text-green-400 mb-2">选择动物配置</label>
                <select id="debug-animal-config-select" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" disabled>
                    <option value="">-- 先选择地图 --</option>
                </select>
                <p class="text-xs text-gray-400 mt-1">每个稀有度版本是独立配置</p>
            </div>
            
            <!-- 权重调节 -->
            <div id="debug-weight-section" class="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hidden">
                <label class="block text-sm font-semibold text-orange-400 mb-2">⚖️ 生成权重</label>
                <div class="flex items-center gap-2">
                    <input type="range" id="debug-weight" min="0" max="100" step="0.1" value="10"
                        class="flex-1" oninput="debug.updateWeightDebug()">
                    <input type="number" id="debug-weight-num" min="0" max="100" step="0.1" value="10"
                        class="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        oninput="debug.updateWeightDebugFromInput(this.value)">
                </div>
                <p class="text-xs text-gray-400 mt-1">该稀有度版本的生成权重</p>
            </div>
            
            <!-- 成长比例调节 -->
            <div id="debug-growth-section" class="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hidden">
                <label class="block text-sm font-semibold text-blue-400 mb-2">📈 潜力比例 (总和需为100%)</label>
                <div class="space-y-2">
                    <div>
                        <label class="text-xs text-gray-400">⭐ 平庸</label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="debug-growth-mediocre" min="0" max="100" value="20"
                                class="flex-1" oninput="debug.updateGrowthDebug()">
                            <input type="number" id="debug-growth-mediocre-num" min="0" max="100" value="20"
                                class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                                oninput="debug.updateGrowthDebugFromInput('mediocre', this.value)">
                            <span class="text-xs text-gray-400 w-8">%</span>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs text-blue-400">⭐⭐ 超常</label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="debug-growth-extraordinary" min="0" max="100" value="50"
                                class="flex-1" oninput="debug.updateGrowthDebug()">
                            <input type="number" id="debug-growth-extraordinary-num" min="0" max="100" value="50"
                                class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                                oninput="debug.updateGrowthDebugFromInput('extraordinary', this.value)">
                            <span class="text-xs text-gray-400 w-8">%</span>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs text-purple-400">⭐⭐⭐ 璀璨</label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="debug-growth-brilliant" min="0" max="100" value="30"
                                class="flex-1" oninput="debug.updateGrowthDebug()">
                            <input type="number" id="debug-growth-brilliant-num" min="0" max="100" value="30"
                                class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                                oninput="debug.updateGrowthDebugFromInput('brilliant', this.value)">
                            <span class="text-xs text-gray-400 w-8">%</span>
                        </div>
                    </div>
                    <div id="debug-growth-total" class="text-xs text-center py-1 rounded bg-gray-700">
                        总和: <span id="debug-growth-sum">100</span>%
                    </div>
                </div>
            </div>
            
            <!-- 应用按钮 -->
            <div id="debug-apply-section" class="hidden">
                <button id="btn-apply-debug" onclick="debug.applyMapDebugChanges()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    💾 应用修改
                </button>
                <p class="text-xs text-gray-400 text-center mt-2">修改会保存到地图配置中</p>
            </div>
        </div>
    </div>
` : `
    <div id="debug-panel" class="fixed top-10 right-10 control-panel p-4 rounded-lg text-white w-[420px] z-50 hidden" style="cursor: move;">
        <div id="debug-header" class="w-full flex justify-between items-center mb-4 cursor-move">
            <h4 class="text-lg font-bold text-red-500">🐞 调试工具 <span class="text-xs text-gray-400">[反引号键切换]</span></h4>
            <button id="btn-close-debug" class="text-xl hover:text-red-400">&times;</button>
        </div>
        <div class="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
            <!-- 资源控制 -->
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <p class="font-semibold text-yellow-400 mb-3 flex items-center gap-2">💰 资源管理</p>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="debug.addResource('food', 1000)" class="bg-blue-600 hover:bg-blue-700 text-xs py-2 rounded transition">+1K 食物</button>
                    <button onclick="debug.addResource('food', 10000)" class="bg-blue-700 hover:bg-blue-800 text-xs py-2 rounded transition">+10K 食物</button>
                    <button onclick="debug.addResource('gems', 100)" class="bg-purple-600 hover:bg-purple-700 text-xs py-2 rounded transition">+100 宝石</button>
                    <button onclick="debug.addAllItems()" class="col-span-3 bg-cyan-600 hover:bg-cyan-700 text-xs py-2 rounded transition">补充所有道具</button>
                </div>
            </div>
            
            <!-- 动物控制 -->
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <p class="font-semibold text-green-400 mb-3 flex items-center gap-2">🐾 当前动物</p>
                <div id="debug-animal-info" class="text-xs text-gray-400 mb-2 p-2 bg-gray-900/50 rounded">
                    未选择动物
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="debug.addLevel(1)" class="bg-green-600 hover:bg-green-700 text-xs py-2 rounded transition">+1 级</button>
                    <button onclick="debug.addLevel(5)" class="bg-green-700 hover:bg-green-800 text-xs py-2 rounded transition">+5 级</button>
                    <button onclick="debug.addLevel(10)" class="bg-green-800 hover:bg-green-900 text-xs py-2 rounded transition">+10 级</button>
                    <button onclick="debug.maxLevel()" class="col-span-3 bg-emerald-600 hover:bg-emerald-700 text-xs py-2 rounded transition">升至50级</button>
                    <button onclick="debug.setAdult()" class="bg-teal-600 hover:bg-teal-700 text-xs py-2 rounded transition">设为成年</button>
                    <button onclick="debug.fullStamina()" class="bg-orange-600 hover:bg-orange-700 text-xs py-2 rounded transition">满体力</button>
                    <button onclick="debug.maxFavorability()" class="bg-pink-600 hover:bg-pink-700 text-xs py-2 rounded transition">满好感</button>
                    <button onclick="debug.changePotential()" class="bg-indigo-600 hover:bg-indigo-700 text-xs py-2 rounded transition">切换潜力</button>
                    <button onclick="debug.resetBreedingCooldown()" class="col-span-3 bg-purple-600 hover:bg-purple-700 text-xs py-2 rounded transition">重置繁育冷却</button>
                </div>
            </div>
            
            <!-- 稀有度控制 -->
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <p class="font-semibold text-purple-400 mb-3 flex items-center gap-2">⭐ 稀有度</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.setRarity('普通')" class="bg-gray-600 hover:bg-gray-700 text-xs py-2 rounded transition">普通</button>
                    <button onclick="debug.setRarity('闪光')" class="bg-yellow-600 hover:bg-yellow-700 text-xs py-2 rounded transition">✨ 闪光</button>
                    <button onclick="debug.setRarity('幻彩')" class="bg-pink-600 hover:bg-pink-700 text-xs py-2 rounded transition">🌈 幻彩</button>
                    <button onclick="debug.setRarity('星芒')" class="bg-purple-600 hover:bg-purple-700 text-xs py-2 rounded transition">⭐ 星芒</button>
                </div>
            </div>
            
            <!-- 变异控制 -->
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <p class="font-semibold text-pink-400 mb-3 flex items-center gap-2">🧬 变异系统</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.addMutationSerum(1)" class="bg-pink-600 hover:bg-pink-700 text-xs py-2 rounded transition">+1 血清</button>
                    <button onclick="debug.addMutationSerum(10)" class="bg-pink-700 hover:bg-pink-800 text-xs py-2 rounded transition">+10 血清</button>
                    <button onclick="debug.resetMutationCooldown()" class="bg-fuchsia-600 hover:bg-fuchsia-700 text-xs py-2 rounded transition">重置冷却</button>
                    <button onclick="debug.clearMutation()" class="bg-red-600 hover:bg-red-700 text-xs py-2 rounded transition">清除变异</button>
                </div>
            </div>
            
            <!-- 技能控制 -->
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <p class="font-semibold text-cyan-400 mb-3 flex items-center gap-2">⚔️ 技能系统</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.unlockAllSkills()" class="bg-cyan-600 hover:bg-cyan-700 text-xs py-2 rounded transition">解锁所有技能</button>
                    <button onclick="debug.clearSkills()" class="bg-red-600 hover:bg-red-700 text-xs py-2 rounded transition">清空技能</button>
                    <button onclick="debug.equipAllSkills()" class="col-span-2 bg-blue-600 hover:bg-blue-700 text-xs py-2 rounded transition">自动装备前4个</button>
                </div>
            </div>
            
            <!-- 批量操作 -->
            <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <p class="font-semibold text-orange-400 mb-3 flex items-center gap-2">🚀 批量操作</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.upgradeAllAnimals()" class="bg-orange-600 hover:bg-orange-700 text-xs py-2 rounded transition">全体+10级</button>
                    <button onclick="debug.healAllAnimals()" class="bg-green-600 hover:bg-green-700 text-xs py-2 rounded transition">全体满血</button>
                    <button onclick="debug.godMode()" class="col-span-2 bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-sm py-2 rounded font-bold transition">🔥 上帝模式</button>
                </div>
            </div>
            
            <!-- 信息显示 -->
            <div class="bg-gray-800/50 p-2 rounded text-xs text-gray-400 text-center border border-gray-700">
                调试工具 v2.0 - 按反引号键切换显示
            </div>
        </div>
    </div>
`;

// 调试对象（需要在HTML加载前定义，以便内联onclick可以使用）
window.debug = {
    // 地图调试相关
    currentDebugMapKey: null,
    currentDebugAnimalKey: null,
    mapConfigs: [],
    animalPool: [],
    
    // 游戏调试功能
    addResource: (resource, amount) => {
        if (typeof gameState === 'undefined') return;
        gameState[resource] += amount;
        if (typeof updateResourceUI === 'function') updateResourceUI();
        if (typeof saveGameState === 'function') saveGameState();
        showStatus(`✅ +${amount} ${resource}`, 1500);
    },
    
    addLevel: (levels) => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        for (let i = 0; i < levels; i++) {
            levelUpAnimal(animal);
        }
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        debug.updateAnimalInfo();
        showStatus(`✅ +${levels} 等级`, 1500);
    },
    
    maxLevel: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        while (animal.level < 50) {
            levelUpAnimal(animal);
        }
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        debug.updateAnimalInfo();
        showStatus(`✅ 已升至50级`, 2000);
    },
    
    addExperience: (amount) => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.experience += amount;
        while (animal.experience >= animal.experienceToNextLevel) {
            levelUpAnimal(animal);
        }
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        debug.updateAnimalInfo();
        showStatus(`✅ +${amount} 经验`, 1500);
    },
    
    fullStamina: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.stamina = animal.maxStamina;
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        showStatus(`✅ 体力已恢复`, 1500);
    },
    
    maxFavorability: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.favorability = 100;
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        showStatus(`✅ 好感度已满`, 1500);
    },
    
    changePotential: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        const potentials = ['平庸', '超常', '璀璨'];
        const currentIndex = potentials.indexOf(animal.potential);
        animal.potential = potentials[(currentIndex + 1) % 3];
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        debug.updateAnimalInfo();
        showStatus(`✅ 潜力: ${animal.potential}`, 1500);
    },
    
    setAdult: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.developmentStage = '成年期';
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        debug.updateAnimalInfo();
        showStatus(`✅ 已设为成年期`, 1500);
    },
    
    resetBreedingCooldown: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.breedingCooldownUntil = 0;
        if (typeof saveGameState === 'function') saveGameState();
        if (typeof renderBreedingPanel === 'function') renderBreedingPanel();
        showStatus('✅ 繁育冷却已重置', 1500);
    },
    
    setRarity: (rarity) => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.rarity = rarity;
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        debug.updateAnimalInfo();
        showStatus(`✅ 稀有度: ${rarity}`, 1500);
    },
    
    addMutationSerum: (amount) => {
        if (typeof gameState === 'undefined') return;
        gameState.inventory['mutation_serum'] = (gameState.inventory['mutation_serum'] || 0) + amount;
        if (typeof updateResourceUI === 'function') updateResourceUI();
        if (typeof renderItemPanel === 'function') renderItemPanel();
        if (typeof saveGameState === 'function') saveGameState();
        showStatus(`✅ +${amount} 变异血清`, 1500);
    },
    
    resetMutationCooldown: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        if (animal.mutationCooldownUntil) animal.mutationCooldownUntil = 0;
        if (animal.tier2MutationCooldownUntil) animal.tier2MutationCooldownUntil = 0;
        if (typeof saveGameState === 'function') saveGameState();
        if (typeof selectMutationTarget === 'function') selectMutationTarget(animal);
        showStatus('✅ 变异冷却已重置', 1500);
    },
    
    clearMutation: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.mutations = { tier1: null, tier2: null, skills: [], currentSkills: [], history: [] };
        animal.mutationCount = 0;
        if (typeof saveGameState === 'function') saveGameState();
        showAnimalDetails(animal.id);
        showStatus('✅ 已清除所有变异', 1500);
    },
    
    unlockAllSkills: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        
        // 解锁所有战斗技能
        const allCombatSkills = Object.keys(typeof COMBAT_SKILLS !== 'undefined' ? COMBAT_SKILLS : {});
        animal.combatSkills = animal.combatSkills || { equipped: [], available: [] };
        allCombatSkills.forEach(skillKey => {
            if (!animal.combatSkills.available.includes(skillKey)) {
                animal.combatSkills.available.push(skillKey);
            }
        });
        
        if (typeof saveGameState === 'function') saveGameState();
        if (typeof renderCombatSkills === 'function') renderCombatSkills(animal);
        showStatus(`✅ 已解锁 ${allCombatSkills.length} 个技能`, 2000);
    },
    
    clearSkills: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) return;
        animal.combatSkills = { equipped: [], available: [] };
        if (typeof saveGameState === 'function') saveGameState();
        if (typeof renderCombatSkills === 'function') renderCombatSkills(animal);
        if (typeof renderMutationSkills === 'function') renderMutationSkills(animal);
        showStatus('✅ 已清空所有技能', 1500);
    },
    
    equipAllSkills: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            showStatus('❌ 请先选择动物', 1500);
            return;
        }
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal || !animal.combatSkills) return;
        
        const allSkills = [...(animal.combatSkills.available || []), ...(animal.mutations?.skills || [])];
        animal.combatSkills.equipped = allSkills.slice(0, 4);
        
        if (typeof saveGameState === 'function') saveGameState();
        if (typeof renderCombatSkills === 'function') renderCombatSkills(animal);
        if (typeof renderMutationSkills === 'function') renderMutationSkills(animal);
        showStatus(`✅ 已装备前4个技能`, 1500);
    },
    
    addAllItems: () => {
        if (typeof gameState === 'undefined') return;
        if (!gameState.inventory) gameState.inventory = {};
        gameState.inventory['exp_potion_s'] = (gameState.inventory['exp_potion_s'] || 0) + 99;
        gameState.inventory['exp_potion_l'] = (gameState.inventory['exp_potion_l'] || 0) + 99;
        gameState.inventory['stamina_potion'] = (gameState.inventory['stamina_potion'] || 0) + 99;
        gameState.inventory['mutation_serum'] = (gameState.inventory['mutation_serum'] || 0) + 99;
        if (typeof updateResourceUI === 'function') updateResourceUI();
        if (typeof renderItemPanel === 'function') renderItemPanel();
        if (typeof saveGameState === 'function') saveGameState();
        showStatus('✅ 已添加所有道具', 2000);
    },
    
    upgradeAllAnimals: () => {
        if (typeof gameState === 'undefined' || !gameState.animals) return;
        gameState.animals.forEach(animal => {
            for (let i = 0; i < 10; i++) {
                levelUpAnimal(animal);
            }
        });
        if (typeof saveGameState === 'function') saveGameState();
        if (typeof renderAnimalList === 'function') renderAnimalList();
        if (selectedAnimalId) showAnimalDetails(selectedAnimalId);
        showStatus('✅ 所有动物 +10级', 2000);
    },
    
    healAllAnimals: () => {
        if (typeof gameState === 'undefined' || !gameState.animals) return;
        gameState.animals.forEach(animal => {
            animal.stamina = animal.maxStamina;
        });
        if (typeof saveGameState === 'function') saveGameState();
        if (selectedAnimalId) showAnimalDetails(selectedAnimalId);
        showStatus('✅ 所有动物体力已恢复', 2000);
    },
    
    godMode: () => {
        if (typeof gameState === 'undefined') return;
        // 资源拉满
        gameState.food = 999999;
        gameState.gems = 9999;
        // 道具拉满
        if (!gameState.inventory) gameState.inventory = {};
        Object.keys(typeof ITEMS !== 'undefined' ? ITEMS : {}).forEach(itemKey => {
            gameState.inventory[itemKey] = 999;
        });
        // 当前动物强化
        if (selectedAnimalId) {
            const animal = gameState.animals.find(a => a.id === selectedAnimalId);
            if (animal) {
                animal.rarity = '星芒';
                animal.potential = '璀璨';
                animal.favorability = 100;
                while (animal.level < 50) {
                    levelUpAnimal(animal);
                }
                showAnimalDetails(animal.id);
            }
        }
        if (typeof updateResourceUI === 'function') updateResourceUI();
        if (typeof renderItemPanel === 'function') renderItemPanel();
        if (typeof saveGameState === 'function') saveGameState();
        showStatus('🔥 上帝模式已激活！', 3000);
    },
    
    updateAnimalInfo: () => {
        const infoDiv = document.getElementById('debug-animal-info');
        if (!infoDiv) return;
        
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) {
            infoDiv.innerHTML = '未选择动物';
            return;
        }
        
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        if (!animal) {
            infoDiv.innerHTML = '动物不存在';
            return;
        }
        
        const mutationDisplay = animal.mutations?.tier1 ? `🧬 ${animal.mutations.tier1}` : '无变异';
        infoDiv.innerHTML = `
            <div class="font-bold text-white">${animal.name} Lv.${animal.level}</div>
            <div class="mt-1">稀有度: ${animal.rarity || '普通'} | 潜力: ${animal.potential}</div>
            <div>变异: ${mutationDisplay}</div>
        `;
    },
    
    // 地图调试功能
    loadDebugData: () => {
        debug.mapConfigs = JSON.parse(localStorage.getItem('MAP_CONFIGS') || '[]');
        debug.animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
    },
    
    loadDebugMaps: () => {
        const mapSelect = document.getElementById('debug-map-select');
        if (!mapSelect) return;
        
        mapSelect.innerHTML = '<option value="">-- 选择地图 --</option>' +
            debug.mapConfigs.map(map =>
                `<option value="${map.key}">${map.icon} ${map.name}</option>`
            ).join('');
    },
    
    loadDebugAnimals: () => {
        const animalSelect = document.getElementById('debug-animal-config-select');
        if (!animalSelect) return;
        
        if (!debug.currentDebugMapKey) {
            animalSelect.innerHTML = '<option value="">-- 先选择地图 --</option>';
            animalSelect.disabled = true;
            document.getElementById('debug-weight-section')?.classList.add('hidden');
            document.getElementById('debug-growth-section')?.classList.add('hidden');
            document.getElementById('debug-apply-section')?.classList.add('hidden');
            return;
        }
        
        const map = debug.mapConfigs.find(m => m.key === debug.currentDebugMapKey);
        if (!map || !map.animals || map.animals.length === 0) {
            animalSelect.innerHTML = '<option value="">-- 该地图无动物 --</option>';
            animalSelect.disabled = true;
            document.getElementById('debug-weight-section')?.classList.add('hidden');
            document.getElementById('debug-growth-section')?.classList.add('hidden');
            document.getElementById('debug-apply-section')?.classList.add('hidden');
            return;
        }
        
        animalSelect.disabled = false;
        
        // 渲染所有动物配置（包括分组和独立的）
        const rarityLabels = {
            'common': '⚪ 普通',
            'shiny': '✨ 闪光',
            'prismatic': '🌈 幻彩',
            'stellar': '⭐ 星芒'
        };
        
        // 按组分类
        const groups = {};
        const independents = [];
        
        map.animals.forEach((config, configIndex) => {
            if (config.groupId) {
                if (!groups[config.groupId]) {
                    groups[config.groupId] = [];
                }
                groups[config.groupId].push({ config, configIndex });
            } else {
                independents.push({ config, configIndex });
            }
        });
        
        let optionsHTML = '<option value="">-- 选择动物配置 --</option>';
        
        // 渲染分组的动物
        Object.entries(groups).forEach(([groupId, items]) => {
            const firstAnimal = debug.animalPool.find(a => a.key === items[0].config.animalKey);
            if (!firstAnimal) return;
            
            optionsHTML += `<optgroup label="🎲 ${firstAnimal.name} (稀有度组)">`;
            items.forEach(({ config, configIndex }) => {
                const rarityLabel = rarityLabels[config.rarityType] || '⚪';
                // 检查是否有自定义模板
                const templateInfo = config.selectedAnimalKey ?
                    (() => {
                        const customTemplate = debug.animalPool.find(a => a.key === config.selectedAnimalKey);
                        return customTemplate ? ` [${customTemplate.name}]` : '';
                    })() : '';
                optionsHTML += `<option value="${configIndex}">  ${rarityLabel}${templateInfo}</option>`;
            });
            optionsHTML += '</optgroup>';
        });
        
        // 渲染独立的动物
        if (independents.length > 0) {
            independents.forEach(({ config, configIndex }) => {
                const animal = debug.animalPool.find(a => a.key === config.animalKey);
                if (!animal) return;
                const rarityLabel = rarityLabels[config.rarityType] || '⚪';
                optionsHTML += `<option value="${configIndex}">${animal.name} ${rarityLabel}</option>`;
            });
        }
        
        animalSelect.innerHTML = optionsHTML;
    },
    
    loadDebugAnimalConfig: () => {
        const configIndex = debug.currentDebugAnimalKey;
        if (!debug.currentDebugMapKey || configIndex === null || configIndex === '') {
            document.getElementById('debug-weight-section')?.classList.add('hidden');
            document.getElementById('debug-growth-section')?.classList.add('hidden');
            document.getElementById('debug-apply-section')?.classList.add('hidden');
            return;
        }
        
        const map = debug.mapConfigs.find(m => m.key === debug.currentDebugMapKey);
        const animalConfig = map.animals[parseInt(configIndex)];
        
        if (!animalConfig) return;
        
        // 显示当前配置信息
        const animal = debug.animalPool.find(a => a.key === animalConfig.animalKey);
        const rarityLabels = {
            'common': '⚪ 普通',
            'shiny': '✨ 闪光',
            'prismatic': '🌈 幻彩',
            'stellar': '⭐ 星芒'
        };
        
        console.log('当前配置:', {
            动物: animal?.name,
            稀有度: rarityLabels[animalConfig.rarityType],
            是否有组: !!animalConfig.groupId,
            自定义模板: animalConfig.selectedAnimalKey ?
                debug.animalPool.find(a => a.key === animalConfig.selectedAnimalKey)?.name : '无'
        });
        
        // 加载权重
        document.getElementById('debug-weight').value = animalConfig.weight || 10;
        document.getElementById('debug-weight-num').value = animalConfig.weight || 10;
        
        // 加载潜力比例
        const growthRatios = animalConfig.growthRatios || { mediocre: 20, extraordinary: 50, brilliant: 30 };
        document.getElementById('debug-growth-mediocre').value = growthRatios.mediocre;
        document.getElementById('debug-growth-mediocre-num').value = growthRatios.mediocre;
        document.getElementById('debug-growth-extraordinary').value = growthRatios.extraordinary;
        document.getElementById('debug-growth-extraordinary-num').value = growthRatios.extraordinary;
        document.getElementById('debug-growth-brilliant').value = growthRatios.brilliant;
        document.getElementById('debug-growth-brilliant-num').value = growthRatios.brilliant;
        debug.updateGrowthDebug();
        
        // 显示调节区域
        document.getElementById('debug-weight-section')?.classList.remove('hidden');
        document.getElementById('debug-growth-section')?.classList.remove('hidden');
        document.getElementById('debug-apply-section')?.classList.remove('hidden');
    },
    
    updateWeightDebug: () => {
        const weight = parseFloat(document.getElementById('debug-weight').value);
        document.getElementById('debug-weight-num').value = weight.toFixed(1);
    },
    
    updateWeightDebugFromInput: (value) => {
        const val = parseFloat(value) || 0;
        document.getElementById('debug-weight').value = val;
        debug.updateWeightDebug();
    },
    
    updateGrowthDebug: () => {
        const mediocre = parseFloat(document.getElementById('debug-growth-mediocre').value);
        const extraordinary = parseFloat(document.getElementById('debug-growth-extraordinary').value);
        const brilliant = parseFloat(document.getElementById('debug-growth-brilliant').value);
        
        document.getElementById('debug-growth-mediocre-num').value = mediocre;
        document.getElementById('debug-growth-extraordinary-num').value = extraordinary;
        document.getElementById('debug-growth-brilliant-num').value = brilliant;
        
        const total = mediocre + extraordinary + brilliant;
        const sumElement = document.getElementById('debug-growth-sum');
        sumElement.textContent = total.toFixed(1);
        
        const totalElement = document.getElementById('debug-growth-total');
        if (Math.abs(total - 100) < 0.01) {
            totalElement.className = 'text-xs text-center py-1 rounded bg-green-600/30 text-green-400';
        } else {
            totalElement.className = 'text-xs text-center py-1 rounded bg-red-600/30 text-red-400';
        }
    },
    
    updateGrowthDebugFromInput: (type, value) => {
        const val = parseFloat(value) || 0;
        document.getElementById(`debug-growth-${type}`).value = val;
        debug.updateGrowthDebug();
    },
    
    applyMapDebugChanges: () => {
        const configIndex = debug.currentDebugAnimalKey;
        if (!debug.currentDebugMapKey || configIndex === null || configIndex === '') {
            alert('❌ 请先选择地图和动物配置！');
            return;
        }
        
        // 验证潜力比例
        const growthTotal = parseFloat(document.getElementById('debug-growth-mediocre').value) +
                           parseFloat(document.getElementById('debug-growth-extraordinary').value) +
                           parseFloat(document.getElementById('debug-growth-brilliant').value);
        
        if (Math.abs(growthTotal - 100) > 0.01) {
            alert('❌ 潜力比例总和必须为100%！');
            return;
        }
        
        // 找到地图和动物配置
        const mapIndex = debug.mapConfigs.findIndex(m => m.key === debug.currentDebugMapKey);
        const map = debug.mapConfigs[mapIndex];
        const animalConfigIndex = parseInt(configIndex);
        
        // 更新配置
        map.animals[animalConfigIndex].weight = parseFloat(document.getElementById('debug-weight').value);
        map.animals[animalConfigIndex].growthRatios = {
            mediocre: parseFloat(document.getElementById('debug-growth-mediocre').value),
            extraordinary: parseFloat(document.getElementById('debug-growth-extraordinary').value),
            brilliant: parseFloat(document.getElementById('debug-growth-brilliant').value)
        };
        
        // 保存到localStorage
        localStorage.setItem('MAP_CONFIGS', JSON.stringify(debug.mapConfigs));
        
        const config = map.animals[animalConfigIndex];
        const animal = debug.animalPool.find(a => a.key === config.animalKey);
        const rarityLabels = {
            'common': '⚪ 普通',
            'shiny': '✨ 闪光',
            'prismatic': '🌈 幻彩',
            'stellar': '⭐ 星芒'
        };
        const rarityLabel = rarityLabels[config.rarityType] || '';
        
        // 显示使用的模板信息
        let templateInfo = '';
        if (config.selectedAnimalKey) {
            const customTemplate = debug.animalPool.find(a => a.key === config.selectedAnimalKey);
            if (customTemplate) {
                templateInfo = `\n使用模板: ${customTemplate.name}`;
            }
        }
        
        alert(`✅ 已应用修改！\n\n地图: ${map.name}\n动物: ${animal.name} ${rarityLabel}${templateInfo}\n\n权重: ${config.weight}\n潜力比例已更新`);
        
        // 重新加载数据和渲染
        if (typeof renderCustomMaps === 'function') {
            debug.loadDebugData();
            renderCustomMaps();
        }
    }
};

// 立即插入HTML并设置事件监听
document.body.insertAdjacentHTML('beforeend', debugPanelHTML);

// 立即设置调试窗口事件监听
(function setupDebugListeners() {
    const debugPanel = document.getElementById('debug-panel');
    const debugHeader = document.getElementById('debug-header');
    
    if (!debugPanel || !debugHeader) {
        console.error('调试面板元素未找到');
        return;
    }
    
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            e.preventDefault();
            debugPanel.classList.toggle('hidden');
            // 更新动物信息
            if (!isWorldMapPage && typeof debug.updateAnimalInfo === 'function') {
                debug.updateAnimalInfo();
            }
        }
    });
    
    // 选中动物变化时更新信息显示
    if (!isWorldMapPage) {
        setInterval(() => {
            if (!debugPanel.classList.contains('hidden') && typeof debug.updateAnimalInfo === 'function') {
                debug.updateAnimalInfo();
            }
        }, 500);
    }
    
    // 关闭按钮
    const closeBtn = document.getElementById('btn-close-debug');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            debugPanel.classList.add('hidden');
        });
    }
    
    // 拖拽功能
    debugHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset.x = e.clientX - debugPanel.offsetLeft;
        offset.y = e.clientY - debugPanel.offsetTop;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        debugPanel.style.left = `${e.clientX - offset.x}px`;
        debugPanel.style.top = `${e.clientY - offset.y}px`;
        debugPanel.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // 地图调试专用设置
    if (isWorldMapPage) {
        // 加载数据
        debug.loadDebugData();
        debug.loadDebugMaps();
        
        // 地图选择事件
        const mapSelect = document.getElementById('debug-map-select');
        if (mapSelect) {
            mapSelect.addEventListener('change', (e) => {
                debug.currentDebugMapKey = e.target.value;
                debug.loadDebugAnimals();
            });
        }
        
        // 动物选择事件
        const animalConfigSelect = document.getElementById('debug-animal-config-select');
        if (animalConfigSelect) {
            animalConfigSelect.addEventListener('change', (e) => {
                debug.currentDebugAnimalKey = e.target.value;
                debug.loadDebugAnimalConfig();
            });
        }
    }
    
    console.log('调试面板已加载，按 ` 键打开/关闭');
})();