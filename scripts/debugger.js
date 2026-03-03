// 调试器系统
class DebuggerSystem {
    constructor() {
        this.isVisible = false;
        this.panel = null;
        this.gameTimeSystem = null;
        this.cropRaritySystem = null;
        this.farmGridSystem = null;
        this.storageSystem = null;
        this.gameState = null;
        this.toastElement = null;
        this.overlay = null;
    }
    
    // 初始化调试器
    async init(gameTimeSystem, cropRaritySystem, farmGridSystem, storageSystem, gameState) {
        this.gameTimeSystem = gameTimeSystem;
        this.cropRaritySystem = cropRaritySystem;
        this.farmGridSystem = farmGridSystem;
        this.storageSystem = storageSystem;
        this.gameState = gameState;
        
        this.createOverlay();
        this.createDebuggerUI();
        this.loadDebugSettings();
        this.bindEvents();
        
        // 添加X键监听
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyX' && !this.isInputFocused()) {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    // 检查是否在输入框中
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    }
    
    // 创建遮罩层
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'debugger-overlay';
        this.overlay.className = 'fixed inset-0 hidden';
        this.overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        this.overlay.style.zIndex = '9998';
        this.overlay.style.pointerEvents = 'auto';
        this.overlay.onclick = () => this.hide();
        document.body.appendChild(this.overlay);
    }
    
    // 创建调试器UI
    createDebuggerUI() {
        // 创建面板容器
        this.panel = document.createElement('div');
        this.panel.id = 'debugger-panel';
        this.panel.className = 'fixed hidden';
        this.panel.style.top = '50%';
        this.panel.style.left = '50%';
        this.panel.style.transform = 'translate(-50%, -50%)';
        this.panel.style.width = '90%';
        this.panel.style.maxWidth = '1400px';
        this.panel.style.maxHeight = '80vh';
        this.panel.style.overflowY = 'auto';
        this.panel.style.background = 'rgba(17, 24, 39, 0.85)';
        this.panel.style.backdropFilter = 'blur(10px)';
        this.panel.style.border = '2px solid rgba(251, 191, 36, 0.6)';
        this.panel.style.borderRadius = '16px';
        this.panel.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.8)';
        this.panel.style.zIndex = '9999';
        this.panel.style.pointerEvents = 'auto';
        
        this.panel.innerHTML = `
            <div class="max-w-7xl mx-auto p-6">
                <!-- 标题栏 -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <div class="text-4xl">🛠️</div>
                        <div>
                            <h1 class="text-3xl font-bold text-yellow-400">游戏调试器</h1>
                            <p class="text-gray-400 text-sm mt-1">调整游戏参数、资源和作物稀有度系统 (按X键关闭)</p>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 左列：资源和时间 -->
                    <div class="space-y-6">
                        <!-- 资源调整 -->
                        <div class="debug-card">
                            <div class="debug-section">
                                <h2 class="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
                                    <span>💰</span>资源调整
                                </h2>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">🍎 食物</label>
                                        <input type="number" id="debug-food" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-green-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('food')" class="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">💰 金币</label>
                                        <input type="number" id="debug-gold" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-amber-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('gold')" class="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">🪵 木材</label>
                                        <input type="number" id="debug-wood" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-orange-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('wood')" class="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">🪨 石材</label>
                                        <input type="number" id="debug-stone" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-slate-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('stone')" class="w-full mt-2 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">💎 宝石</label>
                                        <input type="number" id="debug-gems" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-pink-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('gems')" class="w-full mt-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">🌿 经验草</label>
                                        <input type="number" id="debug-expGrass" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-green-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('expGrass')" class="w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">🌙 月光花</label>
                                        <input type="number" id="debug-moonFlower" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-purple-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('moonFlower')" class="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">💠 变异晶体</label>
                                        <input type="number" id="debug-mutationCrystal" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-cyan-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('mutationCrystal')" class="w-full mt-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg">
                                        <label class="text-sm text-gray-400 mb-2 block">🌌 虚空精华</label>
                                        <input type="number" id="debug-voidEssence" class="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-lg font-mono border border-gray-700 focus:border-indigo-500 focus:outline-none" value="0">
                                        <button onclick="debuggerInstance.setResource('voidEssence')" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition-colors">设置</button>
                                    </div>
                                </div>
                                <div class="mt-4 flex gap-3">
                                    <button onclick="debuggerInstance.addAllResources(1000)" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        ➕ 所有+1000
                                    </button>
                                    <button onclick="debuggerInstance.addAllResources(10000)" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        ➕➕ 所有+10000
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 时间调整 -->
                        <div class="debug-card">
                            <div class="debug-section">
                                <h2 class="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                                    <span>🕐</span>时间调整
                                </h2>
                                
                                <!-- 自动推进开关 -->
                                <div class="bg-gray-800/50 p-4 rounded-lg mb-4 flex items-center justify-between">
                                    <div>
                                        <div class="text-sm font-bold text-white">⏰ 自动时间推进</div>
                                        <div class="text-xs text-gray-400 mt-1">现实6分钟 = 游戏1天</div>
                                    </div>
                                    <button id="toggle-auto-advance" onclick="debuggerInstance.toggleAutoAdvance()" class="px-6 py-3 rounded-lg font-bold transition-colors shadow-lg">
                                        <span id="auto-advance-status">✅ 已启用</span>
                                    </button>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-3 mb-4">
                                    <div class="bg-gray-800/50 p-4 rounded-lg text-center">
                                        <div class="text-sm text-gray-400 mb-1">当前年份</div>
                                        <div class="value-display" id="debug-year">1</div>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg text-center">
                                        <div class="text-sm text-gray-400 mb-1">当前季节</div>
                                        <div class="value-display" id="debug-season">春季</div>
                                    </div>
                                    <div class="bg-gray-800/50 p-4 rounded-lg text-center">
                                        <div class="text-sm text-gray-400 mb-1">当前周</div>
                                        <div class="value-display" id="debug-week">1</div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <button onclick="debuggerInstance.debugAdvanceDay()" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        ⏩ 推进1天
                                    </button>
                                    <button onclick="debuggerInstance.debugAdvanceWeek()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        ⏩⏩ 推进1周
                                    </button>
                                    <button onclick="debuggerInstance.debugAdvanceToSeason('夏季')" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        ☀️ 跳到夏季
                                    </button>
                                    <button onclick="debuggerInstance.debugAdvanceToSeason('冬季')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        ❄️ 跳到冬季
                                    </button>
                                </div>
                                <button onclick="debuggerInstance.debugResetTime()" class="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                    🔄 重置时间
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 右列：作物稀有度系统 -->
                    <div class="space-y-6">
                        <!-- 作物变异概率调整 -->
                        <div class="debug-card">
                            <div class="debug-section">
                                <h2 class="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                                    <span>🌈</span>作物变异概率
                                </h2>
                                
                                <!-- 基础变异率 -->
                                <div class="bg-gray-800/50 p-4 rounded-lg mb-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-sm font-bold text-white">🌱 基础变异率</label>
                                        <span class="value-display" id="base-mutation-display">5%</span>
                                    </div>
                                    <input type="range" id="base-mutation-rate" min="0" max="50" step="1" value="5" 
                                           oninput="debuggerInstance.updateBaseMutationRate(this.value)">
                                    <div class="text-xs text-gray-400 mt-2">默认: 5% (每种作物的基础变异概率)</div>
                                </div>
                                
                                <!-- 常规天气加成 -->
                                <div class="bg-gray-800/50 p-4 rounded-lg mb-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-sm font-bold text-white">☀️ 常规天气加成</label>
                                        <span class="value-display" id="normal-weather-display">+1%</span>
                                    </div>
                                    <input type="range" id="normal-weather-bonus" min="0" max="20" step="1" value="1" 
                                           oninput="debuggerInstance.updateNormalWeatherBonus(this.value)">
                                    <div class="text-xs text-gray-400 mt-2">常规天气(晴/阴/小雨)每个阶段的变异率加成</div>
                                </div>
                                
                                <!-- 极端天气加成 -->
                                <div class="bg-gray-800/50 p-4 rounded-lg mb-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-sm font-bold text-white">⚡ 极端天气加成</label>
                                        <span class="value-display" id="extreme-weather-display">+10%</span>
                                    </div>
                                    <input type="range" id="extreme-weather-bonus" min="0" max="50" step="1" value="10" 
                                           oninput="debuggerInstance.updateExtremeWeatherBonus(this.value)">
                                    <div class="text-xs text-gray-400 mt-2">极端天气(中雨/暴雨/台风/雷暴)每个阶段的变异率加成</div>
                                </div>
                                
                                <!-- 变异结果分布说明 -->
                                <div class="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-4 rounded-lg border border-indigo-500/30">
                                    <div class="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
                                        <span>🎲</span>变异结果分布
                                    </div>
                                    <div class="space-y-2 text-xs">
                                        <div class="flex justify-between items-center">
                                            <span class="text-green-400 flex items-center gap-1">
                                                <span class="text-lg">🟢</span>
                                                绿色稀有度
                                            </span>
                                            <span class="text-gray-300 font-mono">70%</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-blue-400 flex items-center gap-1">
                                                <span class="text-lg">🔵</span>
                                                蓝色稀有度
                                            </span>
                                            <span class="text-gray-300 font-mono">20%</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-purple-400 flex items-center gap-1">
                                                <span class="text-lg">🟣</span>
                                                紫色稀有度
                                            </span>
                                            <span class="text-gray-300 font-mono">6%</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-yellow-400 flex items-center gap-1">
                                                <span class="text-lg">🟡</span>
                                                金色稀有度
                                            </span>
                                            <span class="text-gray-300 font-mono">3%</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-red-400 flex items-center gap-1">
                                                <span class="text-lg">🔴</span>
                                                红色稀有度
                                            </span>
                                            <span class="text-gray-300 font-mono">1%</span>
                                        </div>
                                    </div>
                                    <div class="mt-3 pt-3 border-t border-indigo-500/30 text-xs text-gray-400">
                                        ℹ️ 只有在发生变异时才按此分布决定稀有度
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 作物生长时间 -->
                        <div class="debug-card">
                            <div class="debug-section">
                                <h2 class="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                                    <span>⏱️</span>作物生长时间
                                </h2>
                                
                                <div class="bg-gray-800/50 p-4 rounded-lg mb-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-sm font-bold text-white">📅 生长周期(游戏天数)</label>
                                        <span class="value-display" id="growth-days-display">3天</span>
                                    </div>
                                    <input type="range" id="growth-days" min="1" max="10" step="1" value="3" 
                                           oninput="debuggerInstance.updateGrowthDays(this.value)">
                                    <div class="text-xs text-gray-400 mt-2">所有作物的生长周期 (默认: 3游戏天 = 18分钟)</div>
                                </div>
                                
                                <div class="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30">
                                    <div class="text-sm font-bold text-blue-300 mb-2">ℹ️ 提示</div>
                                    <div class="text-xs text-gray-300 space-y-1">
                                        <div>• 1游戏天 = 现实6分钟</div>
                                        <div>• 作物成长分3个阶段: 幼苗期、生长期、成熟期</div>
                                        <div>• 每个阶段占用等量时间</div>
                                        <div>• 每个阶段受当前天气影响获得变异加成</div>
                                        <div>• 三个阶段的加成累加后与基础变异率相加</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 重置和保存 -->
                        <div class="debug-card">
                            <div class="debug-section">
                                <h2 class="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                                    <span>⚠️</span>重置选项
                                </h2>
                                <div class="space-y-3">
                                    <button onclick="debuggerInstance.resetAllSettings()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        🔄 重置所有设置到默认值
                                    </button>
                                    <button onclick="debuggerInstance.saveSettings()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                        💾 应用并保存当前设置
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .debug-card {
                background: rgba(17, 24, 39, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid #374151;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            
            .debug-section {
                border-bottom: 1px solid #374151;
                padding: 1.5rem;
            }
            
            .debug-section:last-child {
                border-bottom: none;
            }
            
            .value-display {
                font-family: 'Courier New', monospace;
                font-size: 1.25rem;
                font-weight: bold;
                color: #fbbf24;
            }
            
            #debugger-panel input[type="range"] {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 8px;
                border-radius: 5px;  
                background: #4b5563;
                outline: none;
            }
            
            #debugger-panel input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%; 
                background: #fbbf24;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            }
            
            #debugger-panel input[type="range"]::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #fbbf24;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                border: none;
            }
        `;
        document.head.appendChild(style);
        
        // 添加到页面
        document.body.appendChild(this.panel);
        
        // 创建Toast通知
        this.toastElement = document.createElement('div');
        this.toastElement.id = 'debugger-toast';
        this.toastElement.className = 'fixed left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl hidden border border-gray-700 transition-all';
        this.toastElement.style.bottom = '85vh'; // 显示在调试器上方
        this.toastElement.style.zIndex = '10000';
        this.toastElement.innerHTML = '<span id="debugger-toast-message"></span>';
        document.body.appendChild(this.toastElement);
    }
    
    // 绑定事件
    bindEvents() {
        // 加载当前资源值
        this.updateResourceInputs();
    }
    
    // 显示/隐藏切换
    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    // 显示调试器
    show() {
        if (!this.panel || !this.overlay) return;
        this.overlay.classList.remove('hidden');
        this.panel.classList.remove('hidden');
        this.isVisible = true;
        this.updateResourceInputs();
        this.updateTimeDisplay();
        this.showToast('🛠️ 调试器已打开 (按X键关闭)', 1500);
    }
    
    // 隐藏调试器
    hide() {
        if (!this.panel || !this.overlay) return;
        this.panel.classList.add('hidden');
        this.overlay.classList.add('hidden');
        this.isVisible = false;
        this.showToast('🛠️ 调试器已关闭', 1000);
    }
    
    // Toast通知
    showToast(message, duration = 2000) {
        const toastMessage = this.toastElement.querySelector('#debugger-toast-message');
        toastMessage.textContent = message;
        this.toastElement.classList.remove('hidden');
        setTimeout(() => {
            this.toastElement.classList.add('hidden');
        }, duration);
    }
    
    // 更新资源输入框
    updateResourceInputs() {
        if (!this.gameState) return;
        
        document.getElementById('debug-food').value = Math.floor(this.gameState.food || 0);
        document.getElementById('debug-gold').value = this.gameState.gold || 0;
        document.getElementById('debug-wood').value = this.gameState.wood || 0;
        document.getElementById('debug-stone').value = this.gameState.stone || 0;
        document.getElementById('debug-gems').value = this.gameState.gems || 0;
        document.getElementById('debug-expGrass').value = this.gameState.expGrass || 0;
        document.getElementById('debug-moonFlower').value = this.gameState.moonFlower || 0;
        document.getElementById('debug-mutationCrystal').value = this.gameState.mutationCrystal || 0;
        document.getElementById('debug-voidEssence').value = this.gameState.voidEssence || 0;
    }
    
    // 更新时间显示
    updateTimeDisplay() {
        if (!this.gameTimeSystem) return;
        
        const timeInfo = this.gameTimeSystem.getCurrentTime();
        document.getElementById('debug-year').textContent = timeInfo.year;
        document.getElementById('debug-season').textContent = timeInfo.season;
        document.getElementById('debug-week').textContent = timeInfo.week;
        this.updateAutoAdvanceButton();
    }
    
    // 资源设置
    setResource(resourceType) {
        const inputId = `debug-${resourceType}`;
        const value = parseInt(document.getElementById(inputId).value, 10);
        if (isNaN(value) || value < 0) {
            this.showToast('❌ 请输入有效的数值');
            return;
        }
        
        if (!this.gameState) {
            this.showToast('❌ 游戏状态未加载');
            return;
        }
        
        this.gameState[resourceType] = value;
        if (window.updateUI) window.updateUI();
        this.showToast(`✅ ${resourceType} 已设置为 ${value}`);
    }
    
    // 批量添加资源
    addAllResources(amount) {
        if (!this.gameState) {
            this.showToast('❌ 游戏状态未加载');
            return;
        }
        
        this.gameState.food = (this.gameState.food || 0) + amount;
        this.gameState.gold = (this.gameState.gold || 0) + amount;
        this.gameState.wood = (this.gameState.wood || 0) + amount;
        this.gameState.stone = (this.gameState.stone || 0) + amount;
        this.gameState.gems = (this.gameState.gems || 0) + amount;
        this.gameState.expGrass = (this.gameState.expGrass || 0) + amount;
        this.gameState.moonFlower = (this.gameState.moonFlower || 0) + amount;
        this.gameState.mutationCrystal = (this.gameState.mutationCrystal || 0) + amount;
        this.gameState.voidEssence = (this.gameState.voidEssence || 0) + amount;
        
        // 更新输入框显示
        this.updateResourceInputs();
        
        if (window.updateUI) window.updateUI();
        this.showToast(`✅ 所有资源 +${amount}`);
    }
    
    // 时间系统
    toggleAutoAdvance() {
        if (!this.gameTimeSystem) {
            this.showToast('❌ 时间系统未初始化');
            return;
        }
        
        const enabled = this.gameTimeSystem.setAutoAdvance(!this.gameTimeSystem.autoAdvanceEnabled);
        this.updateAutoAdvanceButton();
        this.showToast(enabled ? '✅ 自动时间推进已启用' : '⏸️ 自动时间推进已暂停');
        
        if (enabled) {
            this.gameTimeSystem.lastAdvanceTime = Date.now();
        }
        this.gameTimeSystem.saveData();
    }
    
    updateAutoAdvanceButton() {
        const button = document.getElementById('toggle-auto-advance');
        const status = document.getElementById('auto-advance-status');
        
        if (!button || !status || !this.gameTimeSystem) return;
        
        if (this.gameTimeSystem.autoAdvanceEnabled) {
            button.className = 'px-6 py-3 rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-lg';
            status.textContent = '✅ 已启用';
        } else {
            button.className = 'px-6 py-3 rounded-lg font-bold bg-gray-600 hover:bg-gray-700 text-white transition-colors shadow-lg';
            status.textContent = '⏸️ 已暂停';
        }
    }
    
    async debugAdvanceDay() {
        if (!this.gameTimeSystem) {
            this.showToast('❌ 时间系统未初始化');
            return;
        }
        const result = this.gameTimeSystem.advanceDay();
        if (result.success) {
            await this.gameTimeSystem.saveData();
            this.updateTimeDisplay();
            
            // 触发农场格子更新
            if (this.farmGridSystem) {
                this.farmGridSystem.updateAllFarms();
                this.farmGridSystem.saveData();
                if (window.updateAllFarmGridsUI) window.updateAllFarmGridsUI();
            }
            if (this.cropRaritySystem) {
                this.cropRaritySystem.updateAllCrops();
                this.cropRaritySystem.saveData();
            }
            
            // 更新主界面时间显示
            if (window.updateGameTimeDisplay) window.updateGameTimeDisplay();
            
            this.showToast(`✅ 时间推进1天 - 星期${result.dayName}`);
        } else {
            this.showToast(`❌ ${result.reason}`);
        }
    }
    
    async debugAdvanceWeek() {
        if (!this.gameTimeSystem) {
            this.showToast('❌ 时间系统未初始化');
            return;
        }
        const result = this.gameTimeSystem.advanceWeek();
        if (result.success) {
            await this.gameTimeSystem.saveData();
            this.updateTimeDisplay();
            
            // 触发农场格子更新
            if (this.farmGridSystem) {
                this.farmGridSystem.updateAllFarms();
                this.farmGridSystem.saveData();
                if (window.updateAllFarmGridsUI) window.updateAllFarmGridsUI();
            }
            if (this.cropRaritySystem) {
                this.cropRaritySystem.updateAllCrops();
                this.cropRaritySystem.saveData();
            }
            
            // 更新主界面时间显示
            if (window.updateGameTimeDisplay) window.updateGameTimeDisplay();
            
            const timeInfo = this.gameTimeSystem.getCurrentTime();
            this.showToast(`✅ 时间推进到第${timeInfo.year}年 ${timeInfo.season} 第${timeInfo.week}周`);
        } else {
            this.showToast(`❌ ${result.reason}`);
        }
    }
    
    async debugAdvanceToSeason(targetSeason) {
        if (!this.gameTimeSystem) {
            this.showToast('❌ 时间系统未初始化');
            return;
        }
        
        const seasonWeeks = { '春季': 1, '夏季': 14, '秋季': 27, '冬季': 40 };
        const targetWeek = seasonWeeks[targetSeason];
        if (!targetWeek) return;
        
        const timeInfo = this.gameTimeSystem.getCurrentTime();
        let weeksToAdvance = 0;
        
        if (timeInfo.week <= targetWeek) {
            weeksToAdvance = targetWeek - timeInfo.week;
        } else {
            weeksToAdvance = (52 - timeInfo.week) + targetWeek;
        }
        
        if (weeksToAdvance > 0) {
            const result = this.gameTimeSystem.fastForward(weeksToAdvance);
            if (result.success) {
                await this.gameTimeSystem.saveData();
                this.updateTimeDisplay();
                
                // 触发农场格子更新
                if (this.farmGridSystem) {
                    this.farmGridSystem.updateAllFarms();
                    this.farmGridSystem.saveData();
                    if (window.updateAllFarmGridsUI) window.updateAllFarmGridsUI();
                }
                if (this.cropRaritySystem) {
                    this.cropRaritySystem.updateAllCrops();
                    this.cropRaritySystem.saveData();
                }
                
                // 更新主界面时间显示
                if (window.updateGameTimeDisplay) window.updateGameTimeDisplay();
                
                const newTimeInfo = this.gameTimeSystem.getCurrentTime();
                this.showToast(`✅ 已跳转到${targetSeason}：第${newTimeInfo.year}年第${newTimeInfo.week}周`);
            }
        } else {
            this.showToast(`ℹ️ 当前已经是${targetSeason}`);
        }
    }
    
    async debugResetTime() {
        if (!this.gameTimeSystem) {
            this.showToast('❌ 时间系统未初始化');
            return;
        }
        
        if (!confirm('确定要重置时间到第1年春季第1周吗？')) return;
        
        this.gameTimeSystem.reset();
        await this.gameTimeSystem.saveData();
        this.updateTimeDisplay();
        
        // 更新主界面时间显示
        if (window.updateGameTimeDisplay) window.updateGameTimeDisplay();
        
        this.showToast('🔄 时间已重置');
    }
    
    // 作物稀有度系统调试
    updateBaseMutationRate(value) {
        document.getElementById('base-mutation-display').textContent = value + '%';
        this.saveDebugSetting('baseMutationRate', parseFloat(value) / 100);
    }
    
    updateNormalWeatherBonus(value) {
        document.getElementById('normal-weather-display').textContent = '+' + value + '%';
        this.saveDebugSetting('normalWeatherBonus', parseInt(value));
    }
    
    updateExtremeWeatherBonus(value) {
        document.getElementById('extreme-weather-display').textContent = '+' + value + '%';
        this.saveDebugSetting('extremeWeatherBonus', parseInt(value));
    }
    
    updateGrowthDays(value) {
        document.getElementById('growth-days-display').textContent = value + '天';
        this.saveDebugSetting('growthDays', parseInt(value));
    }
    
    // 保存和加载调试器设置
    saveDebugSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem('debugSettings') || '{}');
        settings[key] = value;
        localStorage.setItem('debugSettings', JSON.stringify(settings));
    }
    
    loadDebugSettings() {
        const settings = JSON.parse(localStorage.getItem('debugSettings') || '{}');
        
        // 基础变异率
        if (settings.baseMutationRate !== undefined) {
            const value = settings.baseMutationRate * 100;
            document.getElementById('base-mutation-rate').value = value;
            document.getElementById('base-mutation-display').textContent = value + '%';
        }
        
        // 常规天气加成
        if (settings.normalWeatherBonus !== undefined) {
            document.getElementById('normal-weather-bonus').value = settings.normalWeatherBonus;
            document.getElementById('normal-weather-display').textContent = '+' + settings.normalWeatherBonus + '%';
        }
        
        // 极端天气加成
        if (settings.extremeWeatherBonus !== undefined) {
            document.getElementById('extreme-weather-bonus').value = settings.extremeWeatherBonus;
            document.getElementById('extreme-weather-display').textContent = '+' + settings.extremeWeatherBonus + '%';
        }
        
        // 生长周期
        if (settings.growthDays !== undefined) {
            document.getElementById('growth-days').value = settings.growthDays;
            document.getElementById('growth-days-display').textContent = settings.growthDays + '天';
        }
    }
    
    resetAllSettings() {
        if (!confirm('确定要重置所有设置到默认值吗？')) return;
        
        // 重置为默认值
        document.getElementById('base-mutation-rate').value = 5;
        document.getElementById('base-mutation-display').textContent = '5%';
        
        document.getElementById('normal-weather-bonus').value = 1;
        document.getElementById('normal-weather-display').textContent = '+1%';
        
        document.getElementById('extreme-weather-bonus').value = 10;
        document.getElementById('extreme-weather-display').textContent = '+10%';
        
        document.getElementById('growth-days').value = 3;
        document.getElementById('growth-days-display').textContent = '3天';
        
        // 保存默认值
        const defaultSettings = {
            baseMutationRate: 0.05,
            normalWeatherBonus: 1,
            extremeWeatherBonus: 10,
            growthDays: 3
        };
        localStorage.setItem('debugSettings', JSON.stringify(defaultSettings));
        this.showToast('🔄 所有设置已重置到默认值');
    }
    
    saveSettings() {
        // 设置已经实时保存，这里提示用户
        this.showToast('✅ 当前设置已保存并将在游戏中生效');
    }
}

// 全局实例
let debuggerInstance = null;
