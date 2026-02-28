/**
 * 新手引导系统
 * 用于引导新玩家了解游戏的核心机制
 */

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.completed = false;
        this.isPaused = false; // 新增：暂停状态
        this.overlayElement = null;
        this.tooltipElement = null;
        this.highlightElement = null;
        
        // 引导步骤配置
        this.steps = [
            {
                id: 'welcome',
                title: '欢迎来到电子盆栽！',
                content: '这是一个动物养成与基建管理游戏。让我来帮助你了解游戏的基本玩法。',
                target: null, // 不高亮特定元素
                position: 'center',
                nextButton: '开始教程'
            },
            {
                id: 'breeding_den',
                title: '🏡 繁殖窝',
                content: '这是你的繁殖窝，是游戏的核心建筑。繁殖窝等级决定了你能养多少只动物。点击旁边的数字可以查看当前等级。',
                target: '#den-building',
                position: 'bottom',
                nextButton: '下一步'
            },
            {
                id: 'stats_panel',
                title: '📊 栖息地状态',
                content: '这里显示你的资源状况。食物、金币、木材、石材等都是游戏中的重要资源。',
                target: '#stats-panel',
                position: 'right',
                highlight: true,
                nextButton: '明白了'
            },
            {
                id: 'food_resource',
                title: '🍎 食物资源',
                content: '食物是最基础的资源，用于升级繁殖窝、建造建筑和喂养动物。注意观察你的食物数量。',
                target: '#stat-food',
                position: 'right',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'gold_resource',
                title: '💰 金币资源',
                content: '金币用于购买高级建筑和商店道具。通过金矿建筑可以产出金币。',
                target: '#stat-gold',
                position: 'right',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'wood_resource',
                title: '🪵 木材资源',
                content: '木材是建造进阶建筑的材料之一。伐木场可以产出木材。',
                target: '#stat-wood',
                position: 'right',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'stone_resource',
                title: '🪨 石材资源',
                content: '石材也是建造进阶建筑的重要材料。采石场可以产出石材。',
                target: '#stat-stone',
                position: 'right',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'den_level',
                title: '🏠 繁殖窝等级',
                content: '繁殖窝的等级越高，可以养的动物就越多。升级繁殖窝需要消耗食物。',
                target: '#stat-den-level',
                position: 'right',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'animal_count',
                title: '🐾 动物数量',
                content: '这里显示你当前拥有的动物数量和容量上限。繁殖窝每升一级，容量增加5只。',
                target: '#stat-animal-count',
                position: 'right',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'place_building',
                title: '🔨 放置建筑',
                content: '点击这个按钮可以打开建筑菜单，选择你想要建造的建筑类型。建筑是产出资源的主要方式。',
                target: '#btn-open-build',
                position: 'top',
                highlight: true,
                nextButton: null,
                waitForClick: true // 等待玩家点击按钮
            },
            {
                id: 'building_categories',
                title: '🏗️ 建筑类型',
                content: '建筑分为多个类别：地标、交易所和基础建筑。基础建筑包括农场、伐木场等资源产出建筑。现在点击"基础建筑"按钮。',
                target: '[data-category="materials"]',
                position: 'right',
                highlight: true,
                nextButton: null,
                waitForAction: 'openBasicBuildings' // 等待打开基础建筑菜单
            },
            {
                id: 'basic_buildings',
                title: '🏗️ 基础建筑',
                content: '这里是基础建筑列表。农场产出食物，伐木场产出木材，采石场产出石材。选择任一建筑进行建造，完成后我会继续教学。',
                target: '#build-material-menu',
                position: 'left',
                highlight: true,
                nextButton: null,
                waitForAction: 'buildingPlaced' // 等待建筑放置完成
            },
            {
                id: 'building_placed',
                title: '✅ 建筑已放置',
                content: '很好！你已经成功放置了一个建筑。现在点击这个建筑，查看它的详细信息（当前效果、升级预览、工作动物等）。',
                target: null, // 将在运行时设置为新放置的建筑
                targetDynamic: 'lastPlacedBuilding',
                position: 'right',
                highlight: true,
                nextButton: null, // 隐藏按钮，等待玩家操作
                waitForAction: 'buildingDetailsOpened'
            },
            {
                id: 'building_details_intro',
                title: '📋 建筑详情',
                content: '很好！这里是建筑详情面板。接下来我将逐一介绍建筑的各项信息。',
                target: '#building-details-panel',
                position: 'left',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'building_current_effect',
                title: '💫 当前效果',
                content: '这部分显示建筑当前的产出情况和效率。你可以清楚地看到这个建筑正在为你带来什么资源。',
                target: '#current-effect-section',
                position: 'left',
                highlight: true,
                nextButton: '明白了'
            },
            {
                id: 'building_upgrade_preview',
                title: '🔮 升级预览',
                content: '这里显示建筑升级到下一级后的提升情况。你可以看到升级所需的资源以及升级后的效果增强。',
                target: '#detail-next-upgrade',
                position: 'left',
                highlight: true,
                nextButton: '继续'
            },
            {
                id: 'building_upgrade_button',
                title: '⬆️ 升级建筑',
                content: '点击升级按钮可以提升建筑等级。记得确保你有足够的资源哦！升级后建筑的产出会大幅增加。',
                target: '#btn-upgrade-building',
                position: 'left',
                highlight: true,
                nextButton: '明白了'
            },
            {
                id: 'animal_dispatch',
                title: '👷 动物派遣',
                content: '最后是动物派遣功能。某些高级建筑（如宝石矿、训练场）需要派遣动物工作才能产出资源。你可以在建筑详情中分配动物到这些建筑工作。',
                target: '#worker-slot',
                position: 'left',
                highlight: true,
                nextButton: '明白了'
            },
            {
                id: 'close_building_details',
                title: '关闭详情',
                content: '了解完建筑详情后，你可以点击右上角的 × 按钮或点击空白处关闭详情面板。现在请关闭这个面板。',
                target: '#btn-close-details',
                position: 'right',
                highlight: true,
                nextButton: null,
                waitForAction: 'buildingDetailsClosed'
            },
            {
                id: 'upgrade_den',
                title: '🏡 升级繁殖窝',
                content: '随着游戏进行，你需要更多的动物容量。点击这个按钮可以升级繁殖窝，增加动物上限。',
                target: '#btn-upgrade-den',
                position: 'top',
                highlight: true,
                nextButton: '明白了'
            },
            {
                id: 'tutorial_complete',
                title: '🎉 基建教程完成！',
                content: '恭喜你完成了基建系统教程！你已经学会了建造和管理建筑的基本方法。\n\n接下来，点击"🐾 动物系统"按钮进入动物管理中心，那里有专门的动物培养教程等待你。\n\n你可以随时在这个主界面管理建筑、查看资源，祝你玩得开心！',
                target: null,
                position: 'center',
                nextButton: '开始游戏'
            }
        ];
        
        this.init();
    }
    
    /**
     * 初始化引导系统
     */
    init() {
        // 检查是否已完成教程
        const tutorialCompleted = localStorage.getItem('tutorialCompleted');
        if (tutorialCompleted === 'true') {
            this.completed = true;
            return;
        }
        
        // 创建遮罩层
        this.createOverlay();
        
        // 创建提示框
        this.createTooltip();
        
        // 创建高亮框
        this.createHighlight();
    }
    
    /**
     * 创建遮罩层（使用SVG镂空效果）
     */
    createOverlay() {
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'tutorial-overlay';
        this.overlayElement.innerHTML = `
            <svg style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                <defs>
                    <mask id="tutorial-spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                        <rect id="tutorial-spotlight-cutout" x="0" y="0" width="0" height="0" fill="black" rx="8"/>
                    </mask>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.7)" mask="url(#tutorial-spotlight-mask)"/>
            </svg>
        `;
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.overlayElement);
    }
    
    /**
     * 创建提示框
     */
    createTooltip() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'tutorial-tooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, #1e3a8a 0%, #4c1d95 100%);
            border: 2px solid #fbbf24;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            z-index: 200;
            display: none;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            pointer-events: auto;
        `;
        
        this.tooltipElement.innerHTML = `
            <div class="tutorial-content">
                <h3 id="tutorial-title" style="color: #fbbf24; font-size: 20px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"></h3>
                <p id="tutorial-content" style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin-bottom: 20px;"></p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div id="tutorial-progress" style="color: #9ca3af; font-size: 14px;"></div>
                    <div style="display: flex; gap: 8px;">
                        <button id="tutorial-skip" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: background 0.2s;">跳过教程</button>
                        <button id="tutorial-next" style="background: #fbbf24; color: #1e3a8a; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: background 0.2s;">下一步</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.tooltipElement);
        
        // 绑定按钮事件
        document.getElementById('tutorial-next').addEventListener('click', () => this.nextStep());
        document.getElementById('tutorial-skip').addEventListener('click', () => this.skipTutorial());
        
        // 添加悬停效果
        const nextBtn = document.getElementById('tutorial-next');
        const skipBtn = document.getElementById('tutorial-skip');
        
        nextBtn.addEventListener('mouseenter', () => {
            nextBtn.style.background = '#f59e0b';
        });
        nextBtn.addEventListener('mouseleave', () => {
            nextBtn.style.background = '#fbbf24';
        });
        
        skipBtn.addEventListener('mouseenter', () => {
            skipBtn.style.background = '#4b5563';
        });
        skipBtn.addEventListener('mouseleave', () => {
            skipBtn.style.background = '#6b7280';
        });
    }
    
    /**
     * 创建高亮框
     */
    createHighlight() {
        this.highlightElement = document.createElement('div');
        this.highlightElement.id = 'tutorial-highlight';
        this.highlightElement.style.cssText = `
            position: fixed;
            border: 3px solid #fbbf24;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.6), inset 0 0 20px rgba(251, 191, 36, 0.2);
            pointer-events: none;
            z-index: 150;
            display: none;
            animation: pulse 2s ease-in-out infinite;
        `;
        
        // 添加脉冲动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { 
                    box-shadow: 0 0 20px rgba(251, 191, 36, 0.6), inset 0 0 20px rgba(251, 191, 36, 0.2);
                }
                50% { 
                    box-shadow: 0 0 40px rgba(251, 191, 36, 0.8), inset 0 0 30px rgba(251, 191, 36, 0.3);
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.highlightElement);
    }
    
    /**
     * 开始引导
     */
    start() {
        if (this.completed) {
            return;
        }
        
        // 确保UI已初始化
        if (!this.overlayElement || !this.tooltipElement || !this.highlightElement) {
            console.log('重新初始化教程UI...');
            this.createOverlay();
            this.createTooltip();
            this.createHighlight();
        }
        
        this.isActive = true;
        this.currentStep = 0;
        this.showStep(0);
    }
    
    /**
     * 监听游戏事件以自动推进教程
     */
    startEventListeners() {
        // 监听建筑菜单打开事件
        const buildBtn = document.getElementById('btn-open-build');
        if (buildBtn && this.steps[this.currentStep]?.waitForClick) {
            const clickHandler = () => {
                buildBtn.removeEventListener('click', clickHandler);
                setTimeout(() => this.nextStep(), 300); // 延迟执行，等待UI显示
            };
            buildBtn.addEventListener('click', clickHandler);
        }
        
        // 监听基础建筑菜单打开
        const materialsBtn = document.querySelector('[data-category="materials"]');
        if (materialsBtn && this.steps[this.currentStep]?.waitForAction === 'openBasicBuildings') {
            const clickHandler = () => {
                materialsBtn.removeEventListener('click', clickHandler);
                setTimeout(() => this.nextStep(), 300);
            };
            materialsBtn.addEventListener('click', clickHandler);
        }
    }
    
    /**
     * 显示指定步骤
     */
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        
        // 确保UI元素已创建
        if (!this.overlayElement || !this.tooltipElement || !this.highlightElement) {
            console.error('教程UI未正确初始化');
            return;
        }
        
        // 显示/隐藏遮罩和提示框（提前显示，确保元素存在）
        this.overlayElement.style.display = 'block';
        this.tooltipElement.style.display = 'block';
        
        // 安全更新提示框内容
        const titleElement = document.getElementById('tutorial-title');
        const contentElement = document.getElementById('tutorial-content');
        const progressElement = document.getElementById('tutorial-progress');
        const nextBtnElement = document.getElementById('tutorial-next');
        
        if (!titleElement || !contentElement || !progressElement || !nextBtnElement) {
            console.error('教程UI元素未找到:', {
                title: !!titleElement,
                content: !!contentElement,
                progress: !!progressElement,
                next: !!nextBtnElement
            });
            return;
        }
        
        titleElement.textContent = step.title;
        contentElement.textContent = step.content;
        progressElement.textContent = `${stepIndex + 1} / ${this.steps.length}`;
        
        // 如果 nextButton 为 null，隐藏按钮（等待玩家操作）
        if (step.nextButton === null) {
            nextBtnElement.style.display = 'none';
        } else {
            nextBtnElement.style.display = 'inline-block';
            nextBtnElement.textContent = step.nextButton || '下一步';
        }
        
        // 高亮目标元素（支持动态目标）
        let targetSelector = step.target;
        
        // 处理动态目标
        if (step.targetDynamic === 'lastPlacedBuilding' && window.lastPlacedBuildingSelector) {
            targetSelector = window.lastPlacedBuildingSelector;
        }
        
        if (targetSelector && step.highlight !== false) {
            this.highlightTarget(targetSelector);
        } else {
            this.highlightElement.style.display = 'none';
            // 重置镂空区域
            const cutout = document.getElementById('tutorial-spotlight-cutout');
            if (cutout) {
                cutout.setAttribute('width', '0');
                cutout.setAttribute('height', '0');
            }
        }
        
        // 定位提示框
        this.positionTooltip(step);
        
        // 启动事件监听器（用于自动推进）
        this.startEventListeners();
        
        // 执行步骤动作
        if (step.action) {
            this.executeAction(step.action);
        }
    }
    
    /**
     * 高亮目标元素（使用镂空遮罩）
     */
    highlightTarget(selector) {
        const targetElement = document.querySelector(selector);
        if (!targetElement) {
            this.highlightElement.style.display = 'none';
            // 重置镂空区域
            const cutout = document.getElementById('tutorial-spotlight-cutout');
            if (cutout) {
                cutout.setAttribute('width', '0');
                cutout.setAttribute('height', '0');
            }
            return;
        }
        
        const rect = targetElement.getBoundingClientRect();
        const padding = 8; // 镂空区域的内边距
        
        // 更新镂空区域
        const cutout = document.getElementById('tutorial-spotlight-cutout');
        if (cutout) {
            cutout.setAttribute('x', `${rect.left - padding}`);
            cutout.setAttribute('y', `${rect.top - padding}`);
            cutout.setAttribute('width', `${rect.width + padding * 2}`);
            cutout.setAttribute('height', `${rect.height + padding * 2}`);
        }
        
        // 更新高亮边框位置
        this.highlightElement.style.display = 'block';
        this.highlightElement.style.top = `${rect.top - 4}px`;
        this.highlightElement.style.left = `${rect.left - 4}px`;
        this.highlightElement.style.width = `${rect.width + 8}px`;
        this.highlightElement.style.height = `${rect.height + 8}px`;
        
        // 使目标元素可交互且保持在最上层（不修改父元素）
        if (targetElement) {
            // 保存原始样式
            if (!targetElement.dataset.tutorialOriginalZIndex) {
                targetElement.dataset.tutorialOriginalZIndex = targetElement.style.zIndex || '';
            }
            targetElement.style.zIndex = '300'; // 比遮罩层和高亮框都高
            targetElement.style.pointerEvents = 'auto';
        }
    }
    
    /**
     * 定位提示框
     */
    positionTooltip(step) {
        // 延迟一帧，确保 DOM 已渲染，获取准确的尺寸
        requestAnimationFrame(() => {
            // 处理动态目标
            let targetSelector = step.target;
            if (step.targetDynamic === 'lastPlacedBuilding' && window.lastPlacedBuildingSelector) {
                targetSelector = window.lastPlacedBuildingSelector;
            }
            
            if (!targetSelector || step.position === 'center') {
                // 居中显示
                const tooltipWidth = this.tooltipElement.offsetWidth || 400;
                const tooltipHeight = this.tooltipElement.offsetHeight || 200;
                this.tooltipElement.style.top = `${(window.innerHeight - tooltipHeight) / 2}px`;
                this.tooltipElement.style.left = `${(window.innerWidth - tooltipWidth) / 2}px`;
                this.tooltipElement.style.transform = '';
                return;
            }
            
            const targetElement = document.querySelector(targetSelector);
            if (!targetElement) {
                // 居中显示（找不到目标元素）
                const tooltipWidth = this.tooltipElement.offsetWidth || 400;
                const tooltipHeight = this.tooltipElement.offsetHeight || 200;
                this.tooltipElement.style.top = `${(window.innerHeight - tooltipHeight) / 2}px`;
                this.tooltipElement.style.left = `${(window.innerWidth - tooltipWidth) / 2}px`;
                this.tooltipElement.style.transform = '';
                return;
            }
            
            const rect = targetElement.getBoundingClientRect();
            const tooltipWidth = this.tooltipElement.offsetWidth || 400;
            const tooltipHeight = this.tooltipElement.offsetHeight || 200;
            
            let top, left;
            let preferredPosition = step.position;
            
            // 智能定位：如果首选位置会导致遮挡，自动选择更好的位置
            if (preferredPosition === 'bottom' && rect.bottom + tooltipHeight + 40 > window.innerHeight) {
                // 底部空间不足，改为顶部
                preferredPosition = 'top';
            } else if (preferredPosition === 'top' && rect.top - tooltipHeight - 20 < 0) {
                // 顶部空间不足，改为底部或右侧
                preferredPosition = rect.right + tooltipWidth + 40 < window.innerWidth ? 'right' : 'bottom';
            }
            
            switch (preferredPosition) {
                case 'top':
                    top = rect.top - tooltipHeight - 20;
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    // 如果顶部空间仍不足，强制在元素上方但不超出
                    if (top < 20) {
                        top = 20;
                    }
                    break;
                case 'bottom':
                    top = rect.bottom + 20;
                    left = rect.left + rect.width / 2 - tooltipWidth / 2;
                    // 如果底部空间不足，向上移动
                    if (top + tooltipHeight > window.innerHeight - 20) {
                        top = window.innerHeight - tooltipHeight - 20;
                    }
                    break;
                case 'left':
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    left = rect.left - tooltipWidth - 20;
                    // 如果左侧空间不足，改为右侧
                    if (left < 20) {
                        left = rect.right + 20;
                    }
                    break;
                case 'right':
                    top = rect.top + rect.height / 2 - tooltipHeight / 2;
                    left = rect.right + 20;
                    // 如果右侧空间不足，改为左侧
                    if (left + tooltipWidth > window.innerWidth - 20) {
                        left = rect.left - tooltipWidth - 20;
                    }
                    break;
                default:
                    top = (window.innerHeight - tooltipHeight) / 2;
                    left = (window.innerWidth - tooltipWidth) / 2;
            }
            
            // 最终边界检查，确保提示框在视窗内
            top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));
            left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));
            
            this.tooltipElement.style.top = `${top}px`;
            this.tooltipElement.style.left = `${left}px`;
            this.tooltipElement.style.transform = '';
        });
    }
    
    /**
     * 执行步骤动作（预留接口）
     */
    executeAction(action) {
        // 移除自动触发逻辑，让玩家自主探索
        // 教程只负责介绍，不强制操作
    }
    
    /**
     * 下一步
     */
    nextStep() {
        const step = this.steps[this.currentStep];
        
        // 恢复当前步骤目标元素的原始样式（支持动态目标）
        let targetSelector = step.target;
        
        // 处理动态目标
        if (step.targetDynamic === 'lastPlacedBuilding' && window.lastPlacedBuildingSelector) {
            targetSelector = window.lastPlacedBuildingSelector;
        }
        
        if (targetSelector) {
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
                // 恢复原始 z-index
                const originalZIndex = targetElement.dataset.tutorialOriginalZIndex;
                if (originalZIndex !== undefined) {
                    targetElement.style.zIndex = originalZIndex;
                    delete targetElement.dataset.tutorialOriginalZIndex;
                } else {
                    targetElement.style.zIndex = '';
                }
                targetElement.style.pointerEvents = '';
            }
        }
        
        this.showStep(this.currentStep + 1);
    }
    
    /**
     * 跳过教程
     */
    skipTutorial() {
        if (confirm('确定要跳过新手教程吗？你可以随时在设置中重新开启。')) {
            this.complete();
        }
    }
    
    /**
     * 完成教程
     */
    complete() {
        this.isActive = false;
        this.completed = true;
        
        // 隐藏所有UI元素
        this.overlayElement.style.display = 'none';
        this.tooltipElement.style.display = 'none';
        this.highlightElement.style.display = 'none';
        
        // 恢复所有目标元素的原始样式
        this.steps.forEach(step => {
            if (step.target) {
                const targetElement = document.querySelector(step.target);
                if (targetElement) {
                    // 恢复原始 z-index
                    const originalZIndex = targetElement.dataset.tutorialOriginalZIndex;
                    if (originalZIndex !== undefined) {
                        targetElement.style.zIndex = originalZIndex;
                        delete targetElement.dataset.tutorialOriginalZIndex;
                    } else {
                        targetElement.style.zIndex = '';
                    }
                    targetElement.style.pointerEvents = '';
                }
            }
        });
        
        // 保存完成状态
        localStorage.setItem('tutorialCompleted', 'true');
        
        // 触发完成事件
        window.dispatchEvent(new CustomEvent('tutorialComplete'));
    }
    
    /**
     * 重置教程
     */
    reset() {
        localStorage.removeItem('tutorialCompleted');
        this.completed = false;
        this.currentStep = 0;
    }
    
    /**
     * 检查是否应该显示教程
     */
    shouldShow() {
        return !this.completed && !this.isActive;
    }
    
    /**
     * 暂停教程（临时隐藏UI，不改变进度）
     */
    pause() {
        if (!this.isActive || this.isPaused) return;
        
        this.isPaused = true;
        if (this.overlayElement) this.overlayElement.style.display = 'none';
        if (this.tooltipElement) this.tooltipElement.style.display = 'none';
        if (this.highlightElement) this.highlightElement.style.display = 'none';
        
        console.log('教程已暂停');
    }
    
    /**
     * 恢复教程
     */
    resume() {
        if (!this.isActive || !this.isPaused) return;
        
        this.isPaused = false;
        this.showStep(this.currentStep); // 重新显示当前步骤
        
        console.log('教程已恢复');
    }
}

// 导出为全局变量
window.TutorialSystem = TutorialSystem;
