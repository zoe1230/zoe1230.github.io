---
title: Zhanhong Chen
titleTemplate: false
sidebar: false
---

# Zhanhong Chen

<img class="home-avatar" src="/avatar.jpg" alt="Portrait of Zhanhong Chen" />

陈占弘 · Tianjin University

I am a Master's student in Instrument Science and Technology at Tianjin University (expected 2026), advised by Prof. Yanbiao Sun. I work on 3D vision, especially real-time stereo matching and recovering metric geometry from images. I also maintain two technical notes on generative modeling and fine-structure monocular depth.

Email: [2535787179@qq.com](mailto:2535787179@qq.com) · GitHub: [zoe1230](https://github.com/zoe1230)

<div class="home-clear"></div>

## Research

I am interested in 3D perception under latency and deployment constraints. Recent work studies how iterative stereo matching can stay accurate while cutting matching-encoding and refinement cost, so it can run in real time and on edge hardware. A second thread is pixel-space modeling for monocular depth: why latent compression and coarse grids lose thin structure, and how recent methods try to get it back.

- Real-time stereo matching and iterative refinement
- Metric 3D reconstruction from images
- Fine-structure monocular depth and pixel-space models

## Publications

<div class="pub-entry">

**CIRNet: Compact Iterative Refinement Network for Real-Time Stereo Matching**

Haopeng Wang, **Zhanhong Chen**, Yu Zhang, Yanbiao Sun, Jigui Zhu

*IEEE Robotics and Automation Letters*, vol. 11, no. 8, pp. 9175–9182, 2026

[DOI](https://doi.org/10.1109/lra.2026.3703239)

Compact correlation encoding and staged iterative refinement keep iterative stereo accurate at lower latency on SceneFlow and KITTI, including deployment on edge hardware.

</div>

## Notes

Two reading notes, not a blog. The first chain is the generative-modeling background; the second asks where fine structure is recovered in monocular depth.

| Note | What it is for |
|---|---|
| [从 VAE、扩散模型到 PXDepth](/generative-foundations/) | VAE, diffusion, DiT, Flow Matching, PixelDiT, PPD, and what PXDepth keeps or drops |
| [细结构单目深度估计](/fine-detail-depth/) | InfiniDepth, PPD, MDA, PXDepth, MoGe-3, and 2K Retrofit on one map |

```mermaid
flowchart LR
    GF[生成式建模基础链] --> FD[细结构单目深度]
    GF --> PixelDiT[PixelDiT]
    PixelDiT --> PPD[PPD]
    PPD --> FD
    PPD --> PX[PXDepth]
    PX --> FD
```

[开始阅读：生成式基础](/generative-foundations/) · [开始阅读：细结构深度](/fine-detail-depth/)

## Education and experience

**Education**

- M.S. in Instrument Science and Technology, Tianjin University, 2026 (expected). Advisor: Yanbiao Sun.
- B.S. in Control Technology and Instruments, Tianjin University, 2023.

**Experience**

- Research intern, Santachi, Summer 2024. Computer vision for anti-external-damage monitoring on power transmission lines.

**Skills**

Python, C++, OpenCV, PCL, PyTorch, CUDA, Git, Docker, Linux.
