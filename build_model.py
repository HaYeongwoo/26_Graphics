"""
귀여운 로봇 마스코트 'NOVA'를 프리미티브(상자/구/원기둥)로 조합해
GLB(GLTF binary) 모델로 내보내는 스크립트.
실행: python build_model.py  ->  models/nova.glb 생성
"""
import numpy as np
import trimesh
from trimesh.creation import box, icosphere, cylinder

def colored(mesh, hexcolor, metallic=0.0, rough=0.5):
    """메쉬에 PBR 재질(색/금속성/거칠기)을 입힌다."""
    r = int(hexcolor[1:3], 16) / 255
    g = int(hexcolor[3:5], 16) / 255
    b = int(hexcolor[5:7], 16) / 255
    mat = trimesh.visual.material.PBRMaterial(
        baseColorFactor=[r, g, b, 1.0],
        metallicFactor=metallic,
        roughnessFactor=rough,
    )
    mesh.visual = trimesh.visual.TextureVisuals(material=mat)
    return mesh

parts = {}

# --- 몸통 (둥근 흰색 본체) ---
body = box(extents=[1.4, 1.5, 1.1])
body.apply_translation([0, 0.75, 0])
parts["body"] = colored(body, "#f2f4f8", metallic=0.1, rough=0.35)

# 가슴 디스플레이 패널 (민트색)
panel = box(extents=[0.9, 0.7, 0.06])
panel.apply_translation([0, 0.8, 0.56])
parts["panel"] = colored(panel, "#27e0c0", metallic=0.0, rough=0.25)

# --- 머리 ---
head = box(extents=[1.25, 1.0, 1.05])
head.apply_translation([0, 1.95, 0])
parts["head"] = colored(head, "#e8ebf2", metallic=0.1, rough=0.35)

# 바이저(검은 유리 면) - 눈이 올라가는 곳
visor = box(extents=[1.05, 0.55, 0.08])
visor.apply_translation([0, 2.0, 0.52])
parts["visor"] = colored(visor, "#10131c", metallic=0.3, rough=0.1)

# 눈 두 개 (발광 시안)
for i, x in enumerate([-0.28, 0.28]):
    eye = icosphere(subdivisions=3, radius=0.16)
    eye.apply_scale([1, 1, 0.5])
    eye.apply_translation([x, 2.02, 0.57])
    parts[f"eye{i}"] = colored(eye, "#36f1ff", metallic=0.0, rough=0.2)

# --- 안테나 ---
stalk = cylinder(radius=0.04, height=0.5, sections=16)
stalk.apply_translation([0, 2.7, 0])
parts["antenna_stalk"] = colored(stalk, "#9aa3b2", metallic=0.6, rough=0.3)
ball = icosphere(subdivisions=3, radius=0.13)
ball.apply_translation([0, 2.98, 0])
parts["antenna_ball"] = colored(ball, "#ff5d8f", metallic=0.0, rough=0.3)

# --- 팔 (양쪽) ---
for i, x in enumerate([-0.95, 0.95]):
    shoulder = icosphere(subdivisions=3, radius=0.22)
    shoulder.apply_translation([x, 1.15, 0])
    parts[f"shoulder{i}"] = colored(shoulder, "#27e0c0", metallic=0.2, rough=0.3)
    arm = cylinder(radius=0.12, height=0.7, sections=16)
    arm.apply_translation([x, 0.7, 0])
    parts[f"arm{i}"] = colored(arm, "#e8ebf2", metallic=0.1, rough=0.4)
    hand = icosphere(subdivisions=3, radius=0.16)
    hand.apply_translation([x, 0.32, 0])
    parts[f"hand{i}"] = colored(hand, "#9aa3b2", metallic=0.5, rough=0.3)

# --- 다리/받침 (호버 베이스) ---
base = cylinder(radius=0.6, height=0.25, sections=32)
base.apply_translation([0, 0.05, 0])
parts["base"] = colored(base, "#3a4a8c", metallic=0.4, rough=0.3)
ring = cylinder(radius=0.5, height=0.08, sections=32)
ring.apply_translation([0, -0.12, 0])
parts["ring"] = colored(ring, "#36f1ff", metallic=0.0, rough=0.2)

# 씬 구성 후 GLB로 내보내기 (각 파트가 개별 노드로 들어감)
scene = trimesh.Scene()
for name, m in parts.items():
    scene.add_geometry(m, node_name=name, geom_name=name)

# 중심을 원점으로 살짝 보정
scene.export("models/nova.glb")
print("OK -> models/nova.glb  | parts:", len(parts))
