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
    <div id="debug-panel" class="fixed top-10 right-10 control-panel p-4 rounded-lg text-white w-96 z-50 hidden" style="cursor: move;">
        <div id="debug-header" class="w-full flex justify-between items-center mb-4">
            <h4 class="text-lg font-bold text-red-500">🐞 调试窗口</h4>
            <button id="btn-close-debug" class="text-xl">&times;</button>
        </div>
        <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
            <!-- 资源控制 -->
            <div class="bg-gray-800 p-3 rounded">
                <p class="font-semibold text-yellow-400 mb-2">资源</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.addResource('food', 1000)" class="bg-blue-600 text-xs py-1 rounded">+1000 食物</button>
                    <button onclick="debug.addResource('gems', 100)" class="bg-blue-600 text-xs py-1 rounded">+100 宝石</button>
                </div>
            </div>
            <!-- 动物控制 -->
            <div class="bg-gray-800 p-3 rounded">
                <p class="font-semibold text-green-400 mb-2">选中动物</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.addLevel(1)" class="bg-green-600 text-xs py-1 rounded">+1 等级</button>
                    <button onclick="debug.addLevel(10)" class="bg-green-600 text-xs py-1 rounded">+10 等级</button>
                    <button onclick="debug.addExperience(100)" class="bg-green-600 text-xs py-1 rounded">+100 经验</button>
                </div>
            </div>
            <!-- 变异控制 -->
            <div class="bg-gray-800 p-3 rounded">
                <p class="font-semibold text-pink-400 mb-2">变异</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="debug.addMutationSerum(1)" class="bg-pink-600 text-xs py-1 rounded">+1 变异血清</button>
                    <button onclick="debug.resetMutationCooldown()" class="bg-pink-600 text-xs py-1 rounded">重置冷却</button>
                </div>
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
        updateResourceUI();
        showStatus(`调试：+${amount} ${resource}`, 1500);
    },
    addLevel: (levels) => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) return showStatus('调试：未选择动物', 1500);
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        for (let i = 0; i < levels; i++) {
            levelUpAnimal(animal);
        }
        showAnimalDetails(animal.id);
        showStatus(`调试：+${levels} 等级`, 1500);
    },
    addExperience: (amount) => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) return showStatus('调试：未选择动物', 1500);
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        animal.experience += amount;
        if (animal.experience >= animal.experienceToNextLevel) {
            levelUpAnimal(animal);
        }
        showAnimalDetails(animal.id);
        showStatus(`调试：+${amount} 经验`, 1500);
    },
    addMutationSerum: (amount) => {
        if (typeof gameState === 'undefined') return;
        gameState.inventory['mutation_serum'] = (gameState.inventory['mutation_serum'] || 0) + amount;
        updateResourceUI();
        if (typeof renderItemPanel === 'function') renderItemPanel();
        showStatus(`调试：+${amount} 变异血清`, 1500);
    },
    resetMutationCooldown: () => {
        if (typeof selectedAnimalId === 'undefined' || !selectedAnimalId) return showStatus('调试：未选择动物', 1500);
        const animal = gameState.animals.find(a => a.id === selectedAnimalId);
        animal.mutationCooldownEnd = 0;
        if (typeof selectMutationTarget === 'function') selectMutationTarget(animal);
        showStatus('调试：变异冷却已重置', 1500);
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
        }
    });
    
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