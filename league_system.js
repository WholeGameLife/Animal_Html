 /**
 * 联赛系统 - 埃罗西卡大陆联赛管理系统
 * 包含五大地区（伊缇、拜尼、罗娜、罗兰、巴卡）的联赛管理
 * 使用 IndexedDB 存储数据以避免 localStorage 配额限制
 */

class LeagueSystem {
    // 数据库配置
    static DB_NAME = 'LeagueSystemDB';
    static DB_VERSION = 1;
    static STORE_NAME = 'leagueData';
    constructor() {
        // 五大地区
        this.regions = ['伊缇', '拜尼', '罗娜', '罗兰', '巴卡'];
        
        // 联赛等级配置
        this.leagueConfig = {
            '超级联赛': {
                teams: 20,
                rounds: 38,
                relegation: 3,      // 降级名额
                promotion: 0        // 升级名额（最高级）
            },
            '冠军联赛': {
                teams: 24,
                rounds: 46,
                relegation: 3,
                directPromotion: 2, // 直接升级名额
                playoffSpots: 4     // 附加赛名额（第3-6名）
            },
            '甲级联赛': {
                teams: 24,
                rounds: 46,
                relegation: 4,
                directPromotion: 2,
                playoffSpots: 4
            },
            '青年联赛': {
                teams: 64,
                groups: 16,         // 16个小组
                teamsPerGroup: 4,   // 每组4人
                groupQualifiers: 2, // 每组前2名晋级
                promotion: 4        // 最终前4名升级
            }
        };
        
        // 当前联赛数据结构
        this.leagues = this.initializeLeagues();
        
        // 赛季管理
        this.currentSeason = 1;
        this.currentRound = 0;
        
        // 玩家数据
        this.playerTeam = {
            region: null,
            league: null,
            registeredAnimals: [], // 登记的25只动物
            availableSwaps: 0,      // 可用的轮换次数
            lastSwapRound: 0,
            battleStats: {         // 战斗统计
                totalMatches: 0,    // 总比赛场次
                wins: 0,            // 胜场
                losses: 0,          // 负场
                opponentsDefeated: 0, // 击败对手数（5v5中赢的小局）
                timesDefeated: 0    // 被击败次数（5v5中输的小局）
            }
        };
    }
    
    /**
     * 初始化所有地区的联赛
     */
    initializeLeagues() {
        const leagues = {};
        
        this.regions.forEach(region => {
            leagues[region] = {
                '超级联赛': this.createLeague('超级联赛', region),
                '冠军联赛': this.createLeague('冠军联赛', region),
                '甲级联赛': this.createLeague('甲级联赛', region),
                '青年联赛': this.createLeague('青年联赛', region)
            };
        });
        
        return leagues;
    }
    
    /**
     * 创建单个联赛
     */
    createLeague(leagueName, region) {
        const config = this.leagueConfig[leagueName];
        
        const league = {
            name: leagueName,
            region: region,
            season: this.currentSeason,
            currentRound: 0,
            teams: [],
            standings: [],
            fixtures: [],
            results: [],
            completed: false
        };
        
        // 青年联赛需要初始化小组赛和淘汰赛结构
        if (leagueName === '青年联赛') {
            league.groupStage = {
                groups: [],
                standings: [],
                completed: false
            };
            league.knockoutFixtures = [];
            league.knockoutStage = {
                started: false,
                completed: false
            };
        }
        
        return league;
    }
    
    /**
     * 玩家加入联赛（主线模式：从青年联赛开始）
     */
    joinLeague(region, teamName) {
        if (!this.regions.includes(region)) {
            throw new Error('无效的地区');
        }
        
        // 玩家必须从青年联赛开始
        const leagueName = '青年联赛';
        
        this.playerTeam = {
            region: region,
            league: leagueName,
            teamName: teamName,
            registeredAnimals: [], // 青年联赛无需登记
            availableSwaps: 0,
            lastSwapRound: 0,
            isPlayer: true,
            careerHistory: [], // 职业生涯历史记录
            nextLeague: null   // 下赛季联赛
        };
        
        // 获取对应联赛
        const league = this.leagues[region][leagueName];
        
        // 清空原有队伍和赛程（如果有）
        league.teams = [];
        league.fixtures = [];
        league.knockoutFixtures = [];
        league.results = [];
        league.standings = [];
        league.completed = false;
        league.currentRound = 0;
        
        // 青年联赛必须初始化 groupStage（无论之前是否存在）
        league.groupStage = {
            groups: [],
            standings: [],
            completed: false
        };
        league.knockoutStage = {
            started: false,
            completed: false
        };
        
        // 将玩家队伍添加到对应联赛
        league.teams.push(this.playerTeam);
        
        // 生成AI队伍补充联赛（必须在生成赛程之前）
        this.fillLeagueWithAI(league);
        
        console.log(`青年联赛初始化完成 - 队伍数量: ${league.teams.length}, 配置要求: ${this.leagueConfig[leagueName].teams}`);
        
        // 验证队伍数量
        if (league.teams.length !== this.leagueConfig[leagueName].teams) {
            console.error(`队伍数量不匹配！当前: ${league.teams.length}, 需要: ${this.leagueConfig[leagueName].teams}`);
        }
        
        // 生成赛程
        this.generateFixtures(league);
        
        return this.playerTeam;
    }
    
    /**
     * 用AI队伍填充联赛
     */
    fillLeagueWithAI(league) {
        const config = this.leagueConfig[league.name];
        const currentTeamCount = league.teams.length;
        const neededTeams = config.teams - currentTeamCount;
        
        console.log(`填充AI队伍 - 当前队伍数: ${currentTeamCount}, 需要添加: ${neededTeams}`);
        
        if (neededTeams <= 0) {
            console.log('队伍已满，无需添加AI队伍');
            return;
        }
        
        for (let i = 0; i < neededTeams; i++) {
            const aiTeam = {
                region: league.region,
                league: league.name,
                teamName: `${league.region}_AI队伍${currentTeamCount + i}`,
                registeredAnimals: this.generateAIAnimals(league.name),
                isPlayer: false,
                strength: Math.random() * 100 + 50 // AI实力值
            };
            league.teams.push(aiTeam);
        }
        
        console.log(`AI队伍填充完成 - 最终队伍数: ${league.teams.length}`);
    }
    
    /**
     * 生成AI队伍的动物
     */
    generateAIAnimals(leagueName) {
        // 青年联赛虽然不需要"登记"，但AI仍需要有动物用于比赛
        const animalCount = leagueName === '青年联赛' ? 5 : 25;
        
        // 从localStorage读取动物池和技能池
        const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
        const skillPools = JSON.parse(localStorage.getItem('SKILL_POOLS') || '[]');
        const skillLibrary = JSON.parse(localStorage.getItem('SKILL_POOL') || '[]');
        
        const animals = [];
        
        for (let i = 0; i < animalCount; i++) {
            let animal;
            
            if (animalPool.length > 0) {
                // 从动物池中随机选择一个模板
                const template = animalPool[Math.floor(Math.random() * animalPool.length)];
                
                // 基于模板创建动物
                animal = {
                    id: `ai_animal_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
                    name: template.name || `AI动物${i + 1}`,
                    templateKey: template.key,
                    animalId: template.key,
                    hp: template.stamina || (Math.random() * 200 + 300),
                    attack: template.attack || (Math.random() * 50 + 50),
                    defense: template.defense || (Math.random() * 50 + 50),
                    agility: template.agility || (Math.random() * 30 + 20),
                    level: Math.floor(Math.random() * 20) + 10, // 10-30级
                    element: template.element || '默认',
                    combatSkills: { equipped: [], available: [] }
                };
                
                // 为AI动物配置4个技能
                if (template.skillPoolKey) {
                    const skillPool = skillPools.find(p => p.key === template.skillPoolKey);
                    if (skillPool && skillPool.skills && skillPool.skills.length > 0) {
                        // 随机选择4个技能
                        const shuffled = [...skillPool.skills].sort(() => Math.random() - 0.5);
                        const selectedSkills = shuffled.slice(0, Math.min(4, shuffled.length));
                        
                        selectedSkills.forEach(skillConfig => {
                            animal.combatSkills.equipped.push(skillConfig.skillKey);
                            animal.combatSkills.available.push(skillConfig.skillKey);
                        });
                    }
                }
            } else {
                // 如果没有动物池，使用默认生成
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
     * 生成联赛赛程（循环赛制）
     */
    generateFixtures(league) {
        const config = this.leagueConfig[league.name];
        const teams = league.teams;
        const fixtures = [];
        
        if (league.name === '青年联赛') {
            // 青年联赛使用淘汰赛制
            this.generateKnockoutFixtures(league);
            return;
        }
        
        // 标准联赛：每支队伍与其他队伍主客各一场
        const numTeams = teams.length;
        
        // 生成单循环赛程
        const singleRound = [];
        for (let i = 0; i < numTeams; i++) {
            for (let j = i + 1; j < numTeams; j++) {
                singleRound.push({
                    home: teams[i],
                    away: teams[j]
                });
            }
        }
        
        // 打乱顺序
        this.shuffleArray(singleRound);
        
        // 分配到轮次
        let round = 1;
        let matchesInRound = 0;
        let currentRoundFixtures = [];
        
        singleRound.forEach(match => {
            currentRoundFixtures.push({
                round: round,
                home: match.home,
                away: match.away,
                result: null
            });
            
            matchesInRound++;
            
            if (matchesInRound >= numTeams / 2) {
                fixtures.push(...currentRoundFixtures);
                currentRoundFixtures = [];
                matchesInRound = 0;
                round++;
            }
        });
        
        if (currentRoundFixtures.length > 0) {
            fixtures.push(...currentRoundFixtures);
        }
        
        // 第二循环（主客交换）
        const secondRound = JSON.parse(JSON.stringify(fixtures));
        secondRound.forEach(match => {
            const temp = match.home;
            match.home = match.away;
            match.away = temp;
            match.round += Math.ceil(config.rounds / 2);
        });
        
        league.fixtures = [...fixtures, ...secondRound];
    }
    
    /**
     * 生成青年联赛赛程（小组赛+淘汰赛）
     */
    generateKnockoutFixtures(league) {
        const teams = league.teams;
        const config = this.leagueConfig['青年联赛'];
        
        console.log(`生成赛程时的队伍数量: ${teams.length}`); // 调试信息
        
        if (teams.length < config.teams) {
            console.warn(`队伍数量不足！当前: ${teams.length}, 需要: ${config.teams}`);
        }
        
        const fixtures = [];
        
        // 第一阶段：小组赛
        // 将256支队伍分为32个小组，每组8支队伍
        const groups = [];
        for (let i = 0; i < config.groups; i++) {
            groups.push([]);
        }
        
        // 随机分配队伍到各组
        const shuffledTeams = [...teams];
        this.shuffleArray(shuffledTeams);
        shuffledTeams.forEach((team, index) => {
            const groupIndex = index % config.groups;
            groups[groupIndex].push(team);
        });
        
        console.log(`分组完成，共${groups.length}个小组`); // 调试信息
        
        // 为每个小组生成赛程（每队与组内其他队打1场）
        // 每组4人，合理分配到3轮，每轮每人打1场
        groups.forEach((groupTeams, groupIndex) => {
            // 4人小组的对阵安排（每轮每人打1场）
            // 第1轮：0 vs 1, 2 vs 3
            // 第2轮：0 vs 2, 1 vs 3
            // 第3轮：0 vs 3, 1 vs 2
            const roundPairings = [
                [[0, 1], [2, 3]],  // 第1轮
                [[0, 2], [1, 3]],  // 第2轮
                [[0, 3], [1, 2]]   // 第3轮
            ];
            
            roundPairings.forEach((roundMatches, roundIndex) => {
                const round = roundIndex + 1;
                roundMatches.forEach(([i, j]) => {
                    fixtures.push({
                        round: round,
                        stage: '小组赛',
                        groupIndex: groupIndex,
                        groupName: `第${groupIndex + 1}组`,
                        home: groupTeams[i],
                        away: groupTeams[j],
                        result: null
                    });
                });
            });
        });
        
        // 小组赛共3轮，每组4队，每队打3场（与其他3人各1场）
        // 每轮每队打1场，总共6场比赛
        league.groupStage = {
            groups: groups,
            standings: [],
            completed: false
        };
        
        league.fixtures = fixtures;
        league.knockoutFixtures = []; // 淘汰赛赛程稍后生成
        
        console.log(`小组赛初始化完成: ${groups.length}个小组，共${teams.length}支队伍`);
        console.log(`生成了${fixtures.length}场小组赛`);
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
     */
    playRound(region, leagueName) {
        const league = this.leagues[region][leagueName];
        
        if (league.completed) {
            return { error: '本赛季已结束' };
        }
        
        // 检查玩家是否有可用的动物（青年联赛特殊处理）
        if (this.playerTeam.isPlayer && league.name === '青年联赛') {
            if (!this.playerTeam.registeredAnimals || this.playerTeam.registeredAnimals.length === 0) {
                return { error: '请先在战斗准备界面选择5只参战动物！' };
            }
        }
        
        league.currentRound++;
        const currentRound = league.currentRound;
        
        // 检查是否可以轮换动物
        this.checkAnimalSwapAvailability(league);
        
        if (league.name === '青年联赛') {
            return this.playKnockoutRound(league);
        }
        
        // 获取本轮比赛
        const roundFixtures = league.fixtures.filter(f => f.round === currentRound);
        const results = [];
        
        roundFixtures.forEach(fixture => {
            const result = this.simulateMatch(fixture.home, fixture.away);
            fixture.result = result;
            results.push(result);
            
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
     * 进行青年联赛轮次（小组赛或淘汰赛）
     */
    playKnockoutRound(league) {
        const currentRound = league.currentRound;
        
        // 检查是否还在小组赛阶段
        if (!league.groupStage.completed) {
            return this.playGroupStageRound(league, currentRound);
        } else {
            return this.playKnockoutStageRound(league, currentRound);
        }
    }
    
    /**
     * 进行小组赛轮次
     */
    playGroupStageRound(league, currentRound) {
        const roundFixtures = league.fixtures.filter(f => f.round === currentRound && f.stage === '小组赛');
        const results = [];
        
        roundFixtures.forEach(fixture => {
            const result = this.simulateMatch(fixture.home, fixture.away);
            fixture.result = result;
            results.push(result);
            
            // 更新玩家战斗统计
            if (fixture.home.isPlayer || fixture.away.isPlayer) {
                this.updatePlayerBattleStats(fixture.home, fixture.away, result);
            }
        });
        
        // 检查小组赛是否全部完成
        const allGroupMatches = league.fixtures.filter(f => f.stage === '小组赛');
        const completedMatches = allGroupMatches.filter(f => f.result !== null);
        
        if (completedMatches.length === allGroupMatches.length) {
            // 小组赛结束，计算小组排名并生成淘汰赛
            this.finalizeGroupStage(league);
            league.groupStage.completed = true;
        }
        
        return {
            round: currentRound,
            stage: '小组赛',
            results: results,
            completed: false
        };
    }
    
    /**
     * 完成小组赛，计算排名并生成淘汰赛
     */
    finalizeGroupStage(league) {
        const config = this.leagueConfig['青年联赛'];
        const groupStandings = [];
        
        // 为每个小组计算积分榜
        for (let g = 0; g < config.groups; g++) {
            const groupTeams = league.groupStage.groups[g];
            const standings = {};
            
            // 初始化
            groupTeams.forEach(team => {
                standings[team.teamName] = {
                    team: team,
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    points: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0
                };
            });
            
            // 统计小组内比赛结果
            const groupFixtures = league.fixtures.filter(f => f.groupIndex === g && f.result);
            groupFixtures.forEach(fixture => {
                const homeTeam = fixture.home.teamName;
                const awayTeam = fixture.away.teamName;
                const result = fixture.result;
                
                standings[homeTeam].played++;
                standings[awayTeam].played++;
                standings[homeTeam].points += result.homePoints;
                standings[awayTeam].points += result.awayPoints;
                standings[homeTeam].goalsFor += result.homeWins;
                standings[homeTeam].goalsAgainst += result.awayWins;
                standings[awayTeam].goalsFor += result.awayWins;
                standings[awayTeam].goalsAgainst += result.homeWins;
                
                if (result.homePoints === 2) {
                    standings[homeTeam].won++;
                    standings[awayTeam].lost++;
                } else if (result.awayPoints === 2) {
                    standings[awayTeam].won++;
                    standings[homeTeam].lost++;
                } else {
                    standings[homeTeam].drawn++;
                    standings[awayTeam].drawn++;
                }
            });
            
            // 计算净胜球并排序
            const groupRanking = Object.values(standings).map(team => {
                team.goalDifference = team.goalsFor - team.goalsAgainst;
                return team;
            }).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                return b.goalsFor - a.goalsFor;
            });
            
            groupStandings.push({
                groupIndex: g,
                groupName: `第${g + 1}组`,
                standings: groupRanking
            });
        }
        
        league.groupStage.standings = groupStandings;
        
        // 只提取每组第1名，共16支队伍进入淘汰赛（16组×1）
        const qualifiedTeams = [];
        groupStandings.forEach(group => {
            qualifiedTeams.push(group.standings[0].team);  // 只取第1名
        });
        
        console.log(`小组赛结束，${qualifiedTeams.length}支队伍（各组第1名）晋级淘汰赛`);
        
        // 生成淘汰赛赛程
        this.generateKnockoutStage(league, qualifiedTeams);
    }
    
    /**
     * 生成淘汰赛阶段
     */
    generateKnockoutStage(league, qualifiedTeams) {
        const knockoutFixtures = [];
        let currentTeams = [...qualifiedTeams];
        let round = league.currentRound + 1;
        
        // 16支队伍开始淘汰赛
        let stage = '16进8';
        
        console.log(`生成淘汰赛：起始队伍数 = ${currentTeams.length}`);
        
        while (currentTeams.length > 1) {
            const roundFixtures = [];
            
            for (let i = 0; i < currentTeams.length; i += 2) {
                roundFixtures.push({
                    round: round,
                    stage: stage,
                    team1: currentTeams[i],
                    team2: currentTeams[i + 1],
                    matches: [],
                    winner: null
                });
            }
            
            knockoutFixtures.push(...roundFixtures);
            round++;
            
            // 更新阶段
            const remaining = currentTeams.length / 2;
            if (remaining === 8) stage = '8进4';
            else if (remaining === 4) stage = '半决赛';
            else if (remaining === 2) stage = '决赛';
            
            currentTeams = currentTeams.slice(0, remaining);
        }
        
        league.knockoutFixtures = knockoutFixtures;
        league.knockoutStage = {
            started: false,
            completed: false
        };
        
        console.log(`淘汰赛生成完成：${knockoutFixtures.length}场比赛`);
    }
    
    /**
     * 进行淘汰赛轮次
     */
    playKnockoutStageRound(league, currentRound) {
        const roundFixtures = league.knockoutFixtures.filter(f => f.round === currentRound);
        const results = [];
        
        roundFixtures.forEach(fixture => {
            // 每组打2场，可能打第3场
            fixture.matches = [];
            let team1Wins = 0;
            let team2Wins = 0;
            
            // 第一场
            const match1 = this.simulateMatch(fixture.team1, fixture.team2);
            fixture.matches.push(match1);
            if (match1.winner === fixture.team1) team1Wins++;
            else if (match1.winner === fixture.team2) team2Wins++;
            
            // 第二场
            const match2 = this.simulateMatch(fixture.team2, fixture.team1);
            fixture.matches.push(match2);
            if (match2.winner === fixture.team1) team1Wins++;
            else if (match2.winner === fixture.team2) team2Wins++;
            
            // 如果1:1，打第三场
            if (team1Wins === team2Wins) {
                const match3 = this.simulateMatch(fixture.team1, fixture.team2);
                fixture.matches.push(match3);
                if (match3.winner === fixture.team1) team1Wins++;
                else if (match3.winner === fixture.team2) team2Wins++;
            }
            
            // 确定胜者
            fixture.winner = team1Wins > team2Wins ? fixture.team1 : fixture.team2;
            results.push(fixture);
        });
        
        // 检查是否完成所有淘汰赛
        const allKnockoutFixtures = league.knockoutFixtures;
        const completedKnockoutMatches = allKnockoutFixtures.filter(f => f.winner !== null);
        
        if (completedKnockoutMatches.length === allKnockoutFixtures.length) {
            league.completed = true;
            this.processYouthLeagueEnd(league);
        }
        
        return {
            round: currentRound,
            stage: roundFixtures[0]?.stage || '',
            results: results,
            completed: league.completed
        };
    }
    
    /**
     * 生成淘汰赛阶段（生成完整树状框架，只有第一轮填入队伍）
     */
    generateKnockoutStage(league, qualifiedTeams) {
        const knockoutFixtures = [];
        let round = league.currentRound + 1;
        let teamCount = qualifiedTeams.length;
        let isFirstRound = true;
        
        // 根据队伍数量确定初始阶段
        let stage;
        if (teamCount === 16) {
            stage = '16进8';
        } else if (teamCount === 32) {
            stage = '32进16';
        } else if (teamCount === 64) {
            stage = '64进32';
        } else {
            stage = `${teamCount}强`;
        }
        
        console.log(`生成淘汰赛框架：起始队伍数 = ${teamCount}，初始阶段 = ${stage}`);
        
        // 生成完整的树状结构
        while (teamCount > 1) {
            const matchCount = teamCount / 2;
            
            for (let i = 0; i < matchCount; i++) {
                if (isFirstRound) {
                    // 第一轮：填入真实队伍
                    knockoutFixtures.push({
                        round: round,
                        stage: stage,
                        team1: qualifiedTeams[i * 2],
                        team2: qualifiedTeams[i * 2 + 1],
                        matches: [],
                        winner: null
                    });
                } else {
                    // 后续轮次：待定（TBD）
                    knockoutFixtures.push({
                        round: round,
                        stage: stage,
                        team1: null,  // 待定
                        team2: null,  // 待定
                        matches: [],
                        winner: null
                    });
                }
            }
            
            console.log(`  ${stage}: 生成${matchCount}场比赛${isFirstRound ? '' : '（待定）'}`);
            
            isFirstRound = false;
            round++;
            teamCount = matchCount;
            
            // 更新下一阶段
            if (teamCount === 32) stage = '32进16';
            else if (teamCount === 16) stage = '16进8';
            else if (teamCount === 8) stage = '8进4';
            else if (teamCount === 4) stage = '半决赛';
            else if (teamCount === 2) stage = '决赛';
            else stage = `${teamCount}强`;
        }
        
        league.knockoutFixtures = knockoutFixtures;
        league.knockoutStage = {
            started: false,
            completed: false
        };
        
        console.log(`淘汰赛框架生成完成：共${knockoutFixtures.length}场比赛（包括待定）`);
    }
    
    /**
     * 更新下一轮淘汰赛对阵（将本轮胜者填入下一轮）
     */
    updateNextKnockoutRound(league, completedRound) {
        // 获取本轮的所有比赛
        const completedMatches = league.knockoutFixtures.filter(f => f.round === completedRound && f.winner);
        
        if (completedMatches.length === 0) {
            return;
        }
        
        // 收集胜者
        const winners = completedMatches.map(f => f.winner);
        
        console.log(`更新下一轮对阵：${winners.length}位胜者`);
        
        // 找到下一轮的比赛（team1和team2都是null的）
        const nextRound = completedRound + 1;
        const nextRoundMatches = league.knockoutFixtures.filter(f => f.round === nextRound);
        
        if (nextRoundMatches.length > 0) {
            // 将胜者填入下一轮
            nextRoundMatches.forEach((match, index) => {
                match.team1 = winners[index * 2] || null;
                match.team2 = winners[index * 2 + 1] || null;
            });
            console.log(`下一轮对阵已更新：${nextRoundMatches.length}场比赛`);
        }
    }
    
    /**
     * 进行淘汰赛轮次
     * 注意：此函数仅用于AI模拟，玩家的淘汰赛结果由前端手动记录
     */
    playKnockoutStageRound(league, currentRound) {
        // 找到玩家参与的当前对决
        const roundFixtures = league.knockoutFixtures.filter(f => f.round === currentRound);
        const playerFixture = roundFixtures.find(f => f.team1?.isPlayer || f.team2?.isPlayer);
        
        if (!playerFixture) {
            // 没有玩家参与，直接模拟所有AI对局
            roundFixtures.forEach(fixture => {
                this.simulateKnockoutFixture(fixture);
            });
        } else {
            // 玩家参与的对决，不自动模拟，等待前端传入真实战斗结果
            // 只负责检查战绩和更新状态
            if (!playerFixture.matches) {
                playerFixture.matches = [];
            }
            
            // 计算当前战绩
            let team1Wins = playerFixture.matches.filter(m => m.winner === playerFixture.team1).length;
            let team2Wins = playerFixture.matches.filter(m => m.winner === playerFixture.team2).length;
            
            // 判断是否已决出胜负
            if (team1Wins >= 2 || team2Wins >= 2) {
                // 已决出胜负
                playerFixture.winner = team1Wins > team2Wins ? playerFixture.team1 : playerFixture.team2;
            }
            // 注意：不再自动模拟玩家的比赛，由前端processLeagueMatchResult手动添加
            
            // 模拟其他AI对局（仅当玩家对决已决出胜负时）
            if (playerFixture.winner) {
                roundFixtures.forEach(fixture => {
                    if (fixture !== playerFixture && !fixture.winner) {
                        this.simulateKnockoutFixture(fixture);
                    }
                });
            }
        }
        
        // 检查本轮是否全部完成
        const currentRoundComplete = roundFixtures.every(f => f.winner !== null);
        
        if (currentRoundComplete) {
            console.log(`第${currentRound}轮淘汰赛完成`);
            
            // 更新下一轮的对阵（填入胜者）
            this.updateNextKnockoutRound(league, currentRound);
            
            // 检查是否是决赛
            if (roundFixtures[0].stage === '决赛') {
                league.completed = true;
                this.processYouthLeagueEnd(league);
            }
        }
        
        return {
            round: currentRound,
            stage: roundFixtures[0]?.stage || '',
            results: roundFixtures,
            completed: league.completed,
            playerFixture: playerFixture
        };
    }
    
    /**
     * 模拟完整的淘汰赛对决（AI用，打2-3场）
     * 注意：需要在已有matches的基础上继续模拟，而不是从头开始
     */
    simulateKnockoutFixture(fixture) {
        // 检查队伍是否都已确定（不是null）
        if (!fixture.team1 || !fixture.team2) {
            console.log('跳过待定对局的模拟');
            return;
        }
        
        if (!fixture.matches) {
            fixture.matches = [];
        }
        
        // 计算已有战绩
        let team1Wins = fixture.matches.filter(m => m.winner === fixture.team1).length;
        let team2Wins = fixture.matches.filter(m => m.winner === fixture.team2).length;
        const matchesPlayed = fixture.matches.length;
        
        console.log(`模拟AI对局 - 当前: ${team1Wins}:${team2Wins}, 已打${matchesPlayed}场`);
        
        // 继续模拟直到决出胜负（最多3场）
        while (fixture.matches.length < 3 && team1Wins < 2 && team2Wins < 2) {
            const match = this.simulateMatch(fixture.team1, fixture.team2);
            fixture.matches.push(match);
            
            if (match.winner === fixture.team1) team1Wins++;
            else if (match.winner === fixture.team2) team2Wins++;
            
            console.log(`  第${fixture.matches.length}场: 战绩 ${team1Wins}:${team2Wins}`);
        }
        
        // 确定胜者
        fixture.winner = team1Wins > team2Wins ? fixture.team1 : fixture.team2;
        console.log(`模拟完成 - 最终: ${team1Wins}:${team2Wins}, 胜者: ${fixture.winner.teamName}`);
    }
    
    /**
     * 模拟单场比赛
     */
    simulateMatch(homeTeam, awayTeam) {
        // 5场1v1对战
        let homeWins = 0;
        let awayWins = 0;
        const battles = [];
        
        for (let i = 0; i < 5; i++) {
            const homeAnimal = this.selectAnimalForBattle(homeTeam, i);
            const awayAnimal = this.selectAnimalForBattle(awayTeam, i);
            
            const battleResult = this.simulateBattle(homeAnimal, awayAnimal);
            battles.push(battleResult);
            
            if (battleResult.winner === 'home') {
                homeWins++;
            } else if (battleResult.winner === 'away') {
                awayWins++;
            }
        }
        
        // 计算积分：胜者得3分，败者得0分，平局各得1分
        let homePoints = 0;
        let awayPoints = 0;
        let winner = null;
        
        if (homeWins > awayWins) {
            // 主队胜利
            homePoints = 3;
            awayPoints = 0;
            winner = homeTeam;
        } else if (awayWins > homeWins) {
            // 客队胜利
            homePoints = 0;
            awayPoints = 3;
            winner = awayTeam;
        } else {
            // 平局（5场中出现平局的可能性很小，但仍需处理）
            homePoints = 1;
            awayPoints = 1;
            winner = null;
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
            // 玩家需要手动选择，这里返回登记的动物
            // 检查是否有可用动物
            if (!team.registeredAnimals || team.registeredAnimals.length === 0) {
                console.error('玩家队伍没有可用的动物！');
                // 返回一个默认动物以防止崩溃
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
            // AI随机选择
            const animals = team.registeredAnimals;
            if (!animals || animals.length === 0) {
                console.error(`AI队伍 ${team.teamName} 没有可用的动物！`);
                // 返回一个默认动物以防止崩溃
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
     * 模拟1v1战斗（简化版本）
     */
    simulateBattle(animal1, animal2) {
        // 简化战斗逻辑
        const damage1 = (animal1.attack || 50) * (1 + Math.random() * 0.5);
        const damage2 = (animal2.attack || 50) * (1 + Math.random() * 0.5);
        
        const hp1 = (animal1.hp || 300) - damage2;
        const hp2 = (animal2.hp || 300) - damage1;
        
        let winner = null;
        if (hp1 > hp2) {
            winner = 'home';
        } else if (hp2 > hp1) {
            winner = 'away';
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
     * 更新积分榜（按轮次整体胜负计算积分）
     */
    updateStandings(league) {
        const standings = {};
        
        // 初始化所有队伍
        league.teams.forEach(team => {
            standings[team.teamName] = {
                team: team,
                played: 0,        // 已打轮次
                won: 0,           // 赢的轮次
                drawn: 0,         // 平局轮次
                lost: 0,          // 输的轮次
                points: 0,        // 积分（按轮次胜负计算）
                goalsFor: 0,      // 赢得的小局数
                goalsAgainst: 0,  // 输掉的小局数
                goalDifference: 0
            };
        });
        
        console.log('=== 积分榜更新开始 ===');
        console.log('总比赛结果数:', league.results.length);
        
        // 按轮次分组统计比赛结果
        const roundResults = {};
        league.results.forEach(result => {
            const round = result.round;
            if (!roundResults[round]) {
                roundResults[round] = [];
            }
            roundResults[round].push(result);
        });
        
        console.log('轮次分组结果:', Object.keys(roundResults).map(r => `第${r}轮: ${roundResults[r].length}场比赛`));
        
        // 遍历每一轮，统计该轮的胜负
        Object.keys(roundResults).forEach(round => {
            console.log(`\n--- 处理第${round}轮 ---`);
            const roundMatches = roundResults[round];
            const roundStats = {}; // 该轮每个队伍的统计
            
            // 初始化该轮的统计
            league.teams.forEach(team => {
                roundStats[team.teamName] = {
                    matchWins: 0,      // 该轮赢的场次
                    matchLosses: 0,    // 该轮输的场次
                    goalsFor: 0,
                    goalsAgainst: 0
                };
            });
            
            // 统计该轮每场比赛
            roundMatches.forEach(result => {
                const homeTeam = result.fixture.home.teamName;
                const awayTeam = result.fixture.away.teamName;
                const res = result.result;
                
                console.log(`  ${homeTeam} vs ${awayTeam}: ${res.homeWins}-${res.awayWins}`);
                
                // 累加小局胜负
                roundStats[homeTeam].goalsFor += res.homeWins;
                roundStats[homeTeam].goalsAgainst += res.awayWins;
                roundStats[awayTeam].goalsFor += res.awayWins;
                roundStats[awayTeam].goalsAgainst += res.homeWins;
                
                // 统计该场比赛的胜负
                if (res.homeWins > res.awayWins) {
                    roundStats[homeTeam].matchWins++;
                    roundStats[awayTeam].matchLosses++;
                } else if (res.awayWins > res.homeWins) {
                    roundStats[awayTeam].matchWins++;
                    roundStats[homeTeam].matchLosses++;
                }
            });
            
            console.log(`  该轮统计结果:`);
            // 判断该轮的胜负并更新积分
            Object.keys(roundStats).forEach(teamName => {
                const stat = roundStats[teamName];
                
                // 如果该队本轮有比赛（matchWins + matchLosses > 0）
                if (stat.matchWins + stat.matchLosses > 0) {
                    standings[teamName].played++; // 轮次+1
                    standings[teamName].goalsFor += stat.goalsFor;
                    standings[teamName].goalsAgainst += stat.goalsAgainst;
                    
                    // 判断该轮胜负：赢的场次多则该轮获胜
                    if (stat.matchWins > stat.matchLosses) {
                        standings[teamName].won++;      // 赢的轮次+1
                        standings[teamName].points += 3;
                        console.log(`    ${teamName}: 赢${stat.matchWins}场 输${stat.matchLosses}场 → 该轮获胜 +3分`);
                    } else if (stat.matchLosses > stat.matchWins) {
                        standings[teamName].lost++;     // 输的轮次+1
                        standings[teamName].points += 0;
                        console.log(`    ${teamName}: 赢${stat.matchWins}场 输${stat.matchLosses}场 → 该轮失败 +0分`);
                    } else {
                        // 平局（该轮赢的场次 = 输的场次）
                        standings[teamName].drawn++;    // 平局轮次+1
                        standings[teamName].points += 1;
                        console.log(`    ${teamName}: 赢${stat.matchWins}场 输${stat.matchLosses}场 → 该轮平局 +1分`);
                    }
                }
            });
        });
        
        console.log('\n=== 最终积分榜（前5名）===');
        const topTeams = Object.values(standings).sort((a, b) => b.points - a.points).slice(0, 5);
        topTeams.forEach(team => {
            console.log(`${team.team.teamName}: 轮次${team.played}, 胜${team.won}, 负${team.lost}, 积分${team.points}`);
        });
        
        // 计算净胜球（实际上是净胜小局数）
        Object.values(standings).forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });
        
        // 排序
        league.standings = Object.values(standings).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    }
    
    /**
     * 检查动物轮换可用性
     */
    checkAnimalSwapAvailability(league) {
        const currentRound = league.currentRound;
        
        // 每3轮可以轮换2个动物
        if (currentRound % 3 === 0 && currentRound !== this.playerTeam.lastSwapRound) {
            this.playerTeam.availableSwaps = 2;
            this.playerTeam.lastSwapRound = currentRound;
        }
        
        // 第19轮后第20轮前可以轮换12个动物
        if (currentRound === 19) {
            this.playerTeam.availableSwaps = 12;
            this.playerTeam.lastSwapRound = currentRound;
        }
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
        
        // 移除动物
        animalsToRemove.forEach(animal => {
            const index = this.playerTeam.registeredAnimals.findIndex(a => a.id === animal.id);
            if (index !== -1) {
                this.playerTeam.registeredAnimals.splice(index, 1);
            }
        });
        
        // 添加动物
        animalsToAdd.forEach(animal => {
            this.playerTeam.registeredAnimals.push(animal);
        });
        
        this.playerTeam.availableSwaps -= animalsToRemove.length;
        
        return this.playerTeam.registeredAnimals;
    }
    
    /**
     * 处理赛季结束
     */
    processSeasonEnd(league) {
        const standings = league.standings;
        const config = this.leagueConfig[league.name];
        
        // 处理积分相同的情况 - 附加赛
        this.handlePlayoffs(league, standings);
        
        // 标记升降级队伍
        if (league.name === '超级联赛') {
            // 最后3名降级
            for (let i = standings.length - 3; i < standings.length; i++) {
                standings[i].relegated = true;
                standings[i].nextLeague = '冠军联赛';
            }
        } else if (league.name === '冠军联赛' || league.name === '甲级联赛') {
            // 前2名直接升级
            for (let i = 0; i < 2; i++) {
                standings[i].promoted = true;
                standings[i].nextLeague = league.name === '冠军联赛' ? '超级联赛' : '冠军联赛';
            }
            
            // 第3-6名打附加赛
            for (let i = 2; i < 6; i++) {
                standings[i].playoff = true;
            }
            
            // 最后几名降级
            const relegationStart = standings.length - config.relegation;
            for (let i = relegationStart; i < standings.length; i++) {
                standings[i].relegated = true;
                standings[i].nextLeague = league.name === '冠军联赛' ? '甲级联赛' : '青年联赛';
            }
        }
        
        league.seasonSummary = {
            champion: standings[0],
            promoted: standings.filter(s => s.promoted),
            playoff: standings.filter(s => s.playoff),
            relegated: standings.filter(s => s.relegated)
        };
        
        // 检查玩家是否需要升降级
        this.checkPlayerPromotion(league);
    }
    
    /**
     * 检查玩家升降级情况
     */
    checkPlayerPromotion(league) {
        if (!this.playerTeam || !this.playerTeam.isPlayer) {
            return;
        }
        
        // 找到玩家在积分榜的位置
        const playerStanding = league.standings.find(s => s.team.isPlayer);
        if (!playerStanding) {
            return;
        }
        
        const rank = league.standings.indexOf(playerStanding) + 1;
        
        // 记录本赛季成绩
        this.playerTeam.careerHistory.push({
            season: league.season,
            league: league.name,
            region: league.region,
            rank: rank,
            points: playerStanding.points,
            promoted: playerStanding.promoted || false,
            relegated: playerStanding.relegated || false
        });
        
        // 更新玩家队伍的联赛等级
        if (playerStanding.promoted) {
            this.playerTeam.nextLeague = playerStanding.nextLeague;
        } else if (playerStanding.relegated) {
            this.playerTeam.nextLeague = playerStanding.nextLeague;
        } else {
            this.playerTeam.nextLeague = league.name; // 保持原联赛
        }
    }
    
    /**
     * 处理青年联赛结束
     */
    processYouthLeagueEnd(league) {
        // 找出前4名（从淘汰赛结果中）
        const finalists = [];
        const finalFixture = league.knockoutFixtures.find(f => f.stage === '决赛');
        const semifinalFixtures = league.knockoutFixtures.filter(f => f.stage === '半决赛');
        
        if (finalFixture && finalFixture.winner) {
            finalists.push({ team: finalFixture.winner, rank: 1 });
            
            // 决赛失败者是第2名
            const runnerUp = finalFixture.team1.teamName === finalFixture.winner.teamName
                ? finalFixture.team2 : finalFixture.team1;
            finalists.push({ team: runnerUp, rank: 2 });
        }
        
        // 半决赛失败者是第3、4名
        semifinalFixtures.forEach(fixture => {
            if (fixture.winner) {
                const loser = fixture.team1.teamName === fixture.winner.teamName
                    ? fixture.team2 : fixture.team1;
                finalists.push({ team: loser, rank: finalists.length + 1 });
            }
        });
        
        // 标记升级
        finalists.slice(0, 4).forEach(item => {
            item.team.promoted = true;
            item.team.nextLeague = '甲级联赛';
            item.team.finalRank = item.rank;
        });
        
        league.seasonSummary = {
            promoted: finalists.slice(0, 4).map(f => f.team)
        };
        
        // 检查玩家是否晋级
        this.checkPlayerYouthLeaguePromotion(league, finalists);
    }
    
    /**
     * 检查玩家青年联赛晋级情况
     */
    checkPlayerYouthLeaguePromotion(league, finalists) {
        if (!this.playerTeam || !this.playerTeam.isPlayer) {
            return;
        }
        
        const playerResult = finalists.find(f => f.team.isPlayer);
        
        if (playerResult && playerResult.rank <= 4) {
            // 玩家晋级到甲级联赛
            this.playerTeam.nextLeague = '甲级联赛';
            this.playerTeam.careerHistory.push({
                season: league.season,
                league: league.name,
                region: league.region,
                rank: playerResult.rank,
                promoted: true
            });
        } else {
            // 玩家未能晋级，需要重新参加青年联赛
            this.playerTeam.nextLeague = '青年联赛';
            this.playerTeam.careerHistory.push({
                season: league.season,
                league: league.name,
                region: league.region,
                rank: 'Out',
                promoted: false
            });
        }
    }
    
    /**
     * 处理附加赛
     */
    handlePlayoffs(league, standings) {
        if (league.name !== '冠军联赛' && league.name !== '甲级联赛') {
            return;
        }
        
        // 第3名vs第6名，第4名vs第5名
        const playoff1 = this.simulateMatch(standings[2].team, standings[5].team);
        const playoff2 = this.simulateMatch(standings[3].team, standings[4].team);
        
        // 决赛
        const finalist1 = playoff1.winner;
        const finalist2 = playoff2.winner;
        const final = this.simulateMatch(finalist1, finalist2);
        
        // 决赛胜者升级
        final.winner.promoted = true;
        final.winner.nextLeague = league.name === '冠军联赛' ? '超级联赛' : '冠军联赛';
        
        league.playoffResults = {
            semifinal1: playoff1,
            semifinal2: playoff2,
            final: final,
            winner: final.winner
        };
    }
    
    /**
     * 开始新赛季（主线模式）
     */
    startNewSeason() {
        if (!this.playerTeam || !this.playerTeam.region) {
            throw new Error('玩家未加入联赛');
        }
        
        this.currentSeason++;
        
        // 获取玩家的下一个联赛等级
        const nextLeague = this.playerTeam.nextLeague || this.playerTeam.league;
        const region = this.playerTeam.region;
        
        // 更新玩家队伍信息
        this.playerTeam.league = nextLeague;
        this.playerTeam.availableSwaps = 0;
        this.playerTeam.lastSwapRound = 0;
        
        // 如果升级到非青年联赛且尚未登记动物，需要提示玩家登记
        if (nextLeague !== '青年联赛' && this.playerTeam.registeredAnimals.length === 0) {
            this.playerTeam.needsRegistration = true;
        }
        
        // 获取或创建新联赛
        const league = this.leagues[region][nextLeague];
        
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
        
        return {
            league: league,
            previousLeague: this.playerTeam.careerHistory[this.playerTeam.careerHistory.length - 1],
            needsRegistration: this.playerTeam.needsRegistration || false
        };
    }
    
    /**
     * 登记动物名单（升级后需要）
     */
    registerAnimals(animals) {
        if (!this.playerTeam) {
            throw new Error('玩家未加入联赛');
        }
        
        if (this.playerTeam.league === '青年联赛') {
            throw new Error('青年联赛无需登记动物');
        }
        
        if (animals.length !== 25) {
            throw new Error('需要登记25只动物');
        }
        
        this.playerTeam.registeredAnimals = [...animals];
        this.playerTeam.needsRegistration = false;
        
        return true;
    }
    
    /**
     * 获取联赛信息
     */
    getLeagueInfo(region, leagueName) {
        return this.leagues[region][leagueName];
    }
    
    /**
     * 获取玩家队伍信息
     */
    getPlayerTeam() {
        return this.playerTeam;
    }
    
    /**
     * 更新玩家战斗统计
     */
    updatePlayerBattleStats(home, away, result) {
        if (!this.playerTeam || !this.playerTeam.battleStats) {
            return;
        }
        
        const isPlayerHome = home.isPlayer;
        const stats = this.playerTeam.battleStats;
        
        // 总比赛场次
        stats.totalMatches++;
        
        if (isPlayerHome) {
            // 玩家是主队
            if (result.homeWins > result.awayWins) {
                stats.wins++;
            } else if (result.homeWins < result.awayWins) {
                stats.losses++;
            }
            stats.opponentsDefeated += result.homeWins;
            stats.timesDefeated += result.awayWins;
        } else {
            // 玩家是客队
            if (result.awayWins > result.homeWins) {
                stats.wins++;
            } else if (result.awayWins < result.homeWins) {
                stats.losses++;
            }
            stats.opponentsDefeated += result.awayWins;
            stats.timesDefeated += result.homeWins;
        }
    }
    
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
                currentSeason: this.currentSeason,
                playerTeam: this.playerTeam,
                timestamp: Date.now()
            };
            
            store.put(data, 'current');
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('✅ 联赛数据已保存到 IndexedDB');
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
                        console.log('✅ 从 IndexedDB 加载联赛数据成功');
                        resolve(true);
                    } else {
                        console.log('ℹ️ IndexedDB 中没有保存的数据，将使用初始数据');
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
        if (data.leagues) this.leagues = data.leagues;
        if (data.currentSeason) this.currentSeason = data.currentSeason;
        if (data.playerTeam) {
            this.playerTeam = data.playerTeam;
            
            // 修复加载后的数据结构
            if (this.playerTeam.region && this.playerTeam.league) {
                const league = this.leagues[this.playerTeam.region][this.playerTeam.league];
                
                if (league) {
                    const config = this.leagueConfig[this.playerTeam.league];
                    let needsRegenerate = false;
                    
                    // 确保青年联赛有 groupStage 结构
                    if (this.playerTeam.league === '青年联赛') {
                        if (!league.groupStage) {
                            console.warn('青年联赛缺少 groupStage，正在初始化...');
                            league.groupStage = {
                                groups: [],
                                standings: [],
                                completed: false
                            };
                            needsRegenerate = true;
                        } else if (!league.groupStage.groups || league.groupStage.groups.length === 0) {
                            console.warn('青年联赛 groupStage.groups 为空，需要重新生成');
                            needsRegenerate = true;
                        }
                        
                        if (!league.knockoutFixtures) {
                            league.knockoutFixtures = [];
                        }
                        if (!league.knockoutStage) {
                            league.knockoutStage = {
                                started: false,
                                completed: false
                            };
                        }
                    }
                    
                    // 检查队伍数量
                    if (league.teams) {
                        console.log(`加载数据 - 联赛: ${this.playerTeam.league}, 队伍数: ${league.teams.length}, 配置要求: ${config.teams}`);
                        
                        // 检查并修复AI队伍的动物数据
                        let needsAnimalFix = false;
                        league.teams.forEach(team => {
                            if (!team.isPlayer && (!team.registeredAnimals || team.registeredAnimals.length === 0)) {
                                console.log(`修复AI队伍 ${team.teamName} 的动物数据`);
                                team.registeredAnimals = this.generateAIAnimals(league.name);
                                needsAnimalFix = true;
                            }
                        });
                        
                        if (needsAnimalFix) {
                            console.log('✅ 已为所有AI队伍补充动物数据');
                        }
                        
                        // 如果队伍数量不足，需要重新生成
                        if (league.teams.length < config.teams) {
                            console.warn(`队伍数量不足，重新生成AI队伍和赛程`);
                            needsRegenerate = true;
                            
                            // 确保玩家队伍在teams数组中
                            const playerInTeams = league.teams.some(t => t.isPlayer);
                            if (!playerInTeams) {
                                league.teams = [this.playerTeam];
                            }
                            
                            // 补充AI队伍
                            this.fillLeagueWithAI(league);
                        }
                        
                        // 如果需要重新生成赛程
                        if (needsRegenerate) {
                            console.log('重新生成完整赛程和分组');
                            this.generateFixtures(league);
                        }
                    } else {
                        // 没有队伍数据，完全重新初始化
                        console.warn('联赛没有队伍数据，完全重新初始化');
                        league.teams = [this.playerTeam];
                        this.fillLeagueWithAI(league);
                        this.generateFixtures(league);
                    }
                }
            }
        }
    }
    
    /**
     * 导出数据为 JSON 文件（供用户下载）
     */
    exportToFile() {
            const data = {
                version: '1.0',
                leagues: this.leagues,
                currentSeason: this.currentSeason,
                playerTeam: this.playerTeam,
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
            
        console.log('✅ 数据已导出为文件');
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
                        console.log('✅ 数据导入成功');
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
                        console.log('✅ 所有数据已清除');
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