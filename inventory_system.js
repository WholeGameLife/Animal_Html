// inventory_system.js - 背包和出战队伍管理系统

// 全局变量
let currentEditingSlot = null;
let currentViewingTeamAnimal = null;
let currentEditingSkillSlot = null;
let currentEditingSkillAnimal = null;

// 全局函数：获取完整的战斗技能库
function getBattleSkills() {
    // 从localStorage加载技能池（SKILL_POOL）
    const skillPoolJSON = localStorage.getItem('SKILL_POOL');
    const skillPool = skillPoolJSON ? JSON.parse(skillPoolJSON) : [];
    
    // 将技能数组转换为以key为键的对象
    const customSkills = {};
    skillPool.forEach(skill => {
        customSkills[skill.key] = {
            name: skill.name,
            icon: skill.icon,
            desc: skill.description || '自定义技能',
            type: skill.type,
            category: skill.category,
            effects: skill.effects,
            params: skill.params
        };
    });
    
    // 返回合并后的技能库
    return {
        'POWER_STRIKE': { name: '力量打击', icon: '💥', desc: '造成150%伤害', type: 'attack' },
        'SHIELD_BASH': { name: '盾击', icon: '🛡️', desc: '造成伤害并降低敌人防御', type: 'attack' },
        'QUICK_SLASH': { name: '快速斩击', icon: '⚡', desc: '快速攻击2次', type: 'attack' },
        'BERSERKER': { name: '狂战士', icon: '😡', desc: '提升攻击力25%，持续3回合', type: 'buff' },
        'IRON_WALL': { name: '铁壁', icon: '🏰', desc: '提升防御力50%，持续2回合', type: 'buff' },
        'DODGE': { name: '闪避', icon: '💨', desc: '本回合闪避攻击', type: 'buff' },
        'CRITICAL_HIT': { name: '致命一击', icon: '💢', desc: '有30%几率造成200%伤害', type: 'passive' },
        'LIFE_STEAL': { name: '生命汲取', icon: '🩸', desc: '攻击时恢复造成伤害的30%', type: 'passive' },
        'COUNTER': { name: '反击', icon: '↩️', desc: '受到攻击时反弹30%伤害', type: 'passive' },
        'SPEED_BOOST': { name: '速度提升', icon: '🏃', desc: '永久提升10%敏捷', type: 'passive' },
        ...customSkills
    };
}

// 打开背包面板
function openInventoryPanel() {
    closeAllDetailPanels();
    renderBattleTeamSlots();
    // 默认隐藏详情，显示提示
    if (ui.inventoryAnimalDetail) ui.inventoryAnimalDetail.classList.add('hidden');
    if (ui.inventoryDetailEmpty) ui.inventoryDetailEmpty.classList.remove('hidden');
    ui.modalOverlay.classList.remove('hidden');
    ui.inventoryPanel.classList.remove('hidden');
}

// 关闭背包面板
function closeInventoryPanel() {
    ui.inventoryPanel.classList.add('hidden');
    // 检查是否所有需要遮罩的面板都已隐藏
    const teamSelectorHidden = !ui.teamSelectorPanel || ui.teamSelectorPanel.classList.contains('hidden');
    const skillSelectorHidden = !ui.skillSelectorPanel || ui.skillSelectorPanel.classList.contains('hidden');
    const battleSetupHidden = !ui.battleSetupPanel || ui.battleSetupPanel.classList.contains('hidden');
    const itemTargetHidden = !ui.itemTargetSelector || ui.itemTargetSelector.classList.contains('hidden');
    
    if (teamSelectorHidden && skillSelectorHidden && battleSetupHidden && itemTargetHidden) {
        ui.modalOverlay.classList.add('hidden');
    }
}

// 渲染出战队伍槽位
function renderBattleTeamSlots() {
    if (!gameState.battleTeam) {
        gameState.battleTeam = [null, null, null, null, null, null];
    }
    
    if (!ui.battleTeamSlots) return;
    ui.battleTeamSlots.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const animalId = gameState.battleTeam[i];
        const animal = animalId ? gameState.animals.find(a => a.id === animalId) : null;
        
        const slotDiv = document.createElement('div');
        slotDiv.className = 'bg-gray-800/80 p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-purple-400';
        
        if (animal) {
            const colorHex = '#' + animal.color.toString(16).padStart(6, '0');
            const isFirst = (gameState.firstTeamMember === animalId);
            slotDiv.className += isFirst ? ' border-yellow-500/80 bg-yellow-900/20' : ' border-purple-500/50';
            
            slotDiv.innerHTML = `
                <div class="flex items-center space-x-2 mb-1">
                    <div style="background-color: ${colorHex};" class="w-10 h-10 rounded-full border-2 border-white/30"></div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-xs text-white truncate flex items-center gap-1">
                            ${isFirst ? '<span class="text-yellow-400">⭐</span>' : ''}${animal.name}
                        </div>
                        <div class="text-xs text-yellow-400">Lv.${animal.level} ⚡${Math.floor(animal.stamina)}/${animal.maxStamina}</div>
                    </div>
                </div>
                <button class="w-full text-xs text-purple-400 hover:text-purple-300 font-bold py-0.5 bg-purple-900/30 rounded" onclick="event.stopPropagation(); openTeamSlotSelector(${i})">更换</button>
            `;
            slotDiv.onclick = () => showAnimalDetailInInventory(animalId);
        } else {
            slotDiv.className += ' border-gray-600 border-dashed';
            slotDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4 text-gray-500">
                    <div class="text-2xl mb-1">+</div>
                    <div class="text-xs">槽位 ${i + 1}</div>
                </div>
            `;
            slotDiv.onclick = () => openTeamSlotSelector(i);
        }
        
        ui.battleTeamSlots.appendChild(slotDiv);
    }
}

// 显示动物详情
function showAnimalDetailInInventory(animalId) {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal) return;
    
    currentViewingTeamAnimal = animalId;
    
    // 隐藏空状态，显示详情
    if (ui.inventoryDetailEmpty) ui.inventoryDetailEmpty.classList.add('hidden');
    if (ui.inventoryAnimalDetail) ui.inventoryAnimalDetail.classList.remove('hidden');
    
    const colorHex = '#' + animal.color.toString(16).padStart(6, '0');
    if (ui.invDetailAvatar) ui.invDetailAvatar.style.backgroundColor = colorHex;
    if (ui.invDetailName) ui.invDetailName.textContent = animal.name;
    if (ui.invDetailLevel) ui.invDetailLevel.textContent = `Lv. ${animal.level}`;
    if (ui.invDetailGender) {
        ui.invDetailGender.textContent = animal.gender;
        ui.invDetailGender.className = animal.gender === '雄' ? 'bg-blue-500 px-2 py-0.5 rounded' : 'bg-pink-500 px-2 py-0.5 rounded';
    }
    
    const expPercent = (animal.experience / animal.experienceToNextLevel) * 100;
    if (ui.invDetailExpText) ui.invDetailExpText.textContent = `${Math.floor(animal.experience)} / ${animal.experienceToNextLevel}`;
    if (ui.invDetailExpBar) ui.invDetailExpBar.style.width = `${expPercent}%`;
    
    if (ui.invDetailStamina) ui.invDetailStamina.textContent = `${Math.floor(animal.stamina)} / ${animal.maxStamina}`;
    if (ui.invDetailPotential) ui.invDetailPotential.textContent = animal.potential;
    if (ui.invDetailElement) ui.invDetailElement.textContent = animal.element;
    if (ui.invDetailAttack) ui.invDetailAttack.textContent = animal.abilities.combat.attack;
    if (ui.invDetailDefense) ui.invDetailDefense.textContent = animal.abilities.combat.defense;
    if (ui.invDetailAgility) ui.invDetailAgility.textContent = animal.abilities.combat.agility;
    
    // 显示稀有度
    const rarityEl = document.getElementById('inv-detail-rarity');
    if (rarityEl && animal.rarity && animal.rarity !== 'common') {
        const rarityColors = {
            'shiny': 'bg-yellow-600/50 text-yellow-200',
            'iridescent': 'bg-purple-600/50 text-purple-200',
            'stellar': 'bg-blue-600/50 text-blue-200'
        };
        const rarityNames = {
            'shiny': '✨ 闪光',
            'iridescent': '🌈 幻彩',
            'stellar': '⭐ 星芒'
        };
        rarityEl.className = `px-3 py-1 rounded-full text-sm font-bold ${rarityColors[animal.rarity] || 'bg-gray-600/50 text-gray-200'}`;
        rarityEl.textContent = rarityNames[animal.rarity] || animal.rarity;
        rarityEl.classList.remove('hidden');
    } else if (rarityEl) {
        rarityEl.classList.add('hidden');
    }
    
    // 显示变异类型
    const mutationEl = document.getElementById('inv-detail-mutation');
    if (mutationEl && animal.mutations) {
        const mutations = [];
        if (animal.mutations.tier1) mutations.push(animal.mutations.tier1);
        if (animal.mutations.tier2) mutations.push(animal.mutations.tier2);
        
        if (mutations.length > 0) {
            mutationEl.className = 'bg-pink-600/50 text-pink-200 px-3 py-1 rounded-full text-sm font-bold';
            mutationEl.textContent = `🧬 ${mutations.join('+')}`;
            mutationEl.classList.remove('hidden');
        } else {
            mutationEl.classList.add('hidden');
        }
    } else if (mutationEl) {
        mutationEl.classList.add('hidden');
    }
    
    // 首发按钮
    if (ui.invDetailBtnSetFirst) {
        const isFirstMember = gameState.firstTeamMember === animalId;
        if (isFirstMember) {
            ui.invDetailBtnSetFirst.textContent = '⭐ 当前首发';
            ui.invDetailBtnSetFirst.className = 'w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg cursor-default';
            ui.invDetailBtnSetFirst.disabled = true;
        } else {
            ui.invDetailBtnSetFirst.textContent = '⭐ 设置为首发';
            ui.invDetailBtnSetFirst.className = 'w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors';
            ui.invDetailBtnSetFirst.disabled = false;
            ui.invDetailBtnSetFirst.onclick = () => setFirstTeamMember(animalId);
        }
    }
    
    // 喂养按钮
    const feedCost = animal.level * 10;
    const canFeed = gameState.food >= feedCost;
    if (ui.invDetailBtnFeed) {
        ui.invDetailBtnFeed.disabled = !canFeed;
        ui.invDetailBtnFeed.textContent = canFeed ? `🍎 喂养升级 (消耗 ${feedCost} 食物)` : `食物不足 (需要 ${feedCost})`;
        ui.invDetailBtnFeed.onclick = () => feedTeamAnimal(animalId);
    }
    
    // 设置首发按钮
    if (ui.invDetailBtnSetFirst) {
        const isFirstMember = gameState.firstTeamMember === animalId;
        if (isFirstMember) {
            ui.invDetailBtnSetFirst.textContent = '⭐ 当前首发';
            ui.invDetailBtnSetFirst.className = 'w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg cursor-default';
            ui.invDetailBtnSetFirst.disabled = true;
        } else {
            ui.invDetailBtnSetFirst.textContent = '⭐ 设置为首发';
            ui.invDetailBtnSetFirst.className = 'w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors';
            ui.invDetailBtnSetFirst.disabled = false;
            ui.invDetailBtnSetFirst.onclick = () => setFirstTeamMember(animalId);
        }
    }
    
    // 渲染战斗技能
    renderCombatSkillsInInventory(animal);
    
    // 移除按钮
    if (ui.invDetailBtnRemove) {
        ui.invDetailBtnRemove.onclick = () => removeFromTeam(animalId);
    }
}

// 在背包中渲染战斗技能
function renderCombatSkillsInInventory(animal) {
    if (!ui.invDetailCombatSkills) return;
    ui.invDetailCombatSkills.innerHTML = '';
    
    // 获取完整的技能库
    const BATTLE_SKILLS = getBattleSkills();
    
    // 修复：处理不同的combatSkills数据格式
    if (Array.isArray(animal.combatSkills)) {
        const skillsArray = animal.combatSkills;
        animal.combatSkills = {
            equipped: skillsArray.slice(0, 4),
            available: Object.keys(BATTLE_SKILLS)
        };
    }
    
    // 确保技能数据结构存在
    if (!animal.combatSkills) {
        animal.combatSkills = { equipped: [null, null, null, null], available: Object.keys(BATTLE_SKILLS) };
    }
    if (!animal.combatSkills.equipped || !Array.isArray(animal.combatSkills.equipped)) {
        animal.combatSkills.equipped = [null, null, null, null];
    }
    if (!animal.combatSkills.available) {
        animal.combatSkills.available = Object.keys(BATTLE_SKILLS);
    }
    
    const skills = animal.combatSkills.equipped;
    
    for (let i = 0; i < 4; i++) {
        const skillId = skills[i];
        const slot = document.createElement('div');
        slot.className = 'h-16 bg-gray-800 border-2 border-gray-600 rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer hover:border-purple-400 hover:bg-gray-700 transition-colors relative group';
        
        if (skillId && BATTLE_SKILLS[skillId]) {
            const skill = BATTLE_SKILLS[skillId];
            slot.innerHTML = `
                <div class="text-2xl mb-0.5">${skill.icon}</div>
                <div class="text-xs font-bold text-gray-300">${skill.name}</div>
                <div class="absolute bottom-full mb-2 hidden group-hover:block w-40 bg-black text-white text-xs rounded p-2 z-10 text-center shadow-lg">
                    <div class="font-bold text-yellow-300">${skill.name}</div>
                    <div class="text-gray-300 mt-1">${skill.desc}</div>
                </div>
            `;
        } else if (skillId) {
            slot.innerHTML = `<div class="text-2xl text-orange-400">❓</div><div class="text-xs text-gray-400">未知</div>`;
        } else {
            slot.innerHTML = `<div class="text-2xl text-gray-600">+</div><div class="text-xs text-gray-500">空槽</div>`;
        }
        
        slot.onclick = () => openSkillSelector(animal.id, i);
        ui.invDetailCombatSkills.appendChild(slot);
    }
}

// 打开技能选择面板
function openSkillSelector(animalId, slotIndex) {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal) return;
    
    currentEditingSkillAnimal = animalId;
    currentEditingSkillSlot = slotIndex;
    
    if (ui.currentSkillSlotInfo) {
        ui.currentSkillSlotInfo.textContent = `技能槽位 ${slotIndex + 1}`;
    }
    
    // 获取完整的技能库
    const BATTLE_SKILLS = getBattleSkills();
    
    if (!ui.availableSkillsList) return;
    ui.availableSkillsList.innerHTML = '';
    
    // 处理不同的combatSkills数据格式
    if (Array.isArray(animal.combatSkills)) {
        const skillsArray = animal.combatSkills;
        animal.combatSkills = {
            equipped: skillsArray.slice(0, 4),
            available: Object.keys(BATTLE_SKILLS)
        };
    }
    
    // 确保技能数据结构存在
    if (!animal.combatSkills) {
        animal.combatSkills = { equipped: [null, null, null, null], available: Object.keys(BATTLE_SKILLS) };
    }
    
    if (!animal.combatSkills.equipped || !Array.isArray(animal.combatSkills.equipped)) {
        animal.combatSkills.equipped = [null, null, null, null];
    }
    
    // 获取动物可用技能
    let normalSkills = animal.combatSkills.available || Object.keys(BATTLE_SKILLS);
    
    if (!normalSkills || normalSkills.length === 0) {
        normalSkills = Object.keys(BATTLE_SKILLS);
        animal.combatSkills.available = normalSkills;
    }
    
    // 获取变异技能
    const mutationSkills = animal.mutations?.skills || [];
    
    // 获取其他槽位已装备的技能ID列表（排除当前正在编辑的槽位）
    const equippedSkillIds = animal.combatSkills.equipped
        .filter((id, index) => id !== null && index !== slotIndex);
    
    // 渲染技能的辅助函数
    const renderSkill = (skillId, isMutation = false) => {
        const skill = BATTLE_SKILLS[skillId];
        if (!skill) return null;
        
        // 如果技能已经装备在其他槽位,则不显示
        if (equippedSkillIds.includes(skillId)) return null;
        
        const skillDiv = document.createElement('div');
        skillDiv.className = 'bg-gray-700 p-3 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors border border-gray-600 hover:border-purple-500';
        
        const typeColors = {
            'attack': 'text-red-400',
            'buff': 'text-blue-400',
            'passive': 'text-green-400'
        };
        
        skillDiv.innerHTML = `
            <div class="flex items-center space-x-3 mb-2">
                <div class="text-3xl">${skill.icon}</div>
                <div class="flex-1">
                    <div class="font-bold text-white flex items-center gap-2">
                        ${skill.name}
                        ${isMutation ? '<span class="text-xs bg-pink-600/80 text-pink-100 px-2 py-0.5 rounded-full">🧬变异</span>' : ''}
                    </div>
                    <div class="text-xs ${typeColors[skill.type] || 'text-gray-400'}">${skill.type === 'attack' ? '主动' : skill.type === 'buff' ? '增益' : '被动'}</div>
                </div>
            </div>
            <div class="text-xs text-gray-300">${skill.desc}</div>
        `;
        skillDiv.onclick = () => selectSkillForSlot(skillId);
        return skillDiv;
    };
    
    // 检查是否有可显示的技能
    const hasNormalSkills = normalSkills.some(id => BATTLE_SKILLS[id] && !equippedSkillIds.includes(id));
    const hasMutationSkills = mutationSkills.some(id => BATTLE_SKILLS[id] && !equippedSkillIds.includes(id));
    
    if (!hasNormalSkills && !hasMutationSkills) {
        ui.availableSkillsList.innerHTML = '<p class="col-span-2 text-center text-gray-500 py-4">此动物暂无可用技能</p>';
    } else {
        // 显示变异技能（优先显示）
        if (hasMutationSkills) {
            const mutationHeader = document.createElement('div');
            mutationHeader.className = 'col-span-2 bg-pink-900/30 border border-pink-500/50 rounded-lg p-2 mb-2';
            mutationHeader.innerHTML = '<h3 class="text-pink-300 font-bold text-sm flex items-center gap-2"><span>🧬</span> 变异技能</h3>';
            ui.availableSkillsList.appendChild(mutationHeader);
            
            mutationSkills.forEach(skillId => {
                const skillDiv = renderSkill(skillId, true);
                if (skillDiv) ui.availableSkillsList.appendChild(skillDiv);
            });
        }
        
        // 显示普通技能
        if (hasNormalSkills) {
            const normalHeader = document.createElement('div');
            normalHeader.className = 'col-span-2 bg-purple-900/30 border border-purple-500/50 rounded-lg p-2 mb-2 mt-2';
            normalHeader.innerHTML = '<h3 class="text-purple-300 font-bold text-sm flex items-center gap-2"><span>⚔️</span> 普通技能</h3>';
            ui.availableSkillsList.appendChild(normalHeader);
            
            normalSkills.forEach(skillId => {
                const skillDiv = renderSkill(skillId, false);
                if (skillDiv) ui.availableSkillsList.appendChild(skillDiv);
            });
        }
    }
    
    // 添加清空选项
    if (animal.combatSkills?.equipped && animal.combatSkills.equipped[slotIndex]) {
        const clearDiv = document.createElement('div');
        clearDiv.className = 'col-span-2 flex items-center justify-center p-3 bg-red-900/30 rounded-lg hover:bg-red-900/50 cursor-pointer transition-colors border border-red-500/50 mt-2';
        clearDiv.innerHTML = `<span class="text-red-400 font-bold">❌ 清空此技能槽</span>`;
        clearDiv.onclick = () => {
            if (!animal.combatSkills) animal.combatSkills = { equipped: [null, null, null, null], available: [] };
            animal.combatSkills.equipped[slotIndex] = null;
            closeSkillSelector();
            showAnimalDetailInInventory(animalId);
            showStatus(`技能槽 ${slotIndex + 1} 已清空`, 2000);
        };
        ui.availableSkillsList.appendChild(clearDiv);
    }
    
    if (ui.skillSelectorPanel) {
        ui.skillSelectorPanel.classList.remove('hidden');
    }
}

// 选择技能装备到槽位
function selectSkillForSlot(skillId) {
    if (currentEditingSkillSlot === null || !currentEditingSkillAnimal) return;
    
    const animal = gameState.animals.find(a => a.id === currentEditingSkillAnimal);
    if (!animal) return;
    
    // 确保技能数据结构存在
    if (!animal.combatSkills) {
        animal.combatSkills = { equipped: [null, null, null, null], available: [] };
    }
    if (!animal.combatSkills.equipped) {
        animal.combatSkills.equipped = [null, null, null, null];
    }
    
    // 装备技能
    animal.combatSkills.equipped[currentEditingSkillSlot] = skillId;
    
    // 先刷新UI显示，再关闭面板
    showAnimalDetailInInventory(currentEditingSkillAnimal);
    closeSkillSelector();
    
    // 获取完整的技能库以显示正确的技能名称
    const BATTLE_SKILLS = getBattleSkills();
    const skillName = BATTLE_SKILLS[skillId]?.name || skillId;
    showStatus(`✅ 已装备技能: ${skillName}`, 2000);
}

// 关闭技能选择面板
function closeSkillSelector() {
    if (ui.skillSelectorPanel) ui.skillSelectorPanel.classList.add('hidden');
    currentEditingSkillSlot = null;
    currentEditingSkillAnimal = null;
    // 检查是否所有需要遮罩的面板都已隐藏
    const inventoryHidden = !ui.inventoryPanel || ui.inventoryPanel.classList.contains('hidden');
    const teamSelectorHidden = !ui.teamSelectorPanel || ui.teamSelectorPanel.classList.contains('hidden');
    const battleSetupHidden = !ui.battleSetupPanel || ui.battleSetupPanel.classList.contains('hidden');
    const itemTargetHidden = !ui.itemTargetSelector || ui.itemTargetSelector.classList.contains('hidden');
    
    if (inventoryHidden && teamSelectorHidden && battleSetupHidden && itemTargetHidden) {
        ui.modalOverlay.classList.add('hidden');
    }
}

// 打开队伍槽位选择器
window.openTeamSlotSelector = function(slotIndex) {
    currentEditingSlot = slotIndex;
    if (ui.currentSlotInfo) ui.currentSlotInfo.textContent = `槽位 ${slotIndex + 1}`;
    
    // 渲染可选动物列表
    if (!ui.teamAnimalList) return;
    ui.teamAnimalList.innerHTML = '';
    const currentTeamIds = gameState.battleTeam.filter(id => id !== null);
    const availableAnimals = gameState.animals.filter(a =>
        !currentTeamIds.includes(a.id) &&
        !a.isPlaced &&
        !a.workingBuildingId &&
        !a.exploringMissionId &&
        !gameState.mining.currentRun.team.includes(a.id)
    );
    
    if (availableAnimals.length === 0) {
        ui.teamAnimalList.innerHTML = '<p class="text-center text-gray-500 py-4">没有可用的动物</p>';
    } else {
        availableAnimals.forEach(animal => {
            const colorHex = '#' + animal.color.toString(16).padStart(6, '0');
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors';
            div.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div style="background-color: ${colorHex};" class="w-12 h-12 rounded-full border-2 border-white/30"></div>
                    <div>
                        <div class="font-bold text-white">${animal.name}</div>
                        <div class="text-xs text-gray-400">Lv.${animal.level} | ${animal.potential} | ${animal.element}</div>
                        <div class="text-xs text-green-400">⚡${Math.floor(animal.stamina)}/${animal.maxStamina}</div>
                    </div>
                </div>
                <button class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm">选择</button>
            `;
            div.onclick = () => selectAnimalForTeam(animal.id);
            ui.teamAnimalList.appendChild(div);
        });
    }
    
    // 添加清空选项
    if (gameState.battleTeam[slotIndex]) {
        const clearDiv = document.createElement('div');
        clearDiv.className = 'flex items-center justify-center p-3 bg-red-900/30 rounded-lg hover:bg-red-900/50 cursor-pointer transition-colors border border-red-500/50 mt-2';
        clearDiv.innerHTML = `<span class="text-red-400 font-bold">❌ 清空此槽位</span>`;
        clearDiv.onclick = () => {
            gameState.battleTeam[slotIndex] = null;
            // 如果清空的是首发，同时清除首发设置
            if (gameState.firstTeamMember && gameState.battleTeam.indexOf(gameState.firstTeamMember) === -1) {
                gameState.firstTeamMember = null;
            }
            closeTeamSelector();
            renderBattleTeamSlots();
            if (currentViewingTeamAnimal && gameState.battleTeam.indexOf(currentViewingTeamAnimal) === -1) {
                if (ui.inventoryAnimalDetail) ui.inventoryAnimalDetail.classList.add('hidden');
                if (ui.inventoryDetailEmpty) ui.inventoryDetailEmpty.classList.remove('hidden');
            }
            showStatus(`槽位 ${slotIndex + 1} 已清空`, 2000);
        };
        ui.teamAnimalList.appendChild(clearDiv);
    }
    
    if (ui.teamSelectorPanel) ui.teamSelectorPanel.classList.remove('hidden');
};

// 选择动物加入队伍
function selectAnimalForTeam(animalId) {
    if (currentEditingSlot === null) return;
    
    gameState.battleTeam[currentEditingSlot] = animalId;
    closeTeamSelector();
    renderBattleTeamSlots();
    showAnimalDetailInInventory(animalId);
    
    const animal = gameState.animals.find(a => a.id === animalId);
    showStatus(`✅ ${animal.name} 已加入队伍槽位 ${currentEditingSlot + 1}`, 2000);
}

// 关闭队伍选择器
function closeTeamSelector() {
    if (ui.teamSelectorPanel) ui.teamSelectorPanel.classList.add('hidden');
    currentEditingSlot = null;
    // 检查是否所有需要遮罩的面板都已隐藏
    const inventoryHidden = !ui.inventoryPanel || ui.inventoryPanel.classList.contains('hidden');
    const skillSelectorHidden = !ui.skillSelectorPanel || ui.skillSelectorPanel.classList.contains('hidden');
    const battleSetupHidden = !ui.battleSetupPanel || ui.battleSetupPanel.classList.contains('hidden');
    const itemTargetHidden = !ui.itemTargetSelector || ui.itemTargetSelector.classList.contains('hidden');
    
    if (inventoryHidden && skillSelectorHidden && battleSetupHidden && itemTargetHidden) {
        ui.modalOverlay.classList.add('hidden');
    }
}

// 喂养队伍中的动物
function feedTeamAnimal(animalId) {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal) return;
    
    const feedCost = animal.level * 10;
    if (gameState.food < feedCost) {
        showStatus('❌ 食物不足！', 2000);
        return;
    }
    
    gameState.food -= feedCost;
    animal.experience += LEVEL_CONFIG.feedAmount;
    
    // 检查升级
    while (animal.experience >= animal.experienceToNextLevel) {
        animal.experience -= animal.experienceToNextLevel;
        animal.level++;
        animal.experienceToNextLevel = Math.floor(LEVEL_CONFIG.baseExperience * Math.pow(LEVEL_CONFIG.experienceMultiplier, animal.level - 1));
        
        // 提升属性
        const multiplier = LEVEL_CONFIG.potentialMultipliers[animal.potential];
        animal.abilities.combat.attack += Math.floor(LEVEL_CONFIG.baseGrowth.attack * multiplier.combat);
        animal.abilities.combat.defense += Math.floor(LEVEL_CONFIG.baseGrowth.defense * multiplier.combat);
        animal.abilities.combat.agility += Math.floor(LEVEL_CONFIG.baseGrowth.agility * multiplier.combat);
        animal.maxStamina += Math.floor(LEVEL_CONFIG.baseGrowth.stamina * multiplier.stamina);
        
        showStatus(`⬆️ ${animal.name} 升级至 Lv.${animal.level}！`, 3000);
    }
    
    updateUI();
    showAnimalDetailInInventory(animalId);
    renderBattleTeamSlots();
}

// 设置首发动物
function setFirstTeamMember(animalId) {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal) return;
    
    // 验证动物在出战队伍中
    const currentIndex = gameState.battleTeam.indexOf(animalId);
    if (currentIndex === -1) {
        showStatus('❌ 只能将出战队伍中的动物设置为首发！', 2000);
        return;
    }
    
    // 如果已经在第一个位置，直接设置为首发
    if (currentIndex === 0) {
        gameState.firstTeamMember = animalId;
        showStatus(`⭐ ${animal.name} 已设置为首发！`, 2000);
        showAnimalDetailInInventory(animalId);
        return;
    }
    
    // 将动物移动到第一个槽位
    const firstSlotAnimal = gameState.battleTeam[0];
    
    // 交换位置
    gameState.battleTeam[currentIndex] = firstSlotAnimal;
    gameState.battleTeam[0] = animalId;
    
    // 设置为首发
    gameState.firstTeamMember = animalId;
    
    showStatus(`⭐ ${animal.name} 已移至首发位置（槽位1）！`, 3000);
    
    // 刷新UI
    renderBattleTeamSlots();
    showAnimalDetailInInventory(animalId);
}

// 从队伍移除动物
function removeFromTeam(animalId) {
    const slotIndex = gameState.battleTeam.indexOf(animalId);
    if (slotIndex === -1) return;
    
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!confirm(`确定将 ${animal.name} 从队伍中移除吗？`)) return;
    
    gameState.battleTeam[slotIndex] = null;
    
    // 如果移除的是首发动物，清除首发设置
    if (gameState.firstTeamMember === animalId) {
        gameState.firstTeamMember = null;
        showStatus('⚠️ 首发动物已被移除，请重新设置首发', 2000);
    }
    
    renderBattleTeamSlots();
    // 隐藏详情，显示空状态
    if (ui.inventoryAnimalDetail) ui.inventoryAnimalDetail.classList.add('hidden');
    if (ui.inventoryDetailEmpty) ui.inventoryDetailEmpty.classList.remove('hidden');
    currentViewingTeamAnimal = null;
    showStatus(`${animal.name} 已从队伍移除`, 2000);
}