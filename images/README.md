# 图片文件夹使用说明

这个文件夹用于存储动物头像和其他游戏图片，避免占用localStorage空间。

## 📁 文件命名规则

图片文件名必须与动物的标识符匹配：
- 使用动物的 `templateKey`（推荐）
- 或使用动物的 `animalId`
- 或使用动物的 `key`

### 示例：
```
images/
  ├── animal_dragon.png        # templateKey为animal_dragon的动物
  ├── template_001.jpg          # templateKey为template_001的动物
  ├── fire_beast.webp           # templateKey为fire_beast的动物
  └── my_pet.gif                # templateKey为my_pet的动物
```

## 🎨 支持的图片格式

- PNG (.png) - 推荐用于透明背景
- JPG/JPEG (.jpg, .jpeg) - 推荐用于照片
- WebP (.webp) - 推荐用于最佳压缩比
- GIF (.gif) - 支持动画
- SVG (.svg) - 矢量图形

## 📏 推荐的图片规格

- **尺寸**: 100x100 到 300x300 像素
- **格式**: WebP（最佳）或 PNG
- **文件大小**: 小于 100KB

## 🚀 使用方法

### 方法1：直接放置图片文件
1. 将图片文件放到这个 `images/` 文件夹
2. 确保文件名与动物的templateKey完全匹配
3. 图片会自动在游戏中显示

### 方法2：使用图像管理器
1. 打开 `image_manager.html`
2. 上传图片到图像库（会保存到localStorage）
3. 或者查看当前动物的templateKey，然后手动放置对应的图片文件

## 🔍 如何查找动物的templateKey

### 方法1：在动物设计器中查看
1. 打开 `animal_designer.html`
2. 查看动物的"Key"字段

### 方法2：检查localStorage
1. 打开浏览器开发者工具（F12）
2. 进入Application/存储 -> Local Storage
3. 查看 `ANIMAL_POOL` 中动物的 `key` 字段

### 方法3：使用存储管理器
1. 打开 `storage_manager.html`
2. 查看ANIMAL_POOL的内容

## ⚡ 性能优势

使用本地文件夹存储图片的优势：
- ✅ 不占用localStorage空间（localStorage只有5MB）
- ✅ 图片加载更快（浏览器缓存）
- ✅ 支持更大的图片文件
- ✅ 可以使用任何图片格式
- ✅ 便于管理和替换图片

## 🎯 工作原理

系统按以下顺序查找图片：
1. 先检查 `images/` 文件夹中是否有对应的图片文件
2. 如果没有，再从localStorage的图像库中查找
3. 如果还没有，使用默认的颜色球头像

## 📝 示例

假设你有一个动物，它的templateKey是 `dragon_fire`：

1. 准备图片文件（例如 `dragon.png`）
2. 将文件重命名为 `dragon_fire.png`
3. 放到 `images/` 文件夹
4. 刷新游戏页面，图片会自动显示

## ⚠️ 注意事项

- 文件名区分大小写
- 文件名不能包含特殊字符（建议使用字母、数字、下划线、连字符）
- 确保图片文件权限允许网页读取
- 本地文件系统可能有跨域限制，建议使用本地服务器运行项目

## 🔧 故障排除

如果图片没有显示：
1. 检查文件名是否与templateKey完全匹配
2. 检查文件扩展名是否正确
3. 打开浏览器开发者工具查看是否有加载错误
4. 确认图片文件在正确的 `images/` 文件夹中
5. 尝试刷新页面清除缓存（Ctrl+F5）