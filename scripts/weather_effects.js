/**
 * 天气视觉效果系统
 * 
 * 功能：
 * - 根据天气状态显示对应的视觉效果
 * - 下雨：雨点从上往下落，有落地水花效果
 * - 雪：雪花飘落动画
 * - 雷暴：闪电效果
 * - 台风：强风动画
 */

class WeatherEffectsSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationFrame = null;
        this.currentWeather = '晴';
        this.isActive = false;
        
        // 效果配置
        this.config = {
            '晴': { enabled: false },
            '阴': { enabled: false },
            '小雨': {
                enabled: true,
                particleCount: 100,
                speed: 5,
                length: 15,
                width: 1,
                color: 'rgba(174, 194, 224, 0.6)',
                splashEnabled: true
            },
            '中雨': {
                enabled: true,
                particleCount: 200,
                speed: 8,
                length: 20,
                width: 1.5,
                color: 'rgba(174, 194, 224, 0.7)',
                splashEnabled: true
            },
            '暴雨': {
                enabled: true,
                particleCount: 400,
                speed: 12,
                length: 25,
                width: 2,
                color: 'rgba(174, 194, 224, 0.8)',
                splashEnabled: true
            },
            '台风': {
                enabled: true,
                particleCount: 600,
                speed: 15,
                length: 30,
                width: 2.5,
                color: 'rgba(174, 194, 224, 0.9)',
                wind: 3,
                splashEnabled: true
            },
            '雷暴': {
                enabled: true,
                particleCount: 300,
                speed: 10,
                length: 22,
                width: 2,
                color: 'rgba(174, 194, 224, 0.8)',
                lightning: true,
                splashEnabled: true
            }
        };
        
        // 水花粒子数组
        this.splashes = [];
        
        // 闪电效果
        this.lightning = {
            active: false,
            opacity: 0,
            nextTime: 0
        };
    }
    
    /**
     * 初始化天气效果系统
     */
    initialize() {
        // 创建画布
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'weather-effects-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        
        // 插入到地图容器中
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(this.canvas);
        } else {
            document.body.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resizeCanvas());
        
        console.log('🌦️ 天气效果系统初始化完成');
    }
    
    /**
     * 调整画布大小
     */
    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    /**
     * 设置当前天气
     */
    setWeather(weatherName) {
        if (this.currentWeather === weatherName) return;
        
        this.currentWeather = weatherName;
        this.particles = [];
        this.splashes = [];
        
        const config = this.config[weatherName];
        if (config && config.enabled) {
            this.initializeParticles(config);
            this.start();
        } else {
            this.stop();
        }
        
        console.log(`🌦️ 天气效果已切换：${weatherName}`);
    }
    
    /**
     * 初始化粒子
     */
    initializeParticles(config) {
        this.particles = [];
        const count = config.particleCount || 100;
        
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(config));
        }
    }
    
    /**
     * 创建单个粒子
     */
    createParticle(config) {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height - this.canvas.height,
            speed: config.speed + Math.random() * 2,
            length: config.length,
            width: config.width,
            wind: config.wind || 0,
            color: config.color
        };
    }
    
    /**
     * 创建水花粒子
     */
    createSplash(x, y) {
        const splashParticles = [];
        const particleCount = 4 + Math.floor(Math.random() * 4); // 4-7个水花粒子
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); // 45-135度
            const speed = 2 + Math.random() * 3;
            
            splashParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                vy: -Math.sin(angle) * speed,
                life: 1.0, // 生命值从1.0衰减到0
                gravity: 0.3,
                size: 2 + Math.random() * 2
            });
        }
        
        return splashParticles;
    }
    
    /**
     * 更新粒子状态
     */
    updateParticles() {
        const config = this.config[this.currentWeather];
        if (!config || !config.enabled) return;
        
        // 更新雨滴粒子
        this.particles.forEach(particle => {
            // 移动粒子
            particle.y += particle.speed;
            particle.x += particle.wind || 0;
            
            // 如果粒子落到底部，重置到顶部并创建水花
            if (particle.y > this.canvas.height) {
                // 创建水花效果
                if (config.splashEnabled) {
                    const splashParticles = this.createSplash(particle.x, this.canvas.height - 5);
                    this.splashes.push(...splashParticles);
                }
                
                // 重置粒子
                particle.y = -particle.length;
                particle.x = Math.random() * this.canvas.width;
            }
            
            // 处理横向超出屏幕
            if (particle.x < -20) {
                particle.x = this.canvas.width + 10;
            } else if (particle.x > this.canvas.width + 20) {
                particle.x = -10;
            }
        });
        
        // 更新水花粒子
        this.splashes = this.splashes.filter(splash => {
            // 应用重力
            splash.vy += splash.gravity;
            splash.x += splash.vx;
            splash.y += splash.vy;
            splash.life -= 0.05; // 衰减生命值
            
            // 移除消失的水花
            return splash.life > 0 && splash.y < this.canvas.height;
        });
        
        // 更新闪电效果
        if (config.lightning) {
            const now = Date.now();
            if (now > this.lightning.nextTime) {
                // 触发闪电
                if (Math.random() < 0.02) { // 2%概率
                    this.lightning.active = true;
                    this.lightning.opacity = 1.0;
                    this.lightning.nextTime = now + 3000 + Math.random() * 7000; // 3-10秒后可能再次闪电
                }
            }
            
            // 闪电衰减
            if (this.lightning.active) {
                this.lightning.opacity -= 0.1;
                if (this.lightning.opacity <= 0) {
                    this.lightning.active = false;
                }
            }
        }
    }
    
    /**
     * 绘制粒子
     */
    drawParticles() {
        if (!this.ctx) return;
        
        const config = this.config[this.currentWeather];
        if (!config || !config.enabled) return;
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制闪电效果
        if (config.lightning && this.lightning.active) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.lightning.opacity * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制闪电线条
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightning.opacity})`;
            this.ctx.lineWidth = 2 + Math.random() * 3;
            this.ctx.beginPath();
            
            const startX = this.canvas.width * (0.3 + Math.random() * 0.4);
            let currentX = startX;
            let currentY = 0;
            
            this.ctx.moveTo(currentX, currentY);
            
            // 绘制锯齿状闪电
            while (currentY < this.canvas.height) {
                currentX += (Math.random() - 0.5) * 100;
                currentY += 50 + Math.random() * 50;
                this.ctx.lineTo(currentX, currentY);
            }
            
            this.ctx.stroke();
        }
        
        // 绘制雨滴
        this.ctx.strokeStyle = config.color || 'rgba(174, 194, 224, 0.6)';
        this.ctx.lineWidth = config.width || 1;
        
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(particle.x + (particle.wind || 0) * 2, particle.y + particle.length);
            this.ctx.stroke();
        });
        
        // 绘制水花
        this.splashes.forEach(splash => {
            this.ctx.fillStyle = `rgba(174, 194, 224, ${splash.life * 0.6})`;
            this.ctx.beginPath();
            this.ctx.arc(splash.x, splash.y, splash.size * splash.life, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    /**
     * 动画循环
     */
    animate() {
        if (!this.isActive) return;
        
        this.updateParticles();
        this.drawParticles();
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * 启动天气效果
     */
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.animate();
        console.log(`▶️ 天气效果已启动：${this.currentWeather}`);
    }
    
    /**
     * 停止天气效果
     */
    stop() {
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // 清空画布
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        console.log('⏸️ 天气效果已停止');
    }
    
    /**
     * 销毁天气效果系统
     */
    destroy() {
        this.stop();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.splashes = [];
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherEffectsSystem;
}
