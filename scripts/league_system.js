/**
 * 联赛系统 - 埃罗西卡大陆联赛管理系统
 * 包含六大地区（伊缇、异提、拜尼、罗娜、罗兰、巴卡）的联赛管理
 * 每个地区设有夏季联赛和冬季联赛
 * 大陆设有世界赛、联合赛、联协赛
 * 使用 IndexedDB 存储数据以避免 localStorage 配额限制
 */

class LeagueSystem {
    // 数据库配置
    static DB_NAME = 'LeagueSystemDB';
    static DB_VERSION = 2;
    static STORE_NAME = 'leagueData';

    constructor() {
        // 六大地区（埃罗西卡大陆）
        this.regions = ['伊缇', '异提', '拜尼', '罗娜', '罗兰', '巴卡'];
        
        // 训练师数据库
        this.trainersData = null;
        
        // 训练师状态跟踪（记录每个训练师当前所在的联赛）
        this.trainersState = {};
        
        // 联赛等级配置
        this.leagueConfig = {
            '夏季联赛': {
                teams: 20,
                rounds: 38,
                pointsForWin: 2,
                pointsForLoss: 0,
                registrationCount: 25,       // 赛季开始前登记25个动物
                swapEveryNRounds: 3,          // 每3轮可轮换
                swapCount: 2,                 // 每次轮换2个
                midSeasonSwapAfterRound: 19,  // 第19轮后
                midSeasonSwapCount: 12,       // 可轮换12个
                animalType: 'normal'          // 普通动物
            },
            '冬季联赛': {
                teams: 20,
                rounds: 38,
                pointsForWin: 2,
                pointsForLoss: 0,
                registrationCount: 25,        // 赛季开始前登记25个未养成动物
                swapEveryNRounds: 3,
                swapCount: 2,
                midSeasonSwapAfterRound: 19,
                midSeasonSwapCount: 12,
                animalType: 'undeveloped'     // 未养成动物
            }
        };
        
        // 大陆赛事配置
        this.tournamentConfig = {
            '世界赛': {
                qualifyRange: [1, 4],    // 联赛前4名
                totalTeams: 24,          // 6地区×4
                groups: 8,               // 8个组
                teamsPerGroup: 3,        // 每组3人
                groupMatchesPerPair: 2,  // 组内每对打2场
                qualifiersPerGroup: 1,   // 每组第1名晋级
                knockoutFormat: 'bo3'    // 淘汰赛两场制（平则第三场）
            },
            '联合赛': {
                qualifyRange: [5, 8],    // 联赛第5-8名
                totalTeams: 24,
                groups: 8,
                teamsPerGroup: 3,
                groupMatchesPerPair: 2,
                qualifiersPerGroup: 1,
                knockoutFormat: 'bo3'
            },
            '联协赛': {
                qualifyRange: [9, 12],   // 联赛第9-12名
                totalTeams: 24,
                groups: 8,
                teamsPerGroup: 3,
                groupMatchesPerPair: 2,
                qualifiersPerGroup: 1,
                knockoutFormat: 'bo3'
            }
        };
        
        // 当前联赛数据结构
        this.leagues = this.initializeLeagues();
        
        // 大陆赛事数据
        this.tournaments = {
            summer: { '世界赛': null, '联合赛': null, '联协赛': null },
            winter: { '世界赛': null, '联合赛': null, '联协赛': null }
        };
        
        // 赛季管理
        this.currentSeason = 1;
        this.currentRound = 0;
        
        // 玩家数据
        this.playerTeam = {
            region: null,
            league: null,        // '夏季联赛' 或 '冬季联赛'
            registeredAnimals: [],
            availableSwaps: 0,
            lastSwapRound: 0,
            battleStats: {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                opponentsDefeated: 0,
                timesDefeated: 0
            }
        };
    }
    
    /**
     * 加载训练师数据（直接使用内嵌数据）
     */
    async loadTrainersData() {
        try {
            this.trainersData = LEAGUE_TRAINERS_DATA;
            this.initializeTrainersState();
        } catch (error) {
        }
    }
    
    /**
     * 初始化训练师状态（记录每个训练师当前在哪个联赛）
     */
    initializeTrainersState() {
        if (!this.trainersData) return;
        
        this.trainersState = {};
        
        Object.keys(this.trainersData.regions).forEach(region => {
            const regionData = this.trainersData.regions[region];
            
            Object.keys(regionData).forEach(leagueName => {
                const trainers = regionData[leagueName];
                
                trainers.forEach(trainer => {
                    this.trainersState[trainer.id] = {
                        region: region,
                        currentLeague: leagueName,
                        originalLeague: leagueName,
                        name: trainer.name,
                        strength: trainer.strength
                    };
                });
            });
        });
        

    }
    
    /**
     * 初始化所有地区的联赛
     */
    initializeLeagues() {
        const leagues = {};
        
        this.regions.forEach(region => {
            leagues[region] = {
                '夏季联赛': this.createLeague('夏季联赛', region),
                '冬季联赛': this.createLeague('冬季联赛', region)
            };
        });
        
        return leagues;
    }
    
    /**
     * 创建单个联赛
     */
    createLeague(leagueName, region) {
        const config = this.leagueConfig[leagueName];
        return {
            name: leagueName,
            region: region,
            season: this.currentSeason,
            currentRound: 0,
            totalRounds: config ? config.rounds : 38,
            teams: [],
            standings: [],
            fixtures: [],
            results: [],
            completed: false
        };
    }
    
    /**
     * 玩家加入联赛
     * @param {string} region - 地区
     * @param {string} teamName - 队伍名称
     * @param {string} leagueType - '夏季联赛' 或 '冬季联赛'
     */
    async joinLeague(region, teamName, leagueType) {
        if (!this.regions.includes(region)) {
            throw new Error('无效的地区');
        }
        
        if (!['夏季联赛', '冬季联赛'].includes(leagueType)) {
            throw new Error('无效的联赛类型，请选择夏季联赛或冬季联赛');
        }
        
        // 确保训练师数据已加载
        if (!this.trainersData) {
            await this.loadTrainersData();
        }
        
        const config = this.leagueConfig[leagueType];
        
        this.playerTeam = {
            region: region,
            league: leagueType,
            teamName: teamName,
            registeredAnimals: [],
            availableSwaps: 0,
            lastSwapRound: 0,
            isPlayer: true,
            needsRegistration: true,     // 需要登记25个动物
            careerHistory: [],
            nextLeague: null,
            battleStats: {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                opponentsDefeated: 0,
                timesDefeated: 0
            }
        };
        
        // 获取对应联赛
        const league = this.leagues[region][leagueType];
        
        // 清空原有队伍和赛程
        league.teams = [];
        league.fixtures = [];
        league.results = [];
        league.standings = [];
        league.completed = false;
        league.currentRound = 0;
        
        // 将玩家队伍添加到联赛
        league.teams.push(this.playerTeam);
        
        // 生成AI队伍补充联赛
        this.fillLeagueWithAI(league);
        

        
        // 验证队伍数量
        if (league.teams.length !== config.teams) {
            console.error(`队伍数量不匹配！当前: ${league.teams.length}, 需要: ${config.teams}`);
        }
        
        // 生成赛程
        this.generateFixtures(league);
        
        // 生成初始积分榜（所有队伍0分，确保UI能显示参赛选手）
        this.updateStandings(league);
        
        return this.playerTeam;
    }
    
    /**
     * 用AI队伍填充联赛（使用固定训练师数据）
     */
    fillLeagueWithAI(league) {
        const config = this.leagueConfig[league.name];
        const currentTeamCount = league.teams.length;
        const neededTeams = config.teams - currentTeamCount;
        
        if (neededTeams <= 0) {
            return;
        }
        
        if (this.trainersData && this.trainersData.regions[league.region] && this.trainersState) {
            const availableTrainers = this.getAvailableTrainersForLeague(league.region, league.name);
            
            if (availableTrainers.length >= neededTeams) {
                const selectedTrainers = availableTrainers.slice(0, neededTeams);
                
                selectedTrainers.forEach(trainer => {
                    const aiTeam = {
                        region: league.region,
                        league: league.name,
                        teamName: trainer.name,
                        trainerId: trainer.id,
                        registeredAnimals: this.generateAIAnimals(league.name),
                        isPlayer: false,
                        strength: trainer.strength
                    };
                    league.teams.push(aiTeam);
                });
                

            } else {

                
                availableTrainers.forEach(trainer => {
                    const aiTeam = {
                        region: league.region,
                        league: league.name,
                        teamName: trainer.name,
                        trainerId: trainer.id,
                        registeredAnimals: this.generateAIAnimals(league.name),
                        isPlayer: false,
                        strength: trainer.strength
                    };
                    league.teams.push(aiTeam);
                });
                
                const remaining = neededTeams - availableTrainers.length;
                this.fillLeagueWithRandomAI(league, remaining, currentTeamCount + availableTrainers.length);
            }
        } else {
            this.fillLeagueWithRandomAI(league, neededTeams, currentTeamCount);
        }
    }
    
    /**
     * 获取应该在指定联赛的可用训练师
     */
    getAvailableTrainersForLeague(region, leagueName) {
        const availableTrainers = [];
        
        Object.keys(this.trainersState).forEach(trainerId => {
            const trainerState = this.trainersState[trainerId];
            
            if (trainerState.region === region && trainerState.currentLeague === leagueName) {
                availableTrainers.push({
                    id: trainerId,
                    name: trainerState.name,
                    strength: trainerState.strength
                });
            }
        });
        
        availableTrainers.sort((a, b) => b.strength - a.strength);
        
        return availableTrainers;
    }
    
    /**
     * 使用随机生成填充AI队伍（备用方案）
     */
    fillLeagueWithRandomAI(league, neededTeams, startIndex) {
        for (let i = 0; i < neededTeams; i++) {
            const aiTeam = {
                region: league.region,
                league: league.name,
                teamName: `${league.region}_AI选手${startIndex + i}`,
                registeredAnimals: this.generateAIAnimals(league.name),
                isPlayer: false,
                strength: Math.random() * 100 + 50
            };
            league.teams.push(aiTeam);
        }
    }
    
    /**
     * 生成AI队伍的动物
     */
    generateAIAnimals(leagueName) {
        const config = this.leagueConfig[leagueName];
        const animalCount = config ? config.registrationCount : 25;
        
        const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
        const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
        
        const animals = [];
        
        for (let i = 0; i < animalCount; i++) {
            let animal;
            
            if (animalPool.length > 0) {
                const template = animalPool[Math.floor(Math.random() * animalPool.length)];
                
                // 处理animalId: 如果是纯数字格式(如10001)则使用,否则使用key
                let imageId = template.animalId;
                // 如果animalId是ANIMAL_开头的格式,则尝试使用key
                if (!imageId || imageId.toString().startsWith('ANIMAL_')) {
                    imageId = template.key;
                }
                // 如果key也是ANIMAL_开头,则从中提取数字部分
                if (imageId && imageId.toString().startsWith('ANIMAL_')) {
                    // 尝试从ANIMAL_xxx中提取数字
                    const match = imageId.toString().match(/\d+/);
                    if (match) {
                        imageId = match[0];
                    }
                }
                
                animal = {
                    id: `ai_animal_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
                    name: template.name || `AI动物${i + 1}`,
                    templateKey: template.key,
                    animalId: imageId || template.animalId || template.key,
                    key: template.key,
                    hp: template.stamina || (Math.random() * 200 + 300),
                    attack: template.attack || (Math.random() * 50 + 50),
                    defense: template.defense || (Math.random() * 50 + 50),
                    agility: template.agility || (Math.random() * 30 + 20),
                    level: Math.floor(Math.random() * 20) + 10,
                    element: template.element || '默认',
                    combatSkills: { equipped: [], available: [] }
                };
                
                if (template.skillPoolKey) {
                    const skillPool = skillPools.find(p => p.key === template.skillPoolKey);
                    if (skillPool && skillPool.skills && skillPool.skills.length > 0) {
                        const shuffled = [...skillPool.skills].sort(() => Math.random() - 0.5);
                        const selectedSkills = shuffled.slice(0, Math.min(4, shuffled.length));
                        
                        selectedSkills.forEach(skillConfig => {
                            animal.combatSkills.equipped.push(skillConfig.skillKey);
                            animal.combatSkills.available.push(skillConfig.skillKey);
                        });
                    }
                }
            } else {
                animal = {
                    id: `ai_animal_${Date.now()}_${i}`,
                    name: `AI动物${i + 1}`,
                    hp: Math.random() * 200 + 300,
                    attack: Math.random() * 50 + 50,
                    defense: Math.random() * 50 + 50,
                    agility: Math.random() * 30 + 20,
                    level: Math.floor(Math.random() * 20) + 10
                };
            }
            
            animals.push(animal);
        }
        
        return animals;
    }
    
    /**
     * 生成联赛赛程（20支队伍双循环赛制，38轮）
     */
    generateFixtures(league) {
        const config = this.leagueConfig[league.name];
        const teams = league.teams;
        const numTeams = teams.length;
        const fixtures = [];
        
        // 使用循环赛算法生成合理的轮次分配
        // numTeams支队伍，每轮numTeams/2场比赛
        const halfRounds = numTeams - 1; // 单循环轮数 = 19
        const matchesPerRound = numTeams / 2; // 每轮10场
        
        // 使用经典的循环赛排列算法
        const teamIndices = [];
        for (let i = 0; i < numTeams; i++) {
            teamIndices.push(i);
        }
        
        // 第一循环（前19轮）
        for (let round = 0; round < halfRounds; round++) {
            const roundFixtures = [];
            
            // 固定第一个位置的队伍
            const fixedTeam = teamIndices[0];
            const rotatingTeams = teamIndices.slice(1);
            
            // 旋转其余队伍
            const rotated = [];
            for (let i = 0; i < rotatingTeams.length; i++) {
                const idx = (i + round) % rotatingTeams.length;
                rotated.push(rotatingTeams[idx]);
            }
            
            // 生成本轮对阵
            // 第一场：固定队伍 vs 旋转后的第一个
            roundFixtures.push({
                round: round + 1,
                home: teams[fixedTeam],
                away: teams[rotated[0]],
                result: null
            });
            
            // 其余场次：从两端配对
            for (let i = 1; i < matchesPerRound; i++) {
                const homeIdx = rotated[i];
                const awayIdx = rotated[rotated.length - i];
                roundFixtures.push({
                    round: round + 1,
                    home: teams[homeIdx],
                    away: teams[awayIdx],
                    result: null
                });
            }
            
            fixtures.push(...roundFixtures);
        }
        
        // 第二循环（第20-38轮）：主客交换
        const firstHalfFixtures = [...fixtures];
        firstHalfFixtures.forEach(match => {
            fixtures.push({
                round: match.round + halfRounds,
                home: match.away,  // 主客交换
                away: match.home,
                result: null
            });
        });
        
        league.fixtures = fixtures;
    }
    
    /**
     * 打乱数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * 进行一轮比赛
     * @param {string} region - 地区
     * @param {string} leagueName - 联赛名称
     * @param {boolean} forcePlayerWin - 是否强制玩家获胜（调试用）
     */
    playRound(region, leagueName, forcePlayerWin = false) {
        if (!this.leagues[region]) {
            return { error: '地区数据不存在' };
        }
        const league = this.leagues[region][leagueName];
        if (!league) {
            return { error: '联赛数据不存在' };
        }
        
        if (league.completed) {
            return { error: '本赛季已结束' };
        }
        
        // 检查玩家是否已登记动物
        if (this.playerTeam.isPlayer && this.playerTeam.needsRegistration) {
            return { error: '请先在战斗准备界面登记25个动物的出战名单！' };
        }
        
        // 检查玩家是否有可用的动物
        if (this.playerTeam.isPlayer) {
            if (!this.playerTeam.registeredAnimals || this.playerTeam.registeredAnimals.length === 0) {
                return { error: '请先在战斗准备界面选择参战动物！' };
            }
        }
        
        league.currentRound++;
        const currentRound = league.currentRound;
        
        // 检查是否可以轮换动物
        this.checkAnimalSwapAvailability(league);
        
        // 获取本轮比赛
        const roundFixtures = league.fixtures.filter(f => f.round === currentRound);
        const results = [];
        
        roundFixtures.forEach(fixture => {
            const result = this.simulateMatch(fixture.home, fixture.away, forcePlayerWin);
            fixture.result = result;
            results.push(result);
            
            // 更新玩家战斗统计
            if (fixture.home.isPlayer || fixture.away.isPlayer) {
                this.updatePlayerBattleStats(fixture.home, fixture.away, result);
            }
            
            // 记录结果
            league.results.push({
                round: currentRound,
                fixture: fixture,
                result: result
            });
        });
        
        // 更新积分榜
        this.updateStandings(league);
        
        // 检查赛季是否结束
        const config = this.leagueConfig[league.name];
        if (currentRound >= config.rounds) {
            league.completed = true;
            this.processSeasonEnd(league);
        }
        
        return {
            round: currentRound,
            results: results,
            standings: league.standings,
            completed: league.completed
        };
    }
    
    /**
     * 模拟单场比赛
     * 每场比赛双方各选5个动物进行1v1对战，每场限时1分钟
     * 血量为0或倒计时结束前造成伤害高者记为1次胜利
     * 总计5场，统计总胜场决定胜者
     * @param {object} homeTeam - 主队
     * @param {object} awayTeam - 客队
     * @param {boolean} forcePlayerWin - 是否强制玩家获胜（调试用）
     */
    simulateMatch(homeTeam, awayTeam, forcePlayerWin = false) {
        let homeWins = 0;
        let awayWins = 0;
        const battles = [];
        
        // 如果启用强制玩家获胜模式
        const isPlayerHome = homeTeam.isPlayer;
        const isPlayerAway = awayTeam.isPlayer;
        const needForceWin = forcePlayerWin && (isPlayerHome || isPlayerAway);
        
        for (let i = 0; i < 5; i++) {
            const homeAnimal = this.selectAnimalForBattle(homeTeam, i);
            const awayAnimal = this.selectAnimalForBattle(awayTeam, i);
            
            const battleResult = this.simulateBattle(homeAnimal, awayAnimal, needForceWin ? (isPlayerHome ? 'home' : 'away') : null);
            battles.push(battleResult);
            
            if (battleResult.winner === 'home') {
                homeWins++;
            } else if (battleResult.winner === 'away') {
                awayWins++;
            }
        }
        
        // 新规则：胜利得2分，失败得0分
        // 5场1v1，总胜场多的一方获胜
        let homePoints = 0;
        let awayPoints = 0;
        let winner = null;
        
        if (homeWins > awayWins) {
            homePoints = 2;
            awayPoints = 0;
            winner = homeTeam;
        } else if (awayWins > homeWins) {
            homePoints = 0;
            awayPoints = 2;
            winner = awayTeam;
        } else {
            // 5场比赛平局的情况（极罕见，例如2:2时有一场内部平局）
            // 按规则应由造成更高伤害者获胜
            // 计算总伤害
            let homeTotalDamage = 0;
            let awayTotalDamage = 0;
            battles.forEach(b => {
                homeTotalDamage += b.damage1 || 0;
                awayTotalDamage += b.damage2 || 0;
            });
            
            if (homeTotalDamage >= awayTotalDamage) {
                homePoints = 2;
                awayPoints = 0;
                winner = homeTeam;
            } else {
                homePoints = 0;
                awayPoints = 2;
                winner = awayTeam;
            }
        }
        
        return {
            home: homeTeam,
            away: awayTeam,
            homeWins: homeWins,
            awayWins: awayWins,
            homePoints: homePoints,
            awayPoints: awayPoints,
            winner: winner,
            battles: battles
        };
    }
    
    /**
     * 为比赛选择动物
     */
    selectAnimalForBattle(team, position) {
        if (team.isPlayer) {
            if (!team.registeredAnimals || team.registeredAnimals.length === 0) {
                console.error('玩家队伍没有可用的动物！');
                return {
                    id: 'default',
                    name: '默认动物',
                    hp: 300,
                    attack: 50,
                    defense: 50,
                    agility: 50,
                    level: 10
                };
            }
            return team.registeredAnimals[position] || team.registeredAnimals[0];
        } else {
            const animals = team.registeredAnimals;
            if (!animals || animals.length === 0) {
                console.error(`AI队伍 ${team.teamName} 没有可用的动物！`);
                return {
                    id: 'default_ai',
                    name: 'AI默认动物',
                    hp: 300,
                    attack: 50,
                    defense: 50,
                    agility: 50,
                    level: 10
                };
            }
            return animals[Math.floor(Math.random() * Math.min(5, animals.length))];
        }
    }
    
    /**
     * 模拟1v1战斗（限时1分钟）
     * 当对方血量为0或者倒计时结束前造成伤害高者记为胜利
     * @param {object} animal1 - 动物1
     * @param {object} animal2 - 动物2
     * @param {string} forceWinner - 强制获胜方：'home', 'away', 或 null（正常模拟）
     */
    simulateBattle(animal1, animal2, forceWinner = null) {
        const damage1 = (animal1.attack || 50) * (1 + Math.random() * 0.5);
        const damage2 = (animal2.attack || 50) * (1 + Math.random() * 0.5);
        
        const hp1 = (animal1.hp || 300) - damage2;
        const hp2 = (animal2.hp || 300) - damage1;
        
        let winner = null;
        
        // 如果指定了强制获胜方，直接返回
        if (forceWinner === 'home' || forceWinner === 'away') {
            winner = forceWinner;
        } else {
            // 正常模拟：血量为0者失败；如果都没降到0，伤害高者获胜
            if (hp2 <= 0 && hp1 > 0) {
                winner = 'home';
            } else if (hp1 <= 0 && hp2 > 0) {
                winner = 'away';
            } else if (damage1 > damage2) {
                winner = 'home';
            } else if (damage2 > damage1) {
                winner = 'away';
            } else {
                // 完全相同伤害时随机判定
                winner = Math.random() > 0.5 ? 'home' : 'away';
            }
        }
        
        return {
            animal1: animal1,
            animal2: animal2,
            damage1: damage1,
            damage2: damage2,
            remainingHp1: Math.max(0, hp1),
            remainingHp2: Math.max(0, hp2),
            winner: winner
        };
    }
    
    /**
     * 更新积分榜
     * 新规则：胜利得2分，失败得0分
     */
    updateStandings(league) {
        const standings = {};
        
        // 初始化所有队伍
        league.teams.forEach(team => {
            standings[team.teamName] = {
                team: team,
                played: 0,
                won: 0,
                lost: 0,
                points: 0,
                goalsFor: 0,       // 赢得的1v1小局数
                goalsAgainst: 0,   // 输掉的1v1小局数
                goalDifference: 0
            };
        });
        
        // 统计比赛结果
        league.results.forEach(result => {
            const homeTeam = result.fixture.home.teamName;
            const awayTeam = result.fixture.away.teamName;
            const res = result.result;
            
            if (!standings[homeTeam] || !standings[awayTeam]) return;
            
            standings[homeTeam].played++;
            standings[awayTeam].played++;
            standings[homeTeam].goalsFor += res.homeWins;
            standings[homeTeam].goalsAgainst += res.awayWins;
            standings[awayTeam].goalsFor += res.awayWins;
            standings[awayTeam].goalsAgainst += res.homeWins;
            
            // 胜利得2分，失败得0分（不存在平局）
            if (res.homePoints === 2) {
                standings[homeTeam].won++;
                standings[homeTeam].points += 2;
                standings[awayTeam].lost++;
            } else {
                standings[awayTeam].won++;
                standings[awayTeam].points += 2;
                standings[homeTeam].lost++;
            }
        });
        
        // 计算净胜小局数
        Object.values(standings).forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });
        
        // 排序：先看积分，再看净胜小局数，再看总赢小局数
        league.standings = Object.values(standings).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    }
    
    /**
     * 检查动物轮换可用性
     * 每3轮可轮换2个动物
     * 第19轮后第20轮前可轮换12个动物
     */
    checkAnimalSwapAvailability(league) {
        if (!league) return null;
        const currentRound = league.currentRound;
        const config = this.leagueConfig[league.name];
        
        // 防御性检查：config 可能为 undefined（如联赛名不匹配）
        if (!config) return null;
        
        // 第19轮后第20轮前可以轮换12个动物
        if (currentRound === config.midSeasonSwapAfterRound) {
            this.playerTeam.availableSwaps = config.midSeasonSwapCount;
            this.playerTeam.lastSwapRound = currentRound;
            return { canSwap: true, maxSwaps: config.midSeasonSwapCount };
        }
        
        // 每3轮可以轮换2个动物
        if (currentRound > 0 && currentRound % config.swapEveryNRounds === 0 && currentRound !== this.playerTeam.lastSwapRound) {
            this.playerTeam.availableSwaps = config.swapCount;
            this.playerTeam.lastSwapRound = currentRound;
            return { canSwap: true, maxSwaps: config.swapCount };
        }
        
        return { canSwap: false, maxSwaps: 0 };
    }
    
    /**
     * 轮换动物
     */
    swapAnimals(animalsToRemove, animalsToAdd) {
        if (animalsToRemove.length !== animalsToAdd.length) {
            throw new Error('移除和添加的动物数量必须相同');
        }
        
        if (animalsToRemove.length > this.playerTeam.availableSwaps) {
            throw new Error(`当前只能轮换${this.playerTeam.availableSwaps}个动物`);
        }
        
        // 冬季联赛需要检查是否为未养成动物（初始等级）
        if (this.playerTeam.league === '冬季联赛') {
            // 检查动物模板池获取初始等级
            const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
            
            for (const animal of animalsToAdd) {
                // 查找动物在模板池中的模板
                const template = animalPool.find(t =>
                    t.key === animal.templateKey || t.key === animal.animalId
                );
                
                if (!template) {
                    throw new Error(`无法找到动物 ${animal.name} 的模板信息`);
                }
                
                // 检查初始等级（模板中的初始等级，通常为1）
                const initialLevel = template.initialLevel || 1;
                
                if (animal.level !== initialLevel) {
                    throw new Error(`冬季联赛要求所有动物必须为初始等级！\n动物 ${animal.name} 当前等级为 ${animal.level}，需要等级 ${initialLevel}。`);
                }
            }
        }
        
        animalsToRemove.forEach(animal => {
            const index = this.playerTeam.registeredAnimals.findIndex(a => a.id === animal.id);
            if (index !== -1) {
                this.playerTeam.registeredAnimals.splice(index, 1);
            }
        });
        
        animalsToAdd.forEach(animal => {
            this.playerTeam.registeredAnimals.push(animal);
        });
        
        this.playerTeam.availableSwaps -= animalsToRemove.length;
        
        return this.playerTeam.registeredAnimals;
    }
    
    /**
     * 处理赛季结束
     * 积分最高者为冠军，积分相同者进行附加赛
     * 前4名参加世界赛，5-8名参加联合赛，9-12名参加联协赛
     */
    processSeasonEnd(league) {
        const standings = league.standings;
        
        // 处理积分相同的情况 - 附加赛
        this.handleTiebreaker(league, standings);
        
        // 标记各赛事参赛资格
        standings.forEach((standing, index) => {
            const rank = index + 1;
            if (rank <= 4) {
                standing.tournament = '世界赛';
                standing.tournamentRank = rank;
            } else if (rank <= 8) {
                standing.tournament = '联合赛';
                standing.tournamentRank = rank;
            } else if (rank <= 12) {
                standing.tournament = '联协赛';
                standing.tournamentRank = rank;
            } else {
                standing.tournament = null;
                standing.tournamentRank = rank;
            }
        });
        
        league.seasonSummary = {
            champion: standings[0],
            worldCupQualifiers: standings.slice(0, 4),
            unitedCupQualifiers: standings.slice(4, 8),
            associationCupQualifiers: standings.slice(8, 12)
        };
        
        // 检查玩家资格
        this.checkPlayerTournamentQualification(league);
        

    }
    
    /**
     * 处理积分相同的附加赛（冠军争夺）
     */
    handleTiebreaker(league, standings) {
        if (standings.length < 2) return;
        
        // 检查是否有积分相同需要附加赛的情况
        // 主要针对冠军位置
        if (standings[0].points === standings[1].points) {
            const tiebreaker = this.simulateMatch(standings[0].team, standings[1].team);
            
            if (tiebreaker.winner === standings[1].team) {
                // 交换位置
                [standings[0], standings[1]] = [standings[1], standings[0]];
            }
            
            league.tiebreakerResult = tiebreaker;
        }
    }
    
    /**
     * 检查玩家的大陆赛事参赛资格
     */
    checkPlayerTournamentQualification(league) {
        if (!this.playerTeam || !this.playerTeam.isPlayer) {
            return;
        }
        
        const playerStanding = league.standings.find(s => s.team && s.team.isPlayer);
        if (!playerStanding) {
            return;
        }
        
        const rank = league.standings.indexOf(playerStanding) + 1;
        
        // 记录本赛季成绩
        this.playerTeam.careerHistory = this.playerTeam.careerHistory || [];
        this.playerTeam.careerHistory.push({
            season: league.season,
            league: league.name,
            region: league.region,
            rank: rank,
            points: playerStanding.points,
            tournament: playerStanding.tournament
        });
        
        // 设置玩家的大陆赛事资格
        this.playerTeam.tournamentQualification = playerStanding.tournament;
    }
    
    /**
     * 生成大陆赛事（世界赛/联合赛/联协赛）
     * @param {string} season - 'summer' 或 'winter'
     * @param {string} tournamentName - '世界赛', '联合赛', '联协赛'
     */
    generateTournament(season, tournamentName) {
        const config = this.tournamentConfig[tournamentName];
        const leagueName = season === 'summer' ? '夏季联赛' : '冬季联赛';
        
        // 从各地区联赛收集参赛选手
        const allQualifiers = [];
        
        this.regions.forEach(region => {
            const league = this.leagues[region][leagueName];
            if (!league.standings || league.standings.length === 0) {
                return;
            }
            
            const [startRank, endRank] = config.qualifyRange;
            const qualifiers = league.standings.slice(startRank - 1, endRank);
            
            qualifiers.forEach(standing => {
                allQualifiers.push({
                    team: standing.team,
                    region: region,
                    leagueRank: league.standings.indexOf(standing) + 1
                });
            });
        });
        

        
        // 分组：8组，每组3人，同一组不可出现3个同地区选手
        const groups = this.generateTournamentGroups(allQualifiers, config);
        
        // 生成小组赛赛程
        const groupFixtures = this.generateTournamentGroupFixtures(groups);
        
        const tournament = {
            name: tournamentName,
            season: season,
            leagueName: leagueName,
            config: config,
            groups: groups,
            groupFixtures: groupFixtures,
            groupStandings: [],
            knockoutFixtures: [],
            groupStageCompleted: false,
            knockoutStageCompleted: false,
            champion: null
        };
        
        this.tournaments[season][tournamentName] = tournament;
        
        return tournament;
    }
    
    /**
     * 大陆赛事分组
     * 8组，每组3人，同一组不可出现同地区3人
     */
    generateTournamentGroups(qualifiers, config) {
        const groups = [];
        for (let i = 0; i < config.groups; i++) {
            groups.push([]);
        }
        
        // 按地区分类
        const byRegion = {};
        qualifiers.forEach(q => {
            if (!byRegion[q.region]) byRegion[q.region] = [];
            byRegion[q.region].push(q);
        });
        
        // 打乱每个地区内的顺序
        Object.values(byRegion).forEach(regionTeams => {
            this.shuffleArray(regionTeams);
        });
        
        // 分配到组 - 确保同一组不超过2个同地区选手
        const allTeams = [...qualifiers];
        this.shuffleArray(allTeams);
        
        allTeams.forEach(qualifier => {
            // 找一个可以放入的组
            let placed = false;
            for (let g = 0; g < groups.length; g++) {
                if (groups[g].length >= config.teamsPerGroup) continue;
                
                // 检查同地区限制：同组不能有3个同地区
                const sameRegionCount = groups[g].filter(q => q.region === qualifier.region).length;
                if (sameRegionCount >= 2) continue;
                
                groups[g].push(qualifier);
                placed = true;
                break;
            }
            
            if (!placed) {
                // 如果所有组都不满足条件，放入人数最少的组
                const minGroup = groups.reduce((min, g, i) => 
                    g.length < groups[min].length ? i : min, 0);
                groups[minGroup].push(qualifier);
            }
        });
        
        return groups;
    }
    
    /**
     * 生成大陆赛事小组赛赛程
     * 新规则：每组3人，每周六进行1场比赛，共4轮
     * 每人与其他2人各打2场
     * 
     * 赛程安排示例（A, B, C三人）：
     * 第1轮（周六）：A vs B  (C休息)
     * 第2轮（周六）：A vs C  (B休息)
     * 第3轮（周六）：B vs C  (A休息)
     * 第4轮（周六）：B vs A  (主客互换, C休息)
     * 
     * 注意：每轮只有2人比赛，第3人休息
     * 第4轮之后可以继续：C vs A, C vs B 但只需4轮每人都打2场
     */
    generateTournamentGroupFixtures(groups) {
        const fixtures = [];
        
        groups.forEach((group, groupIndex) => {
            if (group.length !== 3) {
                return;
            }
            
            // 3人小组 (A=0, B=1, C=2)
            // 第1轮：A vs B (C休息)
            fixtures.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                round: 1,
                home: group[0].team,
                away: group[1].team,
                homeRegion: group[0].region,
                awayRegion: group[1].region,
                result: null
            });
            
            // 第2轮：A vs C (B休息)
            fixtures.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                round: 2,
                home: group[0].team,
                away: group[2].team,
                homeRegion: group[0].region,
                awayRegion: group[2].region,
                result: null
            });
            
            // 第3轮：B vs C (A休息)
            fixtures.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                round: 3,
                home: group[1].team,
                away: group[2].team,
                homeRegion: group[1].region,
                awayRegion: group[2].region,
                result: null
            });
            
            // 第4轮：B vs A (主客互换, C休息)
            fixtures.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                round: 4,
                home: group[1].team,
                away: group[0].team,
                homeRegion: group[1].region,
                awayRegion: group[0].region,
                result: null
            });
            
            // 注意：每人与其他2人各打2场，所以需要6场比赛
            // 继续添加剩余2场：C与A的第2场, C与B的第2场
            // 第5轮：C vs A (主客互换, B休息)
            fixtures.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                round: 5,
                home: group[2].team,
                away: group[0].team,
                homeRegion: group[2].region,
                awayRegion: group[0].region,
                result: null
            });
            
            // 第6轮：C vs B (主客互换, A休息)
            fixtures.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                round: 6,
                home: group[2].team,
                away: group[1].team,
                homeRegion: group[2].region,
                awayRegion: group[1].region,
                result: null
            });
        });
        
        return fixtures;
    }
    
    /**
     * 进行大陆赛事小组赛
     * 新规则：每周六只进行1场比赛（按轮次进行）
     * 如果某人已经打完了所有比赛，但其他两人还有比赛，则这周该选手就没有比赛
     * @param {string} season - 赛季
     * @param {string} tournamentName - 赛事名称
     * @param {boolean} forcePlayerWin - 是否强制玩家获胜（调试用）
     */
    playTournamentGroupStage(season, tournamentName, forcePlayerWin = false) {
        const tournament = this.tournaments[season][tournamentName];
        if (!tournament) {
            return { error: '赛事尚未生成' };
        }
        
        // 初始化当前轮次
        if (!tournament.currentGroupRound) {
            tournament.currentGroupRound = 1;
        }
        
        // 找到玩家所在的组
        let playerGroupIndex = -1;
        tournament.groups.forEach((group, index) => {
            group.forEach(qualifier => {
                if (qualifier.team && qualifier.team.isPlayer) {
                    playerGroupIndex = index;
                }
            });
        });
        
        if (playerGroupIndex < 0) {
            return { error: '未找到玩家所在的小组' };
        }
        
        // 获取当前轮次的所有比赛
        const currentRound = tournament.currentGroupRound;
        const roundFixtures = tournament.groupFixtures.filter(f =>
            f.round === currentRound && !f.result
        );
        
        
        if (roundFixtures.length === 0) {
            // 当前轮次没有比赛，检查是否已完成小组赛
            const allCompleted = tournament.groupFixtures.every(f => f.result);
            
            if (allCompleted || currentRound > 6) {
                // 小组赛已全部完成（6轮）
                tournament.groupFixtures.forEach(fixture => {
                    if (!fixture.result) {
                        fixture.result = this.simulateMatch(fixture.home, fixture.away, forcePlayerWin);
                    }
                });
                
                // 计算小组积分榜
                this.calculateTournamentGroupStandings(tournament);
                
                tournament.groupStageCompleted = true;
                
                // 提取每组第1名进入淘汰赛
                const qualifiedTeams = [];
                tournament.groupStandings.forEach(group => {
                    if (group.standings.length > 0) {
                        qualifiedTeams.push(group.standings[0].team);
                    }
                });
                
                // 生成淘汰赛
                this.generateTournamentKnockout(tournament, qualifiedTeams);
                
                return {
                    allCompleted: true,
                    currentRound: currentRound,
                    groupStandings: tournament.groupStandings,
                    qualifiedTeams: qualifiedTeams
                };
            } else {
                // 推进到下一轮(但不超过6轮)
                if (tournament.currentGroupRound < 6) {
                    tournament.currentGroupRound++;
                }
                return this.playTournamentGroupStage(season, tournamentName);
            }
        }
        
        // 查找玩家在本轮的比赛
        // 修复：不仅从本轮未完成的比赛中查找，而是从所有赛程中查找玩家组当前轮次的比赛
        const playerGroupFixtures = tournament.groupFixtures.filter(f =>
            f.groupIndex === playerGroupIndex &&
            f.round === currentRound
        );
        
        const playerFixture = playerGroupFixtures.find(f =>
            (f.home.isPlayer || f.away.isPlayer) && !f.result
        );
        
        
        if (!playerFixture) {
            // 玩家本轮没有比赛（本轮休息，或者已经打完了自己的场次）
            // 新规则：需要模拟所有组的本轮比赛，包括玩家组的
            
            // 模拟所有组的本轮比赛（包括玩家组）
            roundFixtures.forEach(fixture => {
                if (!fixture.result) {
                    fixture.result = this.simulateMatch(fixture.home, fixture.away, forcePlayerWin);
                }
            });
            
            // 计算小组积分榜
            this.calculateTournamentGroupStandings(tournament);
            
            // 只推进一次轮次，然后直接返回（不要递归调用）
            const oldRound = tournament.currentGroupRound;
            tournament.currentGroupRound++;
            
            return {
                noPlayerMatch: true,
                message: '本周没有你的比赛安排',
                currentRound: oldRound,
                nextRound: tournament.currentGroupRound,
                // 确保不返回任何fixture和result，让UI知道这轮玩家休息
                fixture: null,
                result: null,
                groupStandings: tournament.groupStandings
            };
        }
        
        // 进行玩家的本轮比赛
        const result = this.simulateMatch(playerFixture.home, playerFixture.away, forcePlayerWin);
        playerFixture.result = result;
        
        
        // 更新玩家战斗统计
        this.updatePlayerBattleStats(playerFixture.home, playerFixture.away, result);
        
        // 模拟所有组（包括玩家所在组）的本轮其他比赛
        roundFixtures.forEach(fixture => {
            if (fixture !== playerFixture && !fixture.result) {
                fixture.result = this.simulateMatch(fixture.home, fixture.away, false);
            }
        });
        
        // 计算当前小组积分榜
        this.calculateTournamentGroupStandings(tournament);
        
        // 检查小组赛是否全部完成
        const allCompleted = tournament.groupFixtures.every(f => f.result);
        if (allCompleted) {
            tournament.groupStageCompleted = true;
            
            // 提取每组第1名进入淘汰赛
            const qualifiedTeams = [];
            tournament.groupStandings.forEach(group => {
                if (group.standings.length > 0) {
                    qualifiedTeams.push(group.standings[0].team);
                }
            });
            
            // 生成淘汰赛
            this.generateTournamentKnockout(tournament, qualifiedTeams);
            
            return {
                fixture: playerFixture,
                result: result,
                allCompleted: true,
                currentRound: currentRound,
                groupStandings: tournament.groupStandings,
                qualifiedTeams: qualifiedTeams
            };
        }
        
        // 只有在未完成时才推进到下一轮，且不能从第6轮推进到第7轮
        if (tournament.currentGroupRound < 6 && !tournament.groupStageCompleted) {
            tournament.currentGroupRound++;
        }
        
        return {
            fixture: playerFixture,
            result: result,
            currentRound: currentRound,
            nextRound: tournament.currentGroupRound
        };
    }
    
    /**
     * 计算大陆赛事小组积分榜
     * 注意："已赛"统计的是打过的轮次,而不是场次
     * 3人组每人与其他2人各打2场,共6轮,所以最多6场
     */
    calculateTournamentGroupStandings(tournament) {
        const groupStandings = [];
        
        tournament.groups.forEach((group, groupIndex) => {
            const standings = {};
            
            group.forEach(qualifier => {
                const teamName = qualifier.team.teamName;
                standings[teamName] = {
                    team: qualifier.team,
                    region: qualifier.region,
                    played: 0,
                    won: 0,
                    lost: 0,
                    points: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0
                };
            });
            
            // 统计该组的比赛结果(每场比赛=1轮)
            const groupFixtures = tournament.groupFixtures.filter(f => f.groupIndex === groupIndex && f.result);
            
            
            groupFixtures.forEach(fixture => {
                const homeTeam = fixture.home.teamName;
                const awayTeam = fixture.away.teamName;
                const result = fixture.result;
                
                if (!standings[homeTeam] || !standings[awayTeam]) {
                    return;
                }
                
                // 每场比赛对应1轮,双方各增加1轮已赛
                standings[homeTeam].played++;
                standings[awayTeam].played++;
                standings[homeTeam].goalsFor += result.homeWins;
                standings[homeTeam].goalsAgainst += result.awayWins;
                standings[awayTeam].goalsFor += result.awayWins;
                standings[awayTeam].goalsAgainst += result.homeWins;
                
                if (result.homePoints === 2) {
                    standings[homeTeam].won++;
                    standings[homeTeam].points += 2;
                    standings[awayTeam].lost++;
                } else {
                    standings[awayTeam].won++;
                    standings[awayTeam].points += 2;
                    standings[homeTeam].lost++;
                }
            });
            
            const ranking = Object.values(standings).map(team => {
                team.goalDifference = team.goalsFor - team.goalsAgainst;
                return team;
            }).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                return b.goalsFor - a.goalsFor;
            });
            
            groupStandings.push({
                groupIndex: groupIndex,
                groupName: `第${groupIndex + 1}组`,
                standings: ranking
            });
        });
        
        tournament.groupStandings = groupStandings;
    }
    
    /**
     * 生成大陆赛事淘汰赛
     * 8人淘汰赛：8进4，4进2，决赛
     * 每轮打2场，平则打第3场
     */
    generateTournamentKnockout(tournament, qualifiedTeams) {
        const knockoutFixtures = [];
        
        // 8进4
        this.shuffleArray(qualifiedTeams);
        for (let i = 0; i < qualifiedTeams.length; i += 2) {
            knockoutFixtures.push({
                stage: '8进4',
                team1: qualifiedTeams[i],
                team2: qualifiedTeams[i + 1],
                matches: [],
                winner: null
            });
        }
        
        // 4进2（待定）
        for (let i = 0; i < 2; i++) {
            knockoutFixtures.push({
                stage: '半决赛',
                team1: null,
                team2: null,
                matches: [],
                winner: null
            });
        }
        
        // 决赛（待定）
        knockoutFixtures.push({
            stage: '决赛',
            team1: null,
            team2: null,
            matches: [],
            winner: null
        });
        
        tournament.knockoutFixtures = knockoutFixtures;
    }
    
    /**
     * 进行大陆赛事淘汰赛一轮
     * BO3制度:每周六打1场,需要2-3周决出胜负
     * - 第1周:打第1场
     * - 第2周:打第2场
     * - 如果1:1平,第3周打第3场决胜负
     *
     * 同步逻辑:
     * - 当检测到有些组已经决出胜负(2:0或2:1),但有些组还是1:1平局时
     * - 自动模拟那些1:1组的第三场比赛,确保所有组同步推进
     */
    playTournamentKnockoutRound(season, tournamentName, stage) {
        const tournament = this.tournaments[season][tournamentName];
        if (!tournament) {
            return { error: '赛事尚未生成' };
        }
        
        const roundFixtures = tournament.knockoutFixtures.filter(f => f.stage === stage && !f.winner);
        const results = [];
        
        roundFixtures.forEach(fixture => {
            if (!fixture.team1 || !fixture.team2) {
                return;
            }
            
            // BO3: 每周打1场,需要2-3场决出胜负
            this.simulateTournamentKnockoutMatch(fixture);
            results.push(fixture);
        });
        
        // 新增：同步逻辑 - 自动模拟决胜局
        // 检查是否有已经决出胜负的组（2:0或2:1）
        const stageFixtures = tournament.knockoutFixtures.filter(f => f.stage === stage && f.team1 && f.team2);
        const completedFixtures = stageFixtures.filter(f => f.winner);
        const tiedFixtures = stageFixtures.filter(f => {
            if (f.winner) return false;
            const team1Wins = f.matches?.filter(m => m.winner === f.team1).length || 0;
            const team2Wins = f.matches?.filter(m => m.winner === f.team2).length || 0;
            return team1Wins === 1 && team2Wins === 1;
        });
        
        // 如果有完成的组 且 有1:1平局的组，自动模拟决胜局
        if (completedFixtures.length > 0 && tiedFixtures.length > 0) {
            tiedFixtures.forEach(fixture => {
                // 强制进行第三场比赛
                this.simulateTournamentKnockoutMatch(fixture);
                results.push(fixture);
            });
        }
        
        // 填充下一轮的对阵
        this.updateTournamentNextRound(tournament, stage);
        
        // 检查是否完成
        if (stage === '决赛' && roundFixtures.every(f => f.winner)) {
            tournament.knockoutStageCompleted = true;
            tournament.champion = roundFixtures[0].winner;
        }
        
        return {
            stage: stage,
            results: results,
            completed: tournament.knockoutStageCompleted,
            autoSimulated: tiedFixtures.length // 返回自动模拟的数量
        };
    }
    
    /**
     * 模拟大陆赛事淘汰赛单场比赛
     * BO3制度:每周六打1场
     * - 打完第1场后,team1Wins和team2Wins分别为0或1
     * - 打完第2场后,可能是2:0,也可能是1:1
     * - 如果1:1,打第3场决胜负,最终2:1
     * @param {object} fixture - 对阵信息
     * @param {boolean} forcePlayerWin - 是否强制玩家获胜（调试用）
     */
    simulateTournamentKnockoutMatch(fixture, forcePlayerWin = false) {
        // 初始化matches数组
        if (!fixture.matches) {
            fixture.matches = [];
        }
        
        let team1Wins = fixture.matches.filter(m => m.winner === fixture.team1).length;
        let team2Wins = fixture.matches.filter(m => m.winner === fixture.team2).length;
        
        // 已经决出胜负(2:0或2:1),不再比赛
        if (team1Wins >= 2 || team2Wins >= 2) {
            return;
        }
        
        // 进行本周的比赛
        const match = this.simulateMatch(
            fixture.matches.length % 2 === 0 ? fixture.team1 : fixture.team2,
            fixture.matches.length % 2 === 0 ? fixture.team2 : fixture.team1,
            forcePlayerWin
        );
        fixture.matches.push(match);
        
        // 更新胜场统计
        if (match.winner === fixture.team1) team1Wins++;
        else team2Wins++;
        
        // 判断是否已决出胜负
        if (team1Wins >= 2) {
            fixture.winner = fixture.team1;
        } else if (team2Wins >= 2) {
            fixture.winner = fixture.team2;
        }
        // 否则继续等待下周比赛
    }
    
    /**
     * 更新大陆赛事淘汰赛下一轮对阵
     */
    updateTournamentNextRound(tournament, completedStage) {
        const completedFixtures = tournament.knockoutFixtures.filter(f => f.stage === completedStage && f.winner);
        const winners = completedFixtures.map(f => f.winner);
        
        let nextStage;
        if (completedStage === '8进4') nextStage = '半决赛';
        else if (completedStage === '半决赛') nextStage = '决赛';
        else return;
        
        const nextFixtures = tournament.knockoutFixtures.filter(f => f.stage === nextStage);
        
        nextFixtures.forEach((fixture, index) => {
            fixture.team1 = winners[index * 2] || null;
            fixture.team2 = winners[index * 2 + 1] || null;
        });
    }
    
    /**
     * 更新玩家战斗统计
     */
    updatePlayerBattleStats(home, away, result) {
        if (!this.playerTeam || !this.playerTeam.battleStats) return;
        
        const isPlayerHome = home.isPlayer;
        const stats = this.playerTeam.battleStats;
        
        stats.totalMatches++;
        
        if (isPlayerHome) {
            if (result.homeWins > result.awayWins) {
                stats.wins++;
            } else {
                stats.losses++;
            }
            stats.opponentsDefeated += result.homeWins;
            stats.timesDefeated += result.awayWins;
        } else {
            if (result.awayWins > result.homeWins) {
                stats.wins++;
            } else {
                stats.losses++;
            }
            stats.opponentsDefeated += result.awayWins;
            stats.timesDefeated += result.homeWins;
        }
    }
    
    /**
     * 开始新赛季
     */
    startNewSeason() {
        if (!this.playerTeam || !this.playerTeam.region) {
            throw new Error('玩家未加入联赛');
        }
        
        // 保存上赛季的大陆赛事资格（不清空，让玩家可以查看）
        const previousQualification = this.playerTeam.tournamentQualification;
        
        this.currentSeason++;
        
        const region = this.playerTeam.region;
        const leagueName = this.playerTeam.league;
        
        // 每年只能参加一个联赛（夏季或冬季）
        // 新赛季保持在同一类型联赛
        this.playerTeam.availableSwaps = 0;
        this.playerTeam.lastSwapRound = 0;
        this.playerTeam.registeredAnimals = [];
        this.playerTeam.needsRegistration = true;
        // 注意：不清空 tournamentQualification，让玩家可以继续查看上赛季获得的资格
        
        // 获取联赛
        const league = this.leagues[region][leagueName];
        
        // 重置联赛数据
        league.season = this.currentSeason;
        league.currentRound = 0;
        league.fixtures = [];
        league.results = [];
        league.standings = [];
        league.completed = false;
        league.teams = [];
        
        // 添加玩家队伍
        league.teams.push(this.playerTeam);
        
        // 填充AI队伍
        this.fillLeagueWithAI(league);
        
        // 生成赛程
        this.generateFixtures(league);
        
        // 生成初始积分榜（所有队伍0分，确保UI能显示参赛选手）
        this.updateStandings(league);
        
        return {
            league: league,
            previousLeague: this.playerTeam.careerHistory[this.playerTeam.careerHistory.length - 1],
            previousQualification: previousQualification,
            needsRegistration: true
        };
    }
    
    /**
     * 切换联赛类型（夏季↔冬季）
     * 每位参赛者每年最多参加其中一个联赛
     */
    switchLeagueType(newLeagueType) {
        if (!['夏季联赛', '冬季联赛'].includes(newLeagueType)) {
            throw new Error('无效的联赛类型');
        }
        
        if (this.playerTeam.league === newLeagueType) {
            throw new Error('已在该联赛中');
        }
        
        this.playerTeam.league = newLeagueType;
        this.playerTeam.registeredAnimals = [];
        this.playerTeam.needsRegistration = true;
        
        return this.playerTeam;
    }
    
    /**
     * 登记动物名单
     * 夏季联赛：最多25个普通动物（最少5只）
     * 冬季联赛：最多25个未养成动物（最少5只）
     */
    registerAnimals(animals) {
        if (!this.playerTeam) {
            throw new Error('玩家未加入联赛');
        }
        
        const config = this.leagueConfig[this.playerTeam.league];
        
        // 修改：最少5只动物
        if (animals.length < 5) {
            throw new Error(`至少需要登记5个动物`);
        }
        
        if (animals.length > config.registrationCount) {
            throw new Error(`最多只能登记${config.registrationCount}个动物`);
        }
        
        // 冬季联赛需要验证是否为未养成动物（初始等级）
        if (this.playerTeam.league === '冬季联赛') {
            // 检查动物模板池获取初始等级
            const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
            
            for (const animal of animals) {
                // 查找动物在模板池中的模板
                const template = animalPool.find(t =>
                    t.key === animal.templateKey || t.key === animal.animalId
                );
                
                if (!template) {
                    throw new Error(`无法找到动物 ${animal.name} 的模板信息`);
                }
                
                // 检查初始等级（模板中的初始等级，通常为1）
                const initialLevel = template.initialLevel || 1;
                
                if (animal.level !== initialLevel) {
                    throw new Error(`冬季联赛要求所有动物必须为初始等级！\n动物 ${animal.name} 当前等级为 ${animal.level}，需要等级 ${initialLevel}。`);
                }
            }
        }
        
        this.playerTeam.registeredAnimals = [...animals];
        this.playerTeam.needsRegistration = false;
        
        return true;
    }
    
    /**
     * 获取联赛信息
     */
    getLeagueInfo(region, leagueName) {
        if (!region || !leagueName || !this.leagues[region]) return null;
        return this.leagues[region][leagueName] || null;
    }
    
    /**
     * 获取大陆赛事信息
     */
    getTournamentInfo(season, tournamentName) {
        return this.tournaments[season][tournamentName];
    }
    
    /**
     * 获取玩家队伍信息
     */
    getPlayerTeam() {
        return this.playerTeam;
    }
    
    /**
     * 获取所有地区的联赛排名
     */
    getAllLeagueStandings(leagueName) {
        const allStandings = {};
        this.regions.forEach(region => {
            const league = this.leagues[region][leagueName];
            if (league && league.standings.length > 0) {
                allStandings[region] = league.standings;
            }
        });
        return allStandings;
    }

    // ============ 数据持久化 ============

    /**
     * 初始化 IndexedDB
     */
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(LeagueSystem.DB_NAME, LeagueSystem.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(LeagueSystem.STORE_NAME)) {
                    db.createObjectStore(LeagueSystem.STORE_NAME);
                }
            };
        });
    }
    
    /**
     * 保存联赛数据到 IndexedDB
     */
    async saveData() {
        try {
            const db = await this.initDatabase();
            const transaction = db.transaction([LeagueSystem.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(LeagueSystem.STORE_NAME);
            
            const data = {
                leagues: this.leagues,
                tournaments: this.tournaments,
                currentSeason: this.currentSeason,
                playerTeam: this.playerTeam,
                trainersState: this.trainersState,
                timestamp: Date.now()
            };
            
            store.put(data, 'current');
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('保存数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 从 IndexedDB 加载联赛数据
     */
    async loadData() {
        try {
            const db = await this.initDatabase();
            const transaction = db.transaction([LeagueSystem.STORE_NAME], 'readonly');
            const store = transaction.objectStore(LeagueSystem.STORE_NAME);
            
            return new Promise((resolve, reject) => {
                const request = store.get('current');
                
                request.onsuccess = () => {
                    const data = request.result;
                    if (data) {
                        this.applyLoadedData(data);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('加载数据失败:', error);
            return false;
        }
    }
    
    /**
     * 应用加载的数据
     */
    applyLoadedData(data) {
        // 验证加载的联赛数据是否兼容新结构
        if (data.leagues) {
            const firstRegion = Object.keys(data.leagues)[0];
            if (firstRegion && data.leagues[firstRegion]) {
                // 检查是否包含新版联赛类型（夏季联赛/冬季联赛）
                if (data.leagues[firstRegion]['夏季联赛'] || data.leagues[firstRegion]['冬季联赛']) {
                    this.leagues = data.leagues;
                    
                    // 确保所有6个地区都存在
                    this.regions.forEach(region => {
                        if (!this.leagues[region]) {
                            this.leagues[region] = {
                                '夏季联赛': this.createLeague('夏季联赛', region),
                                '冬季联赛': this.createLeague('冬季联赛', region)
                            };
                        }
                    });
                } else {
                    // 保持 initializeLeagues() 创建的默认数据
                }
            }
        }
        
        if (data.tournaments) this.tournaments = data.tournaments;
        if (data.currentSeason) this.currentSeason = data.currentSeason;
        if (data.trainersState) {
            this.trainersState = data.trainersState;
        }
        if (data.playerTeam) {
            // 验证玩家的联赛类型是否兼容
            if (data.playerTeam.league && !['夏季联赛', '冬季联赛'].includes(data.playerTeam.league)) {
                // 不加载旧的不兼容的玩家数据
                return;
            }
            
            this.playerTeam = data.playerTeam;
            
            // 修复加载后的数据结构
            if (this.playerTeam.region && this.playerTeam.league) {
                // 确保地区存在
                if (!this.leagues[this.playerTeam.region]) {
                    this.playerTeam.region = null;
                    this.playerTeam.league = null;
                    return;
                }
                
                const league = this.leagues[this.playerTeam.region][this.playerTeam.league];
                
                if (league) {
                    const config = this.leagueConfig[this.playerTeam.league];
                    let needsRegenerate = false;
                    
                    // 检查队伍数量
                    if (league.teams) {
                        // 检查并修复AI队伍的动物数据
                        let needsAnimalFix = false;
                        league.teams.forEach(team => {
                            if (!team.isPlayer && (!team.registeredAnimals || team.registeredAnimals.length === 0)) {
                                team.registeredAnimals = this.generateAIAnimals(league.name);
                                needsAnimalFix = true;
                            }
                        });
                        
                        // 如果队伍数量不足，需要重新生成
                        if (league.teams.length < config.teams) {
                            needsRegenerate = true;
                            
                            const playerInTeams = league.teams.some(t => t.isPlayer);
                            if (!playerInTeams) {
                                league.teams = [this.playerTeam];
                            }
                            
                            this.fillLeagueWithAI(league);
                        }
                        
                        if (needsRegenerate) {
                            this.generateFixtures(league);
                        }
                    } else {
                        league.teams = [this.playerTeam];
                        this.fillLeagueWithAI(league);
                        this.generateFixtures(league);
                    }
                }
            }
        }
    }
    
    /**
     * 导出数据为 JSON 文件
     */
    exportToFile() {
        const data = {
            version: '2.0',
            leagues: this.leagues,
            tournaments: this.tournaments,
            currentSeason: this.currentSeason,
            playerTeam: this.playerTeam,
            trainersState: this.trainersState,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `league_data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 从文件导入数据
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.applyLoadedData(data);
                    await this.saveData();
                    resolve();
                } catch (error) {
                    console.error('导入数据失败:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
    
    /**
     * 清除所有数据
     */
    async clearAllData() {
        try {
            const db = await this.initDatabase();
            const transaction = db.transaction([LeagueSystem.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(LeagueSystem.STORE_NAME);
            
            store.clear();
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('清除数据失败:', error);
            throw error;
        }
    }
}

// 导出系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeagueSystem;
}
