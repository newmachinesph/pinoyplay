"""Image-to-3D prop generation with Microsoft TRELLIS.2 (MIT) on Modal GPUs.

Usage (PowerShell):
  python -m modal run scripts/trellis2_modal.py --src <dir of RGBA PNGs> --out <dir>

Each <name>.png becomes <name>.glb (PBR, WebP textures). Existing outputs are skipped.
facebook/dinov3 and briaai/RMBG-2.0 are gated on Hugging Face, so the pipeline uses the
identical DINOv3 ViT-L/16 weights published ungated by timm, and the MIT BiRefNet.
"""
import modal

TRELLIS_SHA = "75fbf0183001ed9876c8dbb35de6b68552ee08bd"
CUMESH_SHA = "12289e1062f0603f2f0d0771b02e1395d247f26f"
FLEXGEMM_SHA = "6dd94a859c26ee8246888502eada3dd8ad85532e"
NVDIFFREC_SHA = "b296927cc7fd01c2ac1087c8065c4d7248f72da4"
FLASH_ATTN = ("https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.3/"
              "flash_attn-2.7.3+cu12torch2.6cxx11abiFALSE-cp310-cp310-linux_x86_64.whl")


def _clone(url: str, path: str, sha: str) -> str:
    return (f"git clone --recursive {url} {path} && cd {path} && git checkout {sha}"
            " && git submodule update --init --recursive")


image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.10")
    .apt_install("git", "build-essential", "ninja-build", "libgl1", "libglib2.0-0", "libjpeg-dev",
                 "libegl1", "libgles2")
    .env({
        "TORCH_CUDA_ARCH_LIST": "8.0;8.6;8.9;9.0",
        "CUDA_HOME": "/usr/local/cuda",
        "MAX_JOBS": "8",
        "HF_HOME": "/cache/hf",
        "OPENCV_IO_ENABLE_OPENEXR": "1",
        "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
        "PYTHONPATH": "/opt/trellis2",
    })
    .pip_install("torch==2.6.0", "torchvision==0.21.0", index_url="https://download.pytorch.org/whl/cu124")
    .pip_install("imageio", "imageio-ffmpeg", "tqdm", "easydict", "opencv-python-headless", "ninja", "trimesh",
                 "transformers==4.57.1", "pandas", "lpips", "zstandard", "kornia", "timm==1.0.30", "pillow",
                 "huggingface_hub", "safetensors", "setuptools", "wheel", "packaging")
    .pip_install("git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8")
    .pip_install(FLASH_ATTN)
    # Modal's standalone Python links C++ extensions with clang++.
    .apt_install("clang")
    .run_commands(
        _clone("https://github.com/microsoft/TRELLIS.2.git", "/opt/trellis2", TRELLIS_SHA),
        "git clone -b v0.4.0 https://github.com/NVlabs/nvdiffrast.git /tmp/ext/nvdiffrast"
        " && pip install /tmp/ext/nvdiffrast --no-build-isolation",
        _clone("https://github.com/JeffreyXiang/nvdiffrec.git", "/tmp/ext/nvdiffrec", NVDIFFREC_SHA)
        + " && pip install /tmp/ext/nvdiffrec --no-build-isolation",
        _clone("https://github.com/JeffreyXiang/CuMesh.git", "/tmp/ext/CuMesh", CUMESH_SHA)
        + " && pip install /tmp/ext/CuMesh --no-build-isolation",
        _clone("https://github.com/JeffreyXiang/FlexGEMM.git", "/tmp/ext/FlexGEMM", FLEXGEMM_SHA)
        + " && pip install /tmp/ext/FlexGEMM --no-build-isolation",
        "pip install /opt/trellis2/o-voxel --no-build-isolation",
        gpu="L4",
    )
)

app = modal.App("pinoyplay-trellis2")
cache = modal.Volume.from_name("pinoyplay-hf-cache", create_if_missing=True)


@app.cls(image=image, gpu="A100-80GB", volumes={"/cache": cache}, timeout=1800,
         scaledown_window=240, max_containers=2)
class Trellis2:
    @modal.enter()
    def load(self):
        import timm
        import torch
        import torch.nn.functional as F
        from torchvision import transforms
        from trellis2.modules import image_feature_extractor as fe
        from trellis2.pipelines import rembg

        class TimmDinoV3(fe.DinoV3FeatureExtractor):
            """Same ViT-L/16 LVD-1689M weights; returns all tokens with an unweighted final layer norm."""

            def __init__(self, model_name: str, image_size: int = 512):
                self.model_name = model_name
                self.model = timm.create_model("vit_large_patch16_dinov3.lvd1689m", pretrained=True,
                                               img_size=image_size, num_classes=0)
                self.model.norm = torch.nn.Identity()
                self.model.eval()
                self.image_size = image_size
                self.transform = transforms.Compose([
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                ])

            def extract_features(self, image):
                image = image.to(next(self.model.parameters()).dtype)
                tokens = self.model.forward_features(image)
                return F.layer_norm(tokens, tokens.shape[-1:])

        class OpenBiRefNet(rembg.BiRefNet):
            def __init__(self, model_name: str = ""):
                super().__init__("ZhengPeng7/BiRefNet")

        fe.DinoV3FeatureExtractor = TimmDinoV3
        rembg.BiRefNet = OpenBiRefNet
        from trellis2.pipelines import Trellis2ImageTo3DPipeline
        self.pipe = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
        self.pipe.cuda()
        cache.commit()

    @modal.method()
    def generate(self, png: bytes, seed: int, pipeline_type: str, decimation: int, texture_size: int) -> bytes:
        import io
        import o_voxel
        from PIL import Image

        img = Image.open(io.BytesIO(png))
        img.load()
        mesh = self.pipe.run(img, seed=seed, pipeline_type=pipeline_type)[0]
        mesh.simplify(16777216)
        glb = o_voxel.postprocess.to_glb(
            vertices=mesh.vertices, faces=mesh.faces, attr_volume=mesh.attrs, coords=mesh.coords,
            attr_layout=mesh.layout, voxel_size=mesh.voxel_size, aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
            decimation_target=decimation, texture_size=texture_size,
            remesh=True, remesh_band=1, remesh_project=0, verbose=False,
        )
        glb.export("/tmp/out.glb", extension_webp=True)
        with open("/tmp/out.glb", "rb") as f:
            return f.read()


@app.local_entrypoint()
def main(src: str, out: str, decimation: int = 40000, texture: int = 1024,
         pipeline: str = "1024_cascade", seed: int = 1):
    from pathlib import Path

    out_dir = Path(out)
    out_dir.mkdir(parents=True, exist_ok=True)
    jobs = [p for p in sorted(Path(src).glob("*.png")) if not (out_dir / f"{p.stem}.glb").exists()]
    print(f"{len(jobs)} image(s) to convert")
    args = [(p.read_bytes(), seed, pipeline, decimation, texture) for p in jobs]
    failed = 0
    for path, result in zip(jobs, Trellis2().generate.starmap(args, return_exceptions=True)):
        if isinstance(result, Exception):
            failed += 1
            print(f"FAILED {path.name}: {result}")
            continue
        (out_dir / f"{path.stem}.glb").write_bytes(result)
        print(f"wrote {path.stem}.glb ({len(result) / 1024:.0f} KiB)")
    if failed:
        raise SystemExit(f"{failed} of {len(jobs)} failed")
