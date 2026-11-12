from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FRAMES = Path("/private/tmp/pathwise-demo/frames")
WORK = Path("/private/tmp/pathwise-demo/build")
OUTPUT = ROOT / "demo" / "pathwise-product-demo.mp4"
FFMPEG = Path(
    "/private/tmp/pathwise-video-tools/node_modules/.pnpm/"
    "@ffmpeg-installer+darwin-arm64@4.1.5/node_modules/"
    "@ffmpeg-installer/darwin-arm64/ffmpeg"
)
FONT_MEDIUM = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"

WIDTH = 1440
HEIGHT = 900
IMAGE_W = 1280
IMAGE_H = 720
IMAGE_X = 80
IMAGE_Y = 76

SLIDES = [
    {
        "kind": "intro",
        "title": "Pathwise",
        "caption": "把课件变成可验证的学习体验",
        "narration": (
            "欢迎来到 Pathwise。这是一个帮助学生理解课件、练习表达、验证理解的 AI 学习平台。"
            "接下来用两分钟展示主要功能。"
        ),
    },
    {
        "kind": "image",
        "image": "01-home.png",
        "title": "01 · 学习首页",
        "caption": "中英文切换、课件上传、学习计划、闯关、测验与进度，形成一条完整学习路径。",
        "narration": (
            "首先是学习首页。平台支持中英文切换。上传课件后，会生成学习计划、知识闯关和测验。"
            "访客可以体验公开模块，生成学习包时会明确要求登录。"
        ),
    },
    {
        "kind": "image",
        "image": "02-fun-home.png",
        "title": "02 · 趣味群聊",
        "caption": "三个需要救场的群聊：AI 实习生、项目小组和宿舍求助。",
        "narration": (
            "趣味练习不再像普通答题，而是三个需要救场的群聊。"
            "每个群包含四个故事，覆盖缓存、异步请求、事务和密码安全。"
        ),
    },
    {
        "kind": "image",
        "image": "03-fun-chat.png",
        "title": "03 · 群内交互",
        "caption": "引用错误原话、选择表情回应、拍一拍 AI，再用自己的话纠正。",
        "narration": (
            "进入群聊后，学生可以引用错误原话、添加表情回应，也可以拍一拍了 AI。"
            "真正的学习动作，是写一段能解释因果关系的回复。"
        ),
    },
    {
        "kind": "image",
        "image": "04-fun-result.png",
        "title": "04 · 学习反馈",
        "caption": "系统识别遗漏知识点，补齐后展示正确解释和换场景题。",
        "narration": (
            "系统会检查解释里缺少哪个关键知识点，并围绕缺口继续追问。"
            "完成后再给出一道换场景题，确认学生是否真正迁移了理解。"
        ),
    },
    {
        "kind": "image",
        "image": "05-scenario.png",
        "title": "05 · 情景挑战",
        "caption": "排查软件故障、比较方案后果，再解释自己的判断依据。",
        "narration": (
            "情景挑战让学生面对真实软件故障：先找证据，再比较不同处理的后果，"
            "最后说明自己的修复方案和取舍。"
        ),
    },
    {
        "kind": "image",
        "image": "06-interview.png",
        "title": "06 · 模拟面试",
        "caption": "完整问答、针对性追问与形成性反馈报告。",
        "narration": (
            "模拟面试提供离线和实时 AI 两种模式。离线演示模式无需网络也能完成问答、"
            "追问和反馈报告，实时模式需要登录后使用。"
        ),
    },
    {
        "kind": "image",
        "image": "07-workspace.png",
        "title": "07 · 虚拟工作台",
        "caption": "从修改代码到检查、暂存、提交和推送，完整演示工程流程。",
        "narration": (
            "虚拟工作台模拟完整的开发流程：打开文件、修改代码、保存、通过检查，"
            "再完成暂存、提交和推送。每一步都有明确的状态反馈。"
        ),
    },
    {
        "kind": "image",
        "image": "08-account.png",
        "title": "08 · 账户与保存",
        "caption": "登录后启用真实 AI 生成、云端进度同步和源课件保存。",
        "narration": (
            "账户入口负责登录、云端进度和权限状态。真实 AI 生成、跨设备同步和源课件保存"
            "需要已登录的用户。访客仍可体验群聊、情景挑战、演示面试和虚拟工作台。"
        ),
    },
    {
        "kind": "outro",
        "title": "Pathwise",
        "caption": "AI makes the challenge. You bring the reasoning.",
        "narration": (
            "Pathwise 的重点不是让 AI 替学生答题，而是让学生通过解释、实验和决策，"
            "证明自己真正理解。感谢观看。"
        ),
    },
]


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


def wrap(draw: ImageDraw.ImageDraw, text: str, text_font, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        candidate = current + char
        if draw.textlength(candidate, font=text_font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def rounded_image(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width, image.height), radius=radius, fill=255)
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.paste(image.convert("RGBA"), mask=mask)
    return result


def make_background(image: Image.Image | None = None) -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#071a36")
    if image is None:
        return canvas
    backdrop = image.resize((WIDTH, HEIGHT)).filter(ImageFilter.GaussianBlur(22))
    dark = Image.new("RGB", (WIDTH, HEIGHT), "#061426")
    return Image.blend(backdrop, dark, 0.72)


def draw_header(canvas: Image.Image, title: str, index: int) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, 58), fill="#06162f")
    draw.text((38, 16), "PATHWISE · 产品演示", font=font(FONT_MEDIUM, 18), fill="#8ee3e0")
    right = f"{index:02d} / {len(SLIDES):02d}"
    right_width = draw.textlength(right, font=font(FONT_MEDIUM, 16))
    draw.text((WIDTH - right_width - 36, 18), right, font=font(FONT_MEDIUM, 16), fill="#9eb4ce")
    draw.text((490, 15), title, font=font(FONT_MEDIUM, 22), fill="#f6f9ff")
    draw.rounded_rectangle((38, 53, WIDTH - 38, 56), radius=2, fill="#12365a")


def draw_caption(canvas: Image.Image, caption: str) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((80, 815, 1360, 878), radius=14, fill="#0a2748", outline="#194770", width=1)
    caption_font = font(FONT_MEDIUM, 18)
    lines = wrap(draw, caption, caption_font, 1230)
    y = 826 if len(lines) == 1 else 821
    for line in lines[:2]:
        draw.text((104, y), line, font=caption_font, fill="#e5f1ff")
        y += 27


def make_image_slide(item: dict, index: int, output: Path) -> None:
    image = Image.open(FRAMES / item["image"]).convert("RGB")
    canvas = make_background(image)
    draw = ImageDraw.Draw(canvas)
    shadow = Image.new("RGBA", (IMAGE_W + 32, IMAGE_H + 32), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((10, 18, IMAGE_W + 22, IMAGE_H + 30), radius=20, fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(13))
    canvas.paste(shadow, (IMAGE_X - 16, IMAGE_Y - 7), shadow)
    screenshot = rounded_image(image, 17)
    canvas.paste(screenshot, (IMAGE_X, IMAGE_Y), screenshot)
    draw.rounded_rectangle(
        (IMAGE_X, IMAGE_Y, IMAGE_X + IMAGE_W, IMAGE_Y + IMAGE_H),
        radius=17,
        outline="#315273",
        width=2,
    )
    draw_header(canvas, item["title"], index)
    draw_caption(canvas, item["caption"])
    canvas.save(output)


def make_marketing_slide(item: dict, index: int, output: Path, outro: bool = False) -> None:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#06182f")
    draw = ImageDraw.Draw(canvas)
    for radius, alpha in [(510, 18), (380, 22), (250, 28)]:
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse(
            (WIDTH - radius - 30, -radius // 2, WIDTH + radius - 30, radius * 3 // 2),
            fill=(15, 128, 151, alpha),
        )
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(canvas)
    draw.text((90, 110), "PATHWISE", font=font(FONT_MEDIUM, 26), fill="#7fe1dc")
    title_font = font(FONT_MEDIUM, 82)
    draw.text((86, 175), item["title"], font=title_font, fill="#ffffff")
    subtitle = "Defend what you learned." if not outro else "Understand. Explain. Verify."
    draw.text((92, 285), subtitle, font=font(FONT_LIGHT, 34), fill="#a9c6e5")
    chips = (
        ["课件学习", "群聊练习", "情景挑战", "模拟面试", "虚拟工作台"]
        if not outro
        else ["理解", "解释", "决策", "验证"]
    )
    x, y = 92, 370
    chip_font = font(FONT_MEDIUM, 18)
    for chip in chips:
        width = int(draw.textlength(chip, font=chip_font)) + 34
        if x + width > WIDTH - 80:
            x = 92
            y += 52
        draw.rounded_rectangle((x, y, x + width, y + 38), radius=19, fill="#123a5f", outline="#2b6489")
        draw.text((x + 17, y + 8), chip, font=chip_font, fill="#d9f5ff")
        x += width + 10
    preview = Image.open(FRAMES / ("02-fun-home.png" if not outro else "04-fun-result.png")).convert("RGB")
    preview = preview.resize((620, 349))
    card = Image.new("RGBA", (660, 389), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((0, 0, 660, 389), radius=24, fill=(255, 255, 255, 235))
    card.paste(rounded_image(preview, 16), (20, 20), rounded_image(preview, 16))
    card = card.rotate(-2, expand=True, resample=Image.Resampling.BICUBIC)
    canvas.paste(card, (725, 270), card)
    draw_header(canvas, "产品总览" if not outro else "结束", index)
    draw_caption(canvas, item["caption"])
    canvas.save(output)


def audio_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as audio:
        return audio.getnframes() / audio.getframerate()


def build_audio_and_slides() -> list[tuple[Path, float]]:
    WORK.mkdir(parents=True, exist_ok=True)
    segments: list[tuple[Path, float]] = []
    for index, item in enumerate(SLIDES, start=1):
        slide_path = WORK / f"slide-{index:02d}.png"
        if item["kind"] == "image":
            make_image_slide(item, index, slide_path)
        else:
            make_marketing_slide(item, index, slide_path, outro=item["kind"] == "outro")

        aiff = WORK / f"voice-{index:02d}.aiff"
        wav = WORK / f"voice-{index:02d}.wav"
        subprocess.run(
            ["say", "-v", "Tingting", "-r", "175", "-o", str(aiff), item["narration"]],
            check=True,
        )
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-i", str(aiff), "-ar", "44100", "-ac", "2", str(wav)],
            check=True,
        )
        duration = max(7.0, math.ceil((audio_duration(wav) + 1.0) * 2) / 2)
        segments.append((slide_path, duration,))
        print(f"{index:02d} {item['title']}: {duration:.1f}s")
    return segments


def render_video(segments: list[tuple[Path, float]]) -> None:
    concat_entries: list[Path] = []
    for index, (slide, duration) in enumerate(segments, start=1):
        audio = WORK / f"voice-{index:02d}.wav"
        segment = WORK / f"segment-{index:02d}.mp4"
        subprocess.run(
            [
                str(FFMPEG),
                "-y",
                "-loglevel",
                "error",
                "-loop",
                "1",
                "-framerate",
                "30",
                "-i",
                str(slide),
                "-i",
                str(audio),
                "-t",
                f"{duration:.2f}",
                "-vf",
                f"fade=t=in:st=0:d=0.35,fade=t=out:st={max(0, duration - 0.35):.2f}:d=0.35,format=yuv420p",
                "-af",
                f"apad=whole_dur={duration:.2f}",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "19",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-shortest",
                str(segment),
            ],
            check=True,
        )
        concat_entries.append(segment)

    concat_file = WORK / "concat.txt"
    concat_file.write_text(
        "\n".join(f"file '{segment.as_posix()}'" for segment in concat_entries) + "\n",
        encoding="utf-8",
    )
    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            str(OUTPUT),
        ],
        check=True,
    )
    print(OUTPUT)


if __name__ == "__main__":
    built = build_audio_and_slides()
    render_video(built)
