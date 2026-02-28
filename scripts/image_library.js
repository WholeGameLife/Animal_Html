// 图像库管理系统
// 优先从本地images文件夹读取图片，localStorage作为备用

class ImageLibrary {
    constructor() {
        this.STORAGE_KEY = 'IMAGE_LIBRARY';
        this.library = this.loadLibrary();
        // 自动检测当前路径，适配pages/和designers/文件夹
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/') || currentPath.includes('/designers/')) {
            this.IMAGE_FOLDER = '../images/'; // 从子文件夹访问
        } else {
            this.IMAGE_FOLDER = 'images/'; // 从根目录访问
        }
        this.imageCache = {}; // 缓存已加载的图片
    }
    
    // 从localStorage加载图像库
    loadLibrary() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('加载图像库失败:', error);
            return {};
        }
    }
    
    // 保存图像库到localStorage
    saveLibrary() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.library));
            return true;
        } catch (error) {
            console.error('保存图像库失败:', error);
            return false;
        }
    }
    
    // 添加或更新图像
    // key可以是animalId、templateKey等唯一标识
    setImage(key, imageData) {
        if (!key || !imageData) return false;
        
        this.library[key] = imageData;
        return this.saveLibrary();
    }
    
    // 获取图像
    getImage(key) {
        if (!key) return null;
        return this.library[key] || null;
    }
    
    // 批量添加图像
    setImages(imageMap) {
        if (!imageMap || typeof imageMap !== 'object') return false;
        
        Object.assign(this.library, imageMap);
        return this.saveLibrary();
    }
    
    // 删除图像
    removeImage(key) {
        if (!key) return false;
        
        delete this.library[key];
        return this.saveLibrary();
    }
    
    // 检查图像是否存在
    hasImage(key) {
        return key && this.library.hasOwnProperty(key);
    }
    
    // 获取库中的所有key
    getAllKeys() {
        return Object.keys(this.library);
    }
    
    // 获取库的大小（字节）
    getLibrarySize() {
        try {
            return JSON.stringify(this.library).length;
        } catch (error) {
            return 0;
        }
    }
    
    // 清空图像库（慎用）
    clearLibrary() {
        this.library = {};
        return this.saveLibrary();
    }
    
    // 从动物池同步图像到图像库
    syncFromAnimalPool() {
        const animalPool = JSON.parse(localStorage.getItem('ANIMAL_POOL') || '[]');
        let syncCount = 0;
        
        animalPool.forEach(animal => {
            if (animal.avatarData) {
                // 优先使用animalId，其次使用key
                const imageKey = animal.animalId || animal.key;
                if (imageKey) {
                    this.setImage(imageKey, animal.avatarData);
                    syncCount++;
                }
            }
        });
        
        console.log(`已同步 ${syncCount} 个动物头像到图像库`);
        return syncCount;
    }
    
    // 获取图像（支持多种key类型）
    // 优先级：本地文件 > localStorage > animalId > key > templateKey
    getImageByAnimal(animalData) {
        if (!animalData) return null;
        
        // 1. 优先使用animalId（新的索引方式）
        if (animalData.animalId) {
            const image = this.getImage(animalData.animalId);
            if (image) return image;
        }
        
        // 2. 尝试使用key（兼容旧数据）
        if (animalData.key) {
            const image = this.getImage(animalData.key);
            if (image) return image;
        }
        
        // 3. 尝试使用templateKey（最后的备选）
        if (animalData.templateKey) {
            const image = this.getImage(animalData.templateKey);
            if (image) return image;
        }
        
        return null;
    }
    
    // 从本地文件夹获取图片路径（同步检查，用于立即返回路径）
    // 支持的格式：.png, .jpg, .jpeg, .gif, .webp, .svg
    getLocalImagePath(key) {
        if (!key) return null;
        
        // 直接返回最可能的扩展名路径（.png最常用）
        // 浏览器会自动处理404，不需要我们预先验证
        return `${this.IMAGE_FOLDER}${key}.png`;
    }
    
    // 检查本地图片是否存在
    async checkLocalImageExists(key) {
        const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        
        for (const ext of extensions) {
            const path = `${this.IMAGE_FOLDER}${key}.${ext}`;
            try {
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) {
                    return path;
                }
            } catch (e) {
                // 文件不存在，继续尝试下一个扩展名
            }
        }
        
        return null;
    }
    
    // 获取图片URL（优先localStorage，然后本地文件）
    // 返回值：base64数据或图片路径，如果都没有则返回null
    getImageUrl(key) {
        if (!key) return null;
        
        // 1. 优先从localStorage获取base64数据（用于动物实例ID）
        const storedImage = this.getImage(key);
        if (storedImage) {
            return storedImage;
        }
        
        // 2. 处理特殊情况:如果key是ANIMAL_开头但后面是纯数字,尝试提取数字部分
        const keyStr = String(key);
        if (keyStr.startsWith('ANIMAL_')) {
            // 尝试从ANIMAL_xxx中提取数字部分
            const numberMatch = keyStr.match(/ANIMAL_(\d+)$/);
            if (numberMatch) {
                // 递归调用,用提取的数字部分查找
                return this.getImageUrl(numberMatch[1]);
            }
        }
        
        // 3. 返回本地文件路径（用于模板图片编号或模板key）
        // 排除UUID格式和ai_animal_格式的key
        // 允许纯数字格式(如10001)、字母格式(如fire_cat)和ANIMAL_数字格式的key
        const isUUID = keyStr.includes('-') && keyStr.length > 20 && !keyStr.startsWith('ANIMAL_');
        const isAIAnimalId = keyStr.startsWith('ai_animal_');
        
        if (!isUUID && !isAIAnimalId) {
            const localPath = this.getLocalImagePath(key);
            if (localPath) {
                return localPath;
            }
        }
        
        return null;
    }
    
    // 新增：获取动物头像（支持多种key查找方式）
    // 参数：animal对象或key字符串
    // 返回：图片URL或null
    getAnimalAvatar(animalOrKey) {
        if (!animalOrKey) return null;
        
        let keysToTry = [];
        
        if (typeof animalOrKey === 'string') {
            // 如果传入的是字符串key
            keysToTry = [animalOrKey];
        } else {
            // 如果传入的是动物对象，按优先级尝试多个key
            const animal = animalOrKey;
            // 1. 优先使用id（用户存储图片的索引方式）
            if (animal.id) keysToTry.push(animal.id);
            // 2. 尝试使用animalId
            if (animal.animalId) keysToTry.push(animal.animalId);
            // 3. 尝试使用key
            if (animal.key) keysToTry.push(animal.key);
            // 4. 尝试使用templateKey（AI动物的备选）
            if (animal.templateKey) keysToTry.push(animal.templateKey);
        }
        
        // 依次尝试每个key
        for (const key of keysToTry) {
            const url = this.getImageUrl(key);
            if (url) return url;
        }
        
        return null;
    }
}

// 创建全局实例
window.imageLibrary = new ImageLibrary();

// 初始化时自动从动物池同步图像
if (localStorage.getItem('ANIMAL_POOL')) {
    window.imageLibrary.syncFromAnimalPool();
}