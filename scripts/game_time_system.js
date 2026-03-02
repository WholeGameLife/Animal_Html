/**
 * 游戏时间系统 - 埃罗西卡大陆时间管理系统
 * 
 * 功能：
 * - 一年52周的时间循环系统
 * - 四季划分（春夏秋冬），每季13周
 * - 联赛时间管理（夏季联赛、冬季联赛）
 * - 每周进行2轮比赛
 * - 自动推进和事件触发
 */

class GameTimeSystem {
    // 常量定义
    static WEEKS_PER_YEAR = 52;           // 一年52周
    static WEEKS_PER_SEASON = 13;         // 每季13周
    static DAYS_PER_WEEK = 7;             // 每周7天
    static HOURS_PER_DAY = 24;            // 每天24小时
    static LEAGUE_MATCH_DAYS = [1, 4];    // 联赛比赛日：周一(1)和周四(4)
    static TOURNAMENT_MATCH_DAY = 6;      // 大陆赛事比赛日：周六(6)
    static DB_NAME = 'GameTimeSystemDB';
    static DB_VERSION = 1;
    static STORE_NAME = 'timeData';
    
    // 星期名称
    static DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
    
    // 自动推进常量
    static REAL_TIME_PER_GAME_DAY = 6 * 60 * 1000;  // 现实6分钟 = 游戏1天 (毫秒)
    static REAL_TIME_PER_GAME_HOUR = 15 * 1000;     // 现实15秒 = 游戏1小时 (6分钟/24小时)

    constructor() {
        // 当前时间状态
        this.currentYear = 1;              // 当前年份（游戏年）
        this.currentWeek = 1;              // 当前周数（1-52）
        this.currentDay = 1;               // 当前星期几（1-7，1=周一）
        this.currentHour = 6;              // 当前小时（0-23，默认早上6点）
        this.currentMinute = 0;            // 当前分钟（0-59）
        this.currentSeason = '春季';       // 当前季节
        this.currentWeather = '晴';        // 当前天气
        
        // 天气系统配置
        this.weatherTypes = [
            { name: '晴', icon: '☀️', probability: 0.40 },
            { name: '阴', icon: '☁️', probability: 0.25 },
            { name: '小雨', icon: '🌦️', probability: 0.15 },
            { name: '中雨', icon: '🌧️', probability: 0.10 },
            { name: '暴雨', icon: '⛈️', probability: 0.06 },
            { name: '台风', icon: '🌀', probability: 0.03 },
            { name: '雷暴', icon: '⚡', probability: 0.01 }
        ];
        
        // 自动推进相关
        this.autoAdvanceEnabled = true;    // 是否启用自动推进
        this.lastAdvanceTime = Date.now(); // 上次推进的时间戳
        this.autoAdvanceTimer = null;      // 自动推进定时器
        
        // 季节定义
        this.seasons = {
            '春季': { start: 1, end: 13, leagues: [] },                    // 第1-13周
            '夏季': { start: 14, end: 26, leagues: ['夏季联赛'] },         // 第14-26周（夏季初开赛）
            '秋季': { start: 27, end: 39, leagues: [] },                   // 第27-39周
            '冬季': { start: 40, end: 52, leagues: ['冬季联赛'] }          // 第40-52周（冬季初开赛）
        };
        
        // 联赛配置
        this.leagueSchedules = {
            '夏季联赛': {
                startWeek: 14,              // 夏季初（第14周）开赛
                duration: 19,               // 持续19周（38轮，每周2轮）
                totalRounds: 38,            // 总共38轮
                endWeek: 32,                // 第32周结束（14 + 19 - 1）
                season: '夏季',
                description: '夏季联赛在夏季初开赛，历时19周，每周进行2轮比赛，共38轮'
            },
            '冬季联赛': {
                startWeek: 40,              // 冬季初（第40周）开赛
                duration: 19,               // 持续19周
                totalRounds: 38,
                endWeek: 58,                // 跨年到下一年第6周（40 + 19 - 1 = 58）
                season: '冬季',
                description: '冬季联赛在冬季初开赛，历时19周，每周进行2轮比赛，共38轮'
            }
        };
        
        // 活跃联赛记录
        this.activeLeagues = {
            '夏季联赛': { active: false, startWeek: null, currentRound: 0 },
            '冬季联赛': { active: false, startWeek: null, currentRound: 0 }
        };
        
        // 事件监听器
        this.eventListeners = {
            onTimeUpdate: [],
            onDayChange: [],
            onWeekChange: [],
            onSeasonChange: [],
            onYearChange: [],
            onLeagueStart: [],
            onLeagueEnd: [],
            onRoundComplete: [],
            onTournamentRoundComplete: []
        };
        
        // 时间暂停状态
        this.isPaused = false;
        
        // 初始化当前季节
        this.updateCurrentSeason();
        
        // 启动自动推进
        this.startAutoAdvance();
        
        console.log('🕐 游戏时间系统初始化完成 - 自动推进已启用 (现实6分钟 = 游戏1天)');
    }
    
    /**
     * 启动自动时间推进
     */
    startAutoAdvance() {
        if (this.autoAdvanceTimer) {
            clearInterval(this.autoAdvanceTimer);
        }
        
        // 每秒检查一次是否需要推进时间
        this.autoAdvanceTimer = setInterval(() => {
            if (!this.isPaused && this.autoAdvanceEnabled) {
                const now = Date.now();
                const elapsed = now - this.lastAdvanceTime;
                
                // 计算应该推进多少分钟 (现实15秒 = 游戏1小时 = 60分钟)
                const minutesPerSecond = 60 / 15; // 每秒推进4分钟
                const minutesToAdvance = Math.floor(elapsed / 250); // 每250ms推进1分钟
                
                if (minutesToAdvance > 0) {
                    this.lastAdvanceTime = now;
                    
                    // 推进分钟
                    for (let i = 0; i < minutesToAdvance; i++) {
                        this.advanceMinute();
                    }
                    
                    // 触发时间更新事件
                    this.triggerEvent('onTimeUpdate', this.getCurrentTime());
                }
            }
        }, 250); // 每250ms检查一次，确保流畅
        
        console.log('⏰ 自动时间推进已启动 (现实1秒 = 游戏4分钟)');
    }
    
    /**
     * 推进一分钟
     */
    advanceMinute() {
        this.currentMinute++;
        
        // 检查是否到下一小时
        if (this.currentMinute >= 60) {
            this.currentMinute = 0;
            this.currentHour++;
            
            // 检查是否到下一天
            if (this.currentHour >= GameTimeSystem.HOURS_PER_DAY) {
                this.currentHour = 0;
                const result = this.advanceDay();
                
                // 如果是联赛比赛日，自动推进比赛
                if (result.success && result.isLeagueMatchDay) {
                    const matchResult = this.advanceRound();
                    if (matchResult.success) {
                        console.log(`⚽ 自动进行联赛比赛 - ${result.dayName}`);
                    }
                }
                
                // 如果是大陆赛事比赛日，自动推进比赛
                if (result.success && result.isTournamentMatchDay) {
                    const matchResult = this.advanceTournamentRound();
                    if (matchResult.success) {
                        console.log(`🏆 自动进行大陆赛事比赛`);
                    }
                }
                
                // 自动保存数据（每天保存一次）
                this.saveData().catch(err => console.error('自动保存时间数据失败:', err));
            }
        }
    }
    
    /**
     * 停止自动时间推进
     */
    stopAutoAdvance() {
        if (this.autoAdvanceTimer) {
            clearInterval(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
            console.log('⏸️ 自动时间推进已停止');
        }
    }
    
    /**
     * 设置自动推进开关
     */
    setAutoAdvance(enabled) {
        this.autoAdvanceEnabled = enabled;
        console.log(enabled ? '✅ 自动时间推进已启用' : '❌ 自动时间推进已禁用');
        return this.autoAdvanceEnabled;
    }
    
    /**
     * 获取距离下次推进的剩余时间（毫秒）
     */
    getTimeUntilNextAdvance() {
        if (this.isPaused || !this.autoAdvanceEnabled) {
            return -1; // 返回-1表示暂停或禁用
        }
        
        const now = Date.now();
        const elapsed = now - this.lastAdvanceTime;
        const remaining = GameTimeSystem.REAL_TIME_PER_GAME_DAY - elapsed;
        return Math.max(0, remaining);
    }

    /**
     * 根据当前周数更新当前季节
     */
    updateCurrentSeason() {
        for (const [seasonName, seasonData] of Object.entries(this.seasons)) {
            if (this.currentWeek >= seasonData.start && this.currentWeek <= seasonData.end) {
                if (this.currentSeason !== seasonName) {
                    const oldSeason = this.currentSeason;
                    this.currentSeason = seasonName;
                    this.triggerEvent('onSeasonChange', { oldSeason, newSeason: seasonName, year: this.currentYear, week: this.currentWeek });
                }
                break;
            }
        }
    }

    /**
     * 获取当前时间信息
     */
    getCurrentTime() {
        // currentDay是1-7 (周一到周日)，数组索引需要减1，但周日是0所以特殊处理
        // currentDay: 1=周一, 2=周二, ..., 7=周日
        const dayIndex = this.currentDay === 7 ? 0 : this.currentDay; // 周日映射到索引0
        const dayName = GameTimeSystem.DAY_NAMES[dayIndex];
        const isLeagueMatchDay = GameTimeSystem.LEAGUE_MATCH_DAYS.includes(this.currentDay);
        const isTournamentMatchDay = this.currentDay === GameTimeSystem.TOURNAMENT_MATCH_DAY;
        
        let matchDayText = '';
        if (isLeagueMatchDay) {
            matchDayText = ' 🏟️ 联赛日';
        } else if (isTournamentMatchDay) {
            matchDayText = ' 🏆 大陆赛日';
        }
        
        // 获取天气信息
        const weatherInfo = this.weatherTypes.find(w => w.name === this.currentWeather);
        const weatherIcon = weatherInfo ? weatherInfo.icon : '☀️';
        
        // 格式化时间字符串
        const hourStr = this.currentHour.toString().padStart(2, '0');
        const minuteStr = this.currentMinute.toString().padStart(2, '0');
        const timeStr = `${hourStr}:${minuteStr}`;
        
        return {
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay,
            hour: this.currentHour,
            minute: this.currentMinute,
            season: this.currentSeason,
            weather: this.currentWeather,
            weatherIcon: weatherIcon,
            dayName: dayName,
            timeString: timeStr,
            isLeagueMatchDay: isLeagueMatchDay,
            isTournamentMatchDay: isTournamentMatchDay,
            displayText: `第${this.currentYear}年 ${this.currentSeason} 第${this.currentWeek}周`,
            dayDisplayText: `星期${dayName}${matchDayText}`,
            weatherDisplay: `${weatherIcon} ${this.currentWeather}`,
            fullDisplayText: `第${this.currentYear}年 ${this.currentSeason} 第${this.currentWeek}周 星期${dayName} ${timeStr} ${weatherIcon}`,
            isPaused: this.isPaused
        };
    }
    
    /**
     * 生成随机天气
     */
    generateRandomWeather() {
        const rand = Math.random();
        let cumulative = 0;
        
        for (const weather of this.weatherTypes) {
            cumulative += weather.probability;
            if (rand <= cumulative) {
                return weather.name;
            }
        }
        
        return '晴'; // 默认晴天
    }

    /**
     * 检查指定联赛是否可以开赛
     */
    canLeagueStart(leagueName) {
        const schedule = this.leagueSchedules[leagueName];
        if (!schedule) {
            return { canStart: false, reason: '未知的联赛类型' };
        }

        // 检查是否在正确的季节
        if (this.currentSeason !== schedule.season) {
            return { 
                canStart: false, 
                reason: `${leagueName}只能在${schedule.season}开赛，当前是${this.currentSeason}` 
            };
        }

        // 检查是否在开赛周
        const normalizedWeek = this.currentWeek > 52 ? this.currentWeek - 52 : this.currentWeek;
        if (normalizedWeek !== schedule.startWeek) {
            return { 
                canStart: false, 
                reason: `${leagueName}在第${schedule.startWeek}周开赛，当前是第${normalizedWeek}周` 
            };
        }

        // 检查是否已经开赛
        if (this.activeLeagues[leagueName].active) {
            return { 
                canStart: false, 
                reason: `${leagueName}已经在进行中` 
            };
        }

        return { canStart: true, reason: '可以开赛' };
    }

    /**
     * 检查联赛是否在进行中
     */
    isLeagueActive(leagueName) {
        return this.activeLeagues[leagueName]?.active || false;
    }

    /**
     * 开始联赛
     */
    startLeague(leagueName) {
        const check = this.canLeagueStart(leagueName);
        if (!check.canStart) {
            throw new Error(check.reason);
        }

        this.activeLeagues[leagueName] = {
            active: true,
            startWeek: this.currentWeek,
            startYear: this.currentYear,
            currentRound: 0
        };

        this.triggerEvent('onLeagueStart', {
            leagueName,
            week: this.currentWeek,
            year: this.currentYear,
            season: this.currentSeason
        });

        console.log(`📢 ${leagueName}开赛！第${this.currentYear}年第${this.currentWeek}周`);
        return true;
    }

    /**
     * 结束联赛
     */
    endLeague(leagueName) {
        if (!this.activeLeagues[leagueName].active) {
            console.warn(`${leagueName}尚未开始，无法结束`);
            return false;
        }

        this.activeLeagues[leagueName].active = false;
        
        this.triggerEvent('onLeagueEnd', {
            leagueName,
            week: this.currentWeek,
            year: this.currentYear,
            season: this.currentSeason,
            totalRounds: this.activeLeagues[leagueName].currentRound
        });

        console.log(`🏆 ${leagueName}结束！共进行${this.activeLeagues[leagueName].currentRound}轮`);
        return true;
    }

    /**
     * 推进一轮联赛比赛（仅在联赛比赛日可进行）
     */
    advanceRound() {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }

        // 检查是否是联赛比赛日
        const isLeagueMatchDay = GameTimeSystem.LEAGUE_MATCH_DAYS.includes(this.currentDay);
        if (!isLeagueMatchDay) {
            const dayName = GameTimeSystem.DAY_NAMES[this.currentDay];
            return { 
                success: false, 
                reason: `今天是星期${dayName}，不是联赛比赛日。\n联赛比赛日为周一和周四。\n请推进时间到周一或周四。`
            };
        }

        // 更新所有活跃联赛的轮次
        for (const [leagueName, leagueData] of Object.entries(this.activeLeagues)) {
            if (leagueData.active) {
                leagueData.currentRound++;
                
                // 检查是否达到总轮数（38轮）
                const schedule = this.leagueSchedules[leagueName];
                if (leagueData.currentRound >= schedule.totalRounds) {
                    this.endLeague(leagueName);
                }
            }
        }

        this.triggerEvent('onRoundComplete', {
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay,
            activeLeagues: this.getActiveLeagueNames()
        });

        const dayName = GameTimeSystem.DAY_NAMES[this.currentDay];
        console.log(`⚽ 进行联赛 - 第${this.currentWeek}周 星期${dayName}`);

        return {
            success: true,
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay,
            dayName: dayName,
            activeLeagues: this.getActiveLeagueNames(),
            matchType: 'league'
        };
    }
    
    /**
     * 推进一场大陆赛事比赛（仅在周六可进行）
     */
    advanceTournamentRound() {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }

        // 检查是否是大陆赛事比赛日（周六）
        if (this.currentDay !== GameTimeSystem.TOURNAMENT_MATCH_DAY) {
            const dayName = GameTimeSystem.DAY_NAMES[this.currentDay];
            return { 
                success: false, 
                reason: `今天是星期${dayName}，不是大陆赛事比赛日。\n大陆赛事比赛日为周六。\n请推进时间到周六。`
            };
        }

        this.triggerEvent('onTournamentRoundComplete', {
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay
        });

        console.log(`🏆 进行大陆赛事 - 第${this.currentWeek}周 星期六`);

        return {
            success: true,
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay,
            dayName: '六',
            matchType: 'tournament'
        };
    }
    
    /**
     * 获取下一个联赛比赛日的描述
     */
    getNextMatchDay() {
        const currentDay = this.currentDay;
        if (currentDay < 1) {
            return '星期一';
        } else if (currentDay < 4) {
            return '星期四';
        } else if (currentDay < 6) {
            return '星期六（大陆赛）';
        } else {
            return '下周一';
        }
    }

    /**
     * 推进一天
     */
    advanceDay() {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }

        const oldDay = this.currentDay;
        const oldWeather = this.currentWeather;
        this.currentDay++;

        // 检查是否到下一周
        if (this.currentDay > GameTimeSystem.DAYS_PER_WEEK) {
            this.currentDay = 1;
            return this.advanceWeek();
        }
        
        // 生成新一天的天气
        this.currentWeather = this.generateRandomWeather();

        const dayIndex = this.currentDay === 7 ? 0 : this.currentDay;
        const dayName = GameTimeSystem.DAY_NAMES[dayIndex];
        const isLeagueMatchDay = GameTimeSystem.LEAGUE_MATCH_DAYS.includes(this.currentDay);
        const isTournamentMatchDay = this.currentDay === GameTimeSystem.TOURNAMENT_MATCH_DAY;
        const isMatchDay = isLeagueMatchDay || isTournamentMatchDay;

        this.triggerEvent('onDayChange', {
            oldDay,
            newDay: this.currentDay,
            dayName,
            oldWeather,
            newWeather: this.currentWeather,
            isMatchDay,
            isLeagueMatchDay,
            isTournamentMatchDay,
            year: this.currentYear,
            week: this.currentWeek
        });

        const weatherInfo = this.weatherTypes.find(w => w.name === this.currentWeather);
        console.log(`📅 时间推进：第${this.currentYear}年第${this.currentWeek}周 星期${dayName}${isMatchDay ? ' 🏟️' : ''} ${weatherInfo.icon}`);

        return {
            success: true,
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay,
            dayName,
            weather: this.currentWeather,
            isMatchDay,
            isLeagueMatchDay,
            isTournamentMatchDay
        };
    }
    
    /**
     * 推进到下一周
     */
    advanceWeek() {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }

        const oldWeek = this.currentWeek;
        const oldYear = this.currentYear;
        const oldSeason = this.currentSeason;

        // 重置为周一
        this.currentDay = 1;

        // 推进周数
        this.currentWeek++;

        // 检查是否跨年
        if (this.currentWeek > GameTimeSystem.WEEKS_PER_YEAR) {
            this.currentWeek = 1;
            this.currentYear++;
            this.triggerEvent('onYearChange', {
                oldYear,
                newYear: this.currentYear
            });
            console.log(`🎉 新年到来！现在是第${this.currentYear}年`);
        }

        // 更新季节
        this.updateCurrentSeason();

        // 检查是否有联赛需要自动开赛
        this.checkAutoLeagueStart();

        this.triggerEvent('onWeekChange', {
            oldWeek,
            newWeek: this.currentWeek,
            year: this.currentYear,
            season: this.currentSeason
        });

        console.log(`📅 时间推进：第${this.currentYear}年 ${this.currentSeason} 第${this.currentWeek}周 星期一`);

        return {
            success: true,
            year: this.currentYear,
            week: this.currentWeek,
            day: this.currentDay,
            season: this.currentSeason
        };
    }
    
    /**
     * 推进到下一个联赛比赛日（周一或周四）
     */
    advanceToNextLeagueMatchDay() {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }
        
        const currentDay = this.currentDay;
        let daysToAdvance = 0;
        
        if (currentDay < 1) {
            daysToAdvance = 1 - currentDay;
        } else if (currentDay < 4) {
            daysToAdvance = 4 - currentDay;
        } else {
            // 推进到下周一
            daysToAdvance = (7 - currentDay) + 1;
        }
        
        let result = null;
        for (let i = 0; i < daysToAdvance; i++) {
            result = this.advanceDay();
            if (!result.success) return result;
        }
        
        return result;
    }
    
    /**
     * 推进到下一个大陆赛事比赛日（周六）
     */
    advanceToNextTournamentMatchDay() {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }
        
        const currentDay = this.currentDay;
        let daysToAdvance = 0;
        
        if (currentDay < GameTimeSystem.TOURNAMENT_MATCH_DAY) {
            daysToAdvance = GameTimeSystem.TOURNAMENT_MATCH_DAY - currentDay;
        } else {
            // 推进到下周六
            daysToAdvance = (7 - currentDay) + GameTimeSystem.TOURNAMENT_MATCH_DAY;
        }
        
        let result = null;
        for (let i = 0; i < daysToAdvance; i++) {
            result = this.advanceDay();
            if (!result.success) return result;
        }
        
        return result;
    }

    /**
     * 检查并自动开启联赛
     */
    checkAutoLeagueStart() {
        for (const [leagueName, schedule] of Object.entries(this.leagueSchedules)) {
            const normalizedWeek = this.currentWeek > 52 ? this.currentWeek - 52 : this.currentWeek;
            
            // 如果到了开赛周且联赛未激活，可以提醒玩家
            if (normalizedWeek === schedule.startWeek && !this.activeLeagues[leagueName].active) {
                console.log(`📢 提醒：${leagueName}可以在本周开赛！`);
                // 这里可以触发UI提示
            }
        }
    }

    /**
     * 获取所有活跃的联赛名称
     */
    getActiveLeagueNames() {
        return Object.entries(this.activeLeagues)
            .filter(([_, data]) => data.active)
            .map(([name, _]) => name);
    }

    /**
     * 获取联赛状态信息
     */
    getLeagueStatus(leagueName) {
        const schedule = this.leagueSchedules[leagueName];
        const active = this.activeLeagues[leagueName];
        
        if (!schedule || !active) {
            return null;
        }

        let weeksRemaining = 0;
        let roundsRemaining = 0;

        if (active.active) {
            roundsRemaining = schedule.totalRounds - active.currentRound;
            weeksRemaining = Math.ceil(roundsRemaining / GameTimeSystem.ROUNDS_PER_WEEK);
        }

        return {
            leagueName,
            isActive: active.active,
            startWeek: schedule.startWeek,
            duration: schedule.duration,
            currentRound: active.currentRound,
            totalRounds: schedule.totalRounds,
            roundsRemaining,
            weeksRemaining,
            season: schedule.season,
            description: schedule.description,
            canStart: this.canLeagueStart(leagueName)
        };
    }

    /**
     * 获取所有联赛状态
     */
    getAllLeagueStatus() {
        return {
            '夏季联赛': this.getLeagueStatus('夏季联赛'),
            '冬季联赛': this.getLeagueStatus('冬季联赛')
        };
    }

    /**
     * 快速推进（跳过N周）
     */
    fastForward(weeks) {
        if (this.isPaused) {
            return { success: false, reason: '时间已暂停' };
        }

        if (weeks <= 0) {
            return { success: false, reason: '周数必须大于0' };
        }

        const results = [];
        for (let i = 0; i < weeks; i++) {
            // 推进到下一周
            const weekResult = this.advanceWeek();
            results.push(weekResult);
        }

        return {
            success: true,
            weeksAdvanced: weeks,
            currentTime: this.getCurrentTime()
        };
    }

    /**
     * 暂停/恢复时间
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸️ 时间暂停' : '▶️ 时间恢复');
        
        // 暂停时记录时间，恢复时重置计时器
        if (!this.isPaused) {
            this.lastAdvanceTime = Date.now();
        }
        
        return this.isPaused;
    }

    /**
     * 设置暂停状态
     */
    setPause(paused) {
        this.isPaused = paused;
        console.log(paused ? '⏸️ 时间暂停' : '▶️ 时间恢复');
        
        // 暂停时记录时间，恢复时重置计时器
        if (!paused) {
            this.lastAdvanceTime = Date.now();
        }
        
        return this.isPaused;
    }

    /**
     * 注册事件监听器
     * @param {string} eventType - 事件类型
     * @param {function} callback - 回调函数
     */
    addEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].push(callback);
            return true;
        }
        console.warn(`未知的事件类型: ${eventType}`);
        return false;
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            const index = this.eventListeners[eventType].indexOf(callback);
            if (index > -1) {
                this.eventListeners[eventType].splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * 触发事件
     */
    triggerEvent(eventType, data) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件回调错误 [${eventType}]:`, error);
                }
            });
        }
    }

    /**
     * 获取时间线信息（用于显示）
     */
    getTimeline() {
        const timeline = [];
        
        for (let week = 1; week <= GameTimeSystem.WEEKS_PER_YEAR; week++) {
            let season = '';
            for (const [seasonName, seasonData] of Object.entries(this.seasons)) {
                if (week >= seasonData.start && week <= seasonData.end) {
                    season = seasonName;
                    break;
                }
            }

            const weekInfo = {
                week,
                season,
                events: [],
                isCurrentWeek: week === this.currentWeek
            };

            // 检查是否有联赛开始或结束
            for (const [leagueName, schedule] of Object.entries(this.leagueSchedules)) {
                if (week === schedule.startWeek) {
                    weekInfo.events.push(`${leagueName}开赛`);
                }
                if (week === schedule.endWeek) {
                    weekInfo.events.push(`${leagueName}结束`);
                }
            }

            timeline.push(weekInfo);
        }

        return timeline;
    }

    /**
     * 重置时间系统
     */
    reset() {
        this.currentYear = 1;
        this.currentWeek = 1;
        this.currentDay = 1;
        this.currentHour = 6;
        this.currentMinute = 0;
        this.currentWeather = '晴';
        this.isPaused = false;
        this.lastAdvanceTime = Date.now(); // 重置自动推进计时器
        
        for (const leagueName in this.activeLeagues) {
            this.activeLeagues[leagueName] = {
                active: false,
                startWeek: null,
                currentRound: 0
            };
        }
        
        this.updateCurrentSeason();
        console.log('🔄 时间系统已重置');
    }

    // ============ 数据持久化 ============

    /**
     * 初始化 IndexedDB
     */
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(GameTimeSystem.DB_NAME, GameTimeSystem.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(GameTimeSystem.STORE_NAME)) {
                    db.createObjectStore(GameTimeSystem.STORE_NAME);
                }
            };
        });
    }

    /**
     * 保存时间数据
     */
    async saveData() {
        try {
            const db = await this.initDatabase();
            const transaction = db.transaction([GameTimeSystem.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(GameTimeSystem.STORE_NAME);
            
            const data = {
                currentYear: this.currentYear,
                currentWeek: this.currentWeek,
                currentDay: this.currentDay,
                currentHour: this.currentHour,
                currentMinute: this.currentMinute,
                currentSeason: this.currentSeason,
                currentWeather: this.currentWeather,
                activeLeagues: this.activeLeagues,
                isPaused: this.isPaused,
                autoAdvanceEnabled: this.autoAdvanceEnabled,
                lastAdvanceTime: this.lastAdvanceTime,
                timestamp: Date.now()
            };
            
            store.put(data, 'current');
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('✅ 时间数据已保存');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('保存时间数据失败:', error);
            throw error;
        }
    }

    /**
     * 加载时间数据
     */
    async loadData() {
        try {
            const db = await this.initDatabase();
            const transaction = db.transaction([GameTimeSystem.STORE_NAME], 'readonly');
            const store = transaction.objectStore(GameTimeSystem.STORE_NAME);
            
            return new Promise((resolve, reject) => {
                const request = store.get('current');
                
                request.onsuccess = () => {
                    const data = request.result;
                    if (data) {
                        this.currentYear = data.currentYear || 1;
                        this.currentWeek = data.currentWeek || 1;
                        this.currentDay = data.currentDay || 1;
                        this.currentHour = data.currentHour || 6;
                        this.currentMinute = data.currentMinute || 0;
                        this.currentSeason = data.currentSeason || '春季';
                        this.currentWeather = data.currentWeather || '晴';
                        this.activeLeagues = data.activeLeagues || this.activeLeagues;
                        this.isPaused = data.isPaused || false;
                        this.autoAdvanceEnabled = data.autoAdvanceEnabled !== undefined ? data.autoAdvanceEnabled : true;
                        this.lastAdvanceTime = data.lastAdvanceTime || Date.now();
                        
                        this.updateCurrentSeason();
                        
                        // 重新启动自动推进
                        this.stopAutoAdvance();
                        this.startAutoAdvance();
                        
                        console.log('✅ 时间数据加载成功');
                        resolve(true);
                    } else {
                        console.log('ℹ️ 没有保存的时间数据，使用初始值');
                        // 生成初始天气
                        this.currentWeather = this.generateRandomWeather();
                        resolve(false);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('加载时间数据失败:', error);
            return false;
        }
    }

    /**
     * 清除时间数据
     */
    async clearData() {
        try {
            const db = await this.initDatabase();
            const transaction = db.transaction([GameTimeSystem.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(GameTimeSystem.STORE_NAME);
            
            store.clear();
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('✅ 时间数据已清除');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('清除时间数据失败:', error);
            throw error;
        }
    }

    /**
     * 导出数据为JSON
     */
    exportToJSON() {
        return {
            version: '1.3',
            currentYear: this.currentYear,
            currentWeek: this.currentWeek,
            currentDay: this.currentDay,
            currentHour: this.currentHour,
            currentMinute: this.currentMinute,
            currentSeason: this.currentSeason,
            currentWeather: this.currentWeather,
            activeLeagues: this.activeLeagues,
            isPaused: this.isPaused,
            autoAdvanceEnabled: this.autoAdvanceEnabled,
            lastAdvanceTime: this.lastAdvanceTime,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * 从JSON导入数据
     */
    importFromJSON(jsonData) {
        try {
            this.currentYear = jsonData.currentYear || 1;
            this.currentWeek = jsonData.currentWeek || 1;
            this.currentDay = jsonData.currentDay || 1;
            this.currentHour = jsonData.currentHour || 6;
            this.currentMinute = jsonData.currentMinute || 0;
            this.currentSeason = jsonData.currentSeason || '春季';
            this.currentWeather = jsonData.currentWeather || this.generateRandomWeather();
            this.activeLeagues = jsonData.activeLeagues || this.activeLeagues;
            this.isPaused = jsonData.isPaused || false;
            this.autoAdvanceEnabled = jsonData.autoAdvanceEnabled !== undefined ? jsonData.autoAdvanceEnabled : true;
            this.lastAdvanceTime = jsonData.lastAdvanceTime || Date.now();
            
            this.updateCurrentSeason();
            
            // 重新启动自动推进
            this.stopAutoAdvance();
            this.startAutoAdvance();
            
            console.log('✅ 时间数据导入成功');
            return true;
        } catch (error) {
            console.error('导入时间数据失败:', error);
            return false;
        }
    }
}

// 导出时间系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameTimeSystem;
}
