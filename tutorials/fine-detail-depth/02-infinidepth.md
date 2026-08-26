# 02. InfiniDepth：连续神经隐式深度场

[← 上一章：问题与基础](01-problem-and-foundations.md) · [返回目录](README.md) · [下一章：Pixel-Perfect Depth →](03-pixel-perfect-depth.md)

## 1. 一句话定位

**InfiniDepth不把深度限定为一张固定网格，而把它写成图像条件的连续函数，在任意 UV 坐标查询深度。**

论文：[InfiniDepth: Arbitrary-Resolution and Fine-Grained Depth Estimation with Neural Implicit Fields](https://arxiv.org/abs/2601.03252)；[项目页](https://zju3dv.github.io/InfiniDepth/)；[官方仓库](https://github.com/zju3dv/InfiniDepth)。

## 2. 问题动机：输出网格本身也是瓶颈

传统模型在 $h\times w$ 网格预测，再插值到 $H\times W$。即使上采样后的数组与原图像素对齐，新像素的值仍主要由少数离散预测混合而来，无法保证恢复训练网格之外的几何变化。

InfiniDepth改为

$$
d_I(x,y)=N_\theta\bigl(I,(x,y)\bigr),
$$

其中 $(x,y)$ 是连续图像坐标。输出 1K、2K 或非整数比例分辨率，只是改变查询点集合 $Q=\{u_i\}_{i=1}^N$，而不是更换最后一层的固定输出形状。

“任意分辨率”不等于无限信息：若 RGB 本身不含细线，或 encoder feature 已抹去它，增加查询密度只会更密地采样同一个错误函数。

## 3. 表示空间与完整数据流

```mermaid
flowchart LR
    I[RGB I] --> V[ViT encoder<br/>多层 token]
    V --> R[reassemble<br/>多尺度 feature pyramid]
    Q[连续查询 u=(x,y)] --> S[各尺度局部双线性查询]
    R --> S
    S --> G[浅层到深层<br/>残差门控融合]
    G --> M[轻量 MLP]
    M --> D[d_I(u)]
```

【论文报告】论文架构从 ViT 多层 token 重组特征金字塔，在每个尺度对同一连续坐标做局部双线性查询，再从高空间分辨率的细节特征向低空间分辨率的语义特征分层融合。

【官方代码事实】截至核对日的公开推理实现采用 DINOv3 ViT-L/16 和一个 stride-4、128 通道 `BasicEncoder`。配置列出 ViT-L 的层索引 `[4, 11, 17, 23]`；当前 `ImplicitHead._encode_feat` 取最后一层 DINO token，并把它与查询到的低层 feature 拼接，MLP 隐藏维为 `[1024, 256, 32]`。这说明**论文方法图与当前工程化发布头并非逐行同构**，复现时应记录 checkpoint 和代码 commit，不能把论文伪代码冒充当前类实现。

## 4. 关键数学

### 4.1 连续坐标映射与局部查询

第 $k$ 个特征图 $f_k\in\mathbb R^{h_k\times w_k\times C_k}$ 上的对应坐标为

$$
(x_k,y_k)=\left(x\frac{w_k}{W},y\frac{h_k}{H}\right).
$$

取包围它的四个格点 $\mathcal N_k(x_k,y_k)$，双线性查询为

$$
q_k(x,y)=\sum_{(i,j)\in\mathcal N_k}
\omega_{ij}(x_k,y_k)f_k(i,j),
\qquad \sum_{i,j}\omega_{ij}=1.
$$

双线性查询使 $q_k$ 对坐标分段可微，也允许非整数位置；但它仍是局部插值。真正的新能力来自“连续坐标 + 多尺度图像条件 + 非线性 MLP”，不是双线性插值单独创造高频信息。

### 4.2 论文的层级门控融合

令 $h_1=q_1(x,y)$ 为浅层高分辨率特征，论文按

$$
h_{k+1}=operatorname{FFN}_k\!\left(
q_{k+1}(x,y)+g_k\odot \operatorname{Linear}_k(h_k)
\right)
$$

从细节层向语义层融合，$g_k\in(0,1)^{C_{k+1}}$ 是可学习通道门。最后

$$
d_I(x,y)=\operatorname{MLP}(h_L).
$$

门控的目的不是“自动证明浅层一定正确”，而是让模型逐通道决定保留多少局部纹理和多少深层语义。

### 4.3 稀疏坐标监督

训练时不必构造完整高分辨率输出，只采样 $N$ 个坐标：

$$
\mathcal L_{\mathrm{point}}
=\frac1N\sum_{i=1}^{N}
\left|N_\theta(I,u_i)-d_i\right|.
$$

【论文报告】论文以点式 $L_1$ 监督训练连续场。公开训练配置则使用预归一化 disparity、MAE 与梯度项等工程化组合；因此“论文核心目标”和“当前 release recipe”应分别记录。

## 5. 张量与坐标变化

以当前公开 RGB-only 推理路径为例：

```text
image                 [B, 3, H, W]
DINOv3 patch tokens   [B, (H/16)(W/16), C]
BasicEncoder feature  [B, 128, H/4, W/4]
query coordinates     [B, N, 2], normalized to [-1, 1]
queried DINO feature  [B, N, C]
queried basic feature [B, N, 128]
concatenated feature  [B, N, C+128]
predicted disparity   [B, N, 1]
```

代码中的 query 顺序为 `(y,x)`，传给 `grid_sample` 前会 `flip(-1)` 变成其要求的 `(x,y)`。这是复写实现时很容易产生旋转/转置错误的地方。

## 6. Infinite Depth Query：为三维表面而非二维像素分配预算

普通每像素反投影会使远处表面和斜视表面采样稀疏。论文用每个像素对应的近似三维面积分配子像素查询数：

$$
w(x,y)\propto
\frac{d_I(x,y)^2}{|n(x,y)\cdot v(x,y)|+\epsilon}.
$$

深度平方补偿透视投影；$|n\cdot v|$ 小表示表面更斜，同一像素覆盖的真实表面积更大。连续场的可微性还允许从反投影点 $X(x,y)$ 的 Jacobian 得到法向：

$$
n(x,y)=
\frac{\partial_xX\times\partial_yX}
{\|\partial_xX\times\partial_yX\|_2}.
$$

【分析判断】这项策略主要改善点云/3DGS 的表面采样均匀性；它与“单个查询的深度是否正确”是两个问题。错误的连续场被更密采样，仍然是错误几何。

## 7. 训练与推理伪代码

```text
# training
for image, depth, valid in dataset:
    coords = sample_valid_coordinates(valid, count=N)
    targets = gather(depth_or_disparity, coords)

    pyramid = image_encoder(image)
    local_features = [bilinear_query(f, coords) for f in pyramid]
    pred = implicit_decoder(local_features)

    loss = pointwise_L1(pred, normalize(targets))
    update(loss)
```

```text
# arbitrary-resolution inference
features = encode_once(image)
coords = make_dense_grid(H_out, W_out, normalized_range=[-1, 1])

pred_chunks = []
for q in split(coords, max_queries_per_chunk):
    pred_chunks.append(query_implicit_field(features, q))

depth = inverse_normalization(concatenate(pred_chunks))
return reshape(depth, [H_out, W_out])
```

编码一次、分块查询可控制峰值显存；总解码量仍与输出查询数 $N=H_{out}W_{out}$ 线性增长。

## 8. 官方代码映射

- [`inference_depth.py`](https://github.com/zju3dv/InfiniDepth/blob/main/inference_depth.py)：构造任意输出尺寸的 2D uniform query，分块调用 `model.inference`。
- [`InfiniDepth/model/model.py`](https://github.com/zju3dv/InfiniDepth/blob/main/InfiniDepth/model/model.py)：公开 RGB-only / depth-sensor 推理模型、query batching、disparity-to-depth 后处理。
- [`InfiniDepth/model/block/implicit_decoder.py`](https://github.com/zju3dv/InfiniDepth/blob/main/InfiniDepth/model/block/implicit_decoder.py)：`grid_sample` 连续查询、DINO/Basic feature 融合和 MLP。
- [`InfiniDepth/model/block/config.py`](https://github.com/zju3dv/InfiniDepth/blob/main/InfiniDepth/model/block/config.py)：ViT 变体、层索引和通道设置。
- [`training/model/depth_estimation/infinidepth/model.py`](https://github.com/zju3dv/InfiniDepth/blob/main/training/model/depth_estimation/infinidepth/model.py)：训练数据流、点坐标监督和批量查询。

## 9. 主要实验、消融与边界

【论文报告】论文构建 Synth4K，来自五个游戏，并用高频 depth mask 专门评价细节；实验还覆盖真实相对/metric 深度和大视角 novel-view synthesis。消融支持多尺度局部隐式解码优于固定网格和简单查询，并展示提高查询分辨率可继续增加细节。

【官方代码事实】README 给出的 RGB-only checkpoint 输出相对深度；公开点云流程借助 MoGe-2 提供 metric scale/内参。另有 `InfiniDepth_DepthSensor` 接收深度传感器输入完成 metric depth。不要把这三种设置混成“RGB-only 原生 metric”。

【复现边界】论文训练描述为 800k steps、AdamW、$10^{-5}$、8 GPU、每 GPU batch 4；当前训练配置已经演化，默认 DINOv3、数据配方和 loss 应以具体 commit 为准。

## 10. 优势与失败模式

**优势**：输出分辨率与训练网格解耦；可对细节区域自适应追加 query；坐标可微，便于法向和表面采样；编码后能以 query chunk 控制显存。

**失败模式**：局部 feature 查询最终仍受 encoder 分辨率限制；连续并不保证跨遮挡不做错误插值；超高分辨率全图查询有线性解码成本；RGB-only 的 metric scale/内参需要额外来源；代码演化使论文结构与发布实现存在差异。

## 11. 本章结论与下一章连接

InfiniDepth在“输出表示”层解决离散网格限制，但仍是确定性函数。下一章 PPD 处理另一个瓶颈：若深度先经 VAE 或单次回归，遮挡边界会被平滑；它把整个生成轨迹搬到原始深度像素空间。

[← 上一章：问题与基础](01-problem-and-foundations.md) · [返回目录](README.md) · [下一章：Pixel-Perfect Depth →](03-pixel-perfect-depth.md)
