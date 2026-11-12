# Pathwise Product Demo

## Video

- `pathwise-product-demo.mp4`: 2 minutes 22 seconds, 1440×900, H.264 video with Mandarin narration.
- `pathwise-product-demo-poster.png`: cover frame for slides or submission pages.

## Chapters

1. Learning Studio and language switching
2. Fun Practice group-chat landing
3. Quote, reaction, nudge, and explanation
4. Targeted feedback and transfer question
5. Scenario Challenge
6. Mock Interview
7. Virtual Workspace
8. Account, cloud progress, and sign-in gate

## Verified

- The production build passes.
- All 72 automated tests pass.
- All 12 Fun Practice stories complete through their local demo flows.
- Group reactions, quoted replies, nudges, team polls, later-case rubrics, and progress restoration are covered by tests.
- The desktop interface was inspected at 1280×720 and 1280×900 browser viewports.

## Demo Limitations

- The recording uses a guest session. Live AI generation, Supabase-backed authentication, and cloud progress restoration require a signed-in account and configured services.
- The video demonstrates the offline and guest-accessible product paths. Existing automated tests use mocked AI and storage services for the sign-in-only workflows.

## Rebuild

Run from the repository root:

```bash
python3 demo/build_demo_video.py
```

The rebuild script expects the captured source frames in `/private/tmp/pathwise-demo/frames` and the temporary ffmpeg binary used during production.
