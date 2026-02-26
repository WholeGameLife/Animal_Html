// 繁育权重调试工具 - 游戏内快捷键调用
// 按 Ctrl+B 打开/关闭繁育权重调试面板

// 创建繁育调试窗口HTML
const breedingDebugPanelHTML = `
    <div id="breeding-debug-panel" class="fixed top-10 right-10 bg-gray-900/95 backdrop-blur-lg border-2 border-purple-500 rounded-xl p-4 text-white w-[500px] z-50 hidden shadow-2xl" style="cursor: move;">
        <div id="breeding-debug-header" class="w-full flex justify-between items-center mb-4 cursor-move">
            <h4 class="text-lg font-bold text-purple-400">🧬 繁育权重调试器 <span class="text-xs text-gray-400">[Alt+B]</span></h4>
            <button id="btn-close-breeding-debug" class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div class="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
            <!-- 快速测试区 -->
            <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <label class="block text-sm font-semibold text-yellow-400 mb-3">🧪 快速测试</label>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">父方珍惜度</label>
                        <input type="number" id="bd-p1-precious" min="0" max="100" value="20" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                            onchange="breedingDebug.updateTestResult()">
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 block mb-1">母方珍惜度</label>
                        <input type="number" id="bd-p2-precious" min="0" max="100" value="20" 
                            class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                            onchange="breedingDebug.updateTestResult()">
                    </div>
                </div>
                <div class="mt-2 p-2 bg-gray-900/50 rounded text-xs">
                    <div class="flex justify-between mb-1">
                        <span class="text-gray-400">平均珍惜度:</span>
                        <span class="text-yellow-400 font-bold" id="bd-avg-precious">20.00</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">使用区间:</span>
                        <span class="text-purple-400 font-bold" id="bd-range-desc">0-20</span>
                    </div>
                </div>
            </div>

            <!-- 当前概率显示 -->
            <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <label class="block text-sm font-semibold text-green-400 mb-2">📊 技能概率分布</label>
                <div class="space-y-2" id="bd-probability-display">
                    <!-- 动态生成 -->
                </div>
            </div>

            <!-- 权重倍率配置 -->
            <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <label class="block text-sm font-semibold text-orange-400 mb-3">⚙️ 权重倍率配置</label>
                <div class="max-h-[300px] overflow-y-auto pr-1">
                    <table class="w-full text-xs" id="bd-multiplier-table">
                        <thead class="sticky top-0 bg-gray-900">
                            <tr>
                                <th class="text-left p-1 text-gray-400">区间</th>
                                <th class="text-center p-1 text-gray-400">普通</th>
                                <th class="text-center p-1 text-gray-400">稀有</th>
                                <th class="text-center p-1 text-gray-400">史诗</th>
                                <th class="text-center p-1 text-gray-400">传说</th>
                            </tr>
                        </thead>
                        <tbody id="bd-multiplier-body">
                            <!-- 动态生成 -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="grid grid-cols-2 gap-2">
                <button onclick="breedingDebug.saveMultipliers()" class="bg-green-600 hover:bg-green-700 text-sm py-2 rounded-lg font-bold transition">
                    💾 保存配置
                </button>
                <button onclick="breedingDebug.resetToDefault()" class="bg-orange-600 hover:bg-orange-700 text-sm py-2 rounded-lg font-bold transition">
                    🔄 恢复默认
                </button>
            </div>

            <div class="text-xs text-center text-gray-400 bg-gray-800/30 py-2 rounded">
                配置仅影响繁育子代技能，不影响野生动物
            </div>
        </div>
    </div>
`;

// 繁育调试对象
window.breedingDebug = {
    // 默认配置
    defaultMultipliers: [
        { min: 0,  max: 20,  common: 1.0,  rare: 1.0,  epic: 1.0,   legendary: 1.0,   desc: '标准池，极难出货' },
        { min: 21, max: 40,  common: 0.8,  rare: 1.5,  epic: 2.0,   legendary: 1.5,   desc: '压缩低级，中级翻倍' },
        { min: 41, max: 60,  common: 0.5,  rare: 2.5,  epic: 4.0,   legendary: 3.0,   desc: '高级技能开始井喷' },
        { min: 61, max: 80,  common: 0.2,  rare: 3.0,  epic: 8.0,   legendary: 10.0,  desc: '史诗保底，传说露头' },
        { min: 81, max: 95,  common: 0.05, rare: 2.0,  epic: 15.0,  legendary: 30.0,  desc: '传说概率显著提升' },
        { min: 96, max: 100, common: 0.0,  rare: 1.0,  epic: 20.0,  legendary: 40.0,  desc: '剔除普通，传说狂欢' }
    ],

    // 基础权重
    baseWeights: { common: 70, rare: 20, epic: 8, legendary: 2 },

    // 加载配置
    loadMultipliers: function() {
        try {
            const saved = localStorage.getItem('BREEDING_MULTIPLIERS');
            return saved ? JSON.parse(saved) : this.defaultMultipliers;
        } catch (e) {
            console.warn('读取繁育配置失败', e);
            return this.defaultMultipliers;
        }
    },

    // 保存配置
    saveMultipliers: function() {
        try {
            const tbody = document.getElementById('bd-multiplier-body');
            const rows = tbody.querySelectorAll('tr');
            const multipliers = [];

            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('input');
                const rangeText = row.cells[0].textContent.trim();
                const [min, max] = rangeText.split('-').map(s => parseInt(s));
                
                multipliers.push({
                    min: min,
                    max: max,
                    common: parseFloat(cells[0].value) || 0,
                    rare: parseFloat(cells[1].value) || 0,
                    epic: parseFloat(cells[2].value) || 0,
                    legendary: parseFloat(cells[3].value) || 0,
                    desc: this.defaultMultipliers[index]?.desc || ''
                });
            });

            localStorage.setItem('BREEDING_MULTIPLIERS', JSON.stringify(multipliers));
            this.updateTestResult();
            
            if (typeof showStatus === 'function') {
                showStatus('✅ 繁育权重配置已保存', 2000);
            } else {
                alert('✅ 繁育权重配置已保存！');
            }
        } catch (e) {
            console.error('保存失败', e);
            alert('❌ 保存失败：' + e.message);
        }
    },

    // 恢复默认
    resetToDefault: function() {
        if (confirm('确定要恢复默认繁育权重配置吗？')) {
            localStorage.setItem('BREEDING_MULTIPLIERS', JSON.stringify(this.defaultMultipliers));
            this.renderTable();
            this.updateTestResult();
            
            if (typeof showStatus === 'function') {
                showStatus('✅ 已恢复默认配置', 2000);
            } else {
                alert('✅ 已恢复默认配置！');
            }
        }
    },

    // 渲染配置表
    renderTable: function() {
        const multipliers = this.loadMultipliers();
        const tbody = document.getElementById('bd-multiplier-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        multipliers.forEach((config) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="p-1 text-gray-300 font-mono">${config.min}-${config.max}</td>
                <td class="p-1"><input type="number" step="0.01" value="${config.common}" 
                    class="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
                    onchange="breedingDebug.updateTestResult()"></td>
                <td class="p-1"><input type="number" step="0.1" value="${config.rare}" 
                    class="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
                    onchange="breedingDebug.updateTestResult()"></td>
                <td class="p-1"><input type="number" step="0.1" value="${config.epic}" 
                    class="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
                    onchange="breedingDebug.updateTestResult()"></td>
                <td class="p-1"><input type="number" step="0.1" value="${config.legendary}" 
                    class="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-center text-xs"
                    onchange="breedingDebug.updateTestResult()"></td>
            `;
        });
    },

    // 更新测试结果
    updateTestResult: function() {
        const p1 = parseFloat(document.getElementById('bd-p1-precious')?.value || 20);
        const p2 = parseFloat(document.getElementById('bd-p2-precious')?.value || 20);
        const avg = (p1 + p2) / 2;

        document.getElementById('bd-avg-precious').textContent = avg.toFixed(2);

        // 获取当前配置
        const tbody = document.getElementById('bd-multiplier-body');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        let range = null;
        let multipliers = null;

        rows.forEach((row) => {
            const rangeText = row.cells[0].textContent.trim();
            const [min, max] = rangeText.split('-').map(s => parseInt(s));
            if (avg >= min && avg <= max) {
                range = `${min}-${max}`;
                const inputs = row.querySelectorAll('input');
                multipliers = {
                    common: parseFloat(inputs[0].value) || 0,
                    rare: parseFloat(inputs[1].value) || 0,
                    epic: parseFloat(inputs[2].value) || 0,
                    legendary: parseFloat(inputs[3].value) || 0
                };
                // 高亮当前行
                row.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
            } else {
                row.style.backgroundColor = '';
            }
        });

        document.getElementById('bd-range-desc').textContent = range || 'N/A';

        if (multipliers) {
            this.updateProbabilityDisplay(multipliers);
        }
    },

    // 更新概率显示
    updateProbabilityDisplay: function(multipliers) {
        const raw = {
            common: this.baseWeights.common * multipliers.common,
            rare: this.baseWeights.rare * multipliers.rare,
            epic: this.baseWeights.epic * multipliers.epic,
            legendary: this.baseWeights.legendary * multipliers.legendary
        };

        const sum = raw.common + raw.rare + raw.epic + raw.legendary;
        const total = this.baseWeights.common + this.baseWeights.rare + this.baseWeights.epic + this.baseWeights.legendary;

        const adjusted = {
            common: sum > 0 ? (raw.common / sum) * total : 0,
            rare: sum > 0 ? (raw.rare / sum) * total : 0,
            epic: sum > 0 ? (raw.epic / sum) * total : 0,
            legendary: sum > 0 ? (raw.legendary / sum) * total : 0
        };

        const finalSum = adjusted.common + adjusted.rare + adjusted.epic + adjusted.legendary;
        const probs = {
            common: (adjusted.common / finalSum) * 100,
            rare: (adjusted.rare / finalSum) * 100,
            epic: (adjusted.epic / finalSum) * 100,
            legendary: (adjusted.legendary / finalSum) * 100
        };

        const display = document.getElementById('bd-probability-display');
        if (!display) return;

        display.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-gray-400 text-xs w-12">普通</span>
                <div class="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                    <div class="bg-gradient-to-r from-gray-500 to-gray-400 h-full flex items-center justify-center text-xs font-bold" 
                         style="width: ${probs.common}%">${probs.common.toFixed(1)}%</div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-blue-400 text-xs w-12">稀有</span>
                <div class="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-full flex items-center justify-center text-xs font-bold" 
                         style="width: ${probs.rare}%">${probs.rare.toFixed(1)}%</div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-purple-400 text-xs w-12">史诗</span>
                <div class="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                    <div class="bg-gradient-to-r from-purple-500 to-purple-400 h-full flex items-center justify-center text-xs font-bold" 
                         style="width: ${probs.epic}%">${probs.epic.toFixed(1)}%</div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-yellow-400 text-xs w-12">传说</span>
                <div class="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                    <div class="bg-gradient-to-r from-yellow-500 to-orange-400 h-full flex items-center justify-center text-xs font-bold" 
                         style="width: ${probs.legendary}%">${probs.legendary.toFixed(1)}%</div>
                </div>
            </div>
        `;
    }
};

// 等待 DOM 加载完成后再初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBreedingDebug);
} else {
    initBreedingDebug();
}

function initBreedingDebug() {
    // 插入HTML
    document.body.insertAdjacentHTML('beforeend', breedingDebugPanelHTML);
    
    // 设置事件监听
    setupBreedingDebugListeners();
}

function setupBreedingDebugListeners() {
    const panel = document.getElementById('breeding-debug-panel');
    const header = document.getElementById('breeding-debug-header');
    
    if (!panel || !header) {
        console.error('繁育调试面板元素未找到');
        return;
    }
    
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    
    // 键盘快捷键 Alt+B (避免与浏览器快捷键冲突)
    document.addEventListener('keydown', (e) => {
        // Alt+B 打开/关闭
        if (e.altKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            console.log('🧬 繁育调试器快捷键触发');
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                console.log('🧬 打开繁育调试器');
                breedingDebug.renderTable();
                breedingDebug.updateTestResult();
            } else {
                console.log('🧬 关闭繁育调试器');
            }
        }
    });
    
    // 关闭按钮
    const closeBtn = document.getElementById('btn-close-breeding-debug');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
        });
    }
    
    // 拖拽功能
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset.x = e.clientX - panel.offsetLeft;
        offset.y = e.clientY - panel.offsetTop;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offset.x}px`;
        panel.style.top = `${e.clientY - offset.y}px`;
        panel.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    console.log('✅ 繁育权重调试器已加载！');
    console.log('📌 快捷键: Alt+B 打开/关闭调试面板');
    console.log('📌 面板ID:', panel?.id);
}